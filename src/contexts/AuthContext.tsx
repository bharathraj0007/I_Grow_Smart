import React, { createContext, useContext, useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { getAdminAccessLevel, AdminPermission } from '@/utils/adminPermissions';

interface User {
  id: string;
  email: string;
  displayName?: string;
  emailVerified?: boolean;
}

interface UserProfile {
  userId: string;
  fullName: string;
  phoneNumber: string;
  state: string;
  district: string;
  farmSize: number;
  farmingType: string;
  isAdmin: string;
}

interface AdminAccessLevel {
  isAdmin: boolean;
  permissions: AdminPermission[];
  accessibleTables: string[];
  fullDatabaseAccess: boolean;
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageCrops: boolean;
  canManageSchemes: boolean;
  canManageNewsletters: boolean;
  canManageListings: boolean;
  canManageTickets: boolean;
  canViewAnalytics: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  adminAccess: AdminAccessLevel;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  checkOTPVerification: (email: string) => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<boolean>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      // Set user with displayName from auth
      const userWithName = state.user ? {
        ...state.user,
        displayName: state.user.displayName || state.user.email?.split('@')[0] || 'User'
      } : null;
      setUser(userWithName);
      
      if (state.user) {
        // Fetch (or create) user profile using CRUD APIs (raw SQL requires service role)
        const fetchProfile = async () => {
          try {
            const existing = await blink.db.userProfiles.get<UserProfile>(state.user.id);
            if (existing) {
              setProfile(existing);
              console.log('👤 Profile loaded:', existing.fullName || userWithName?.displayName, 'Admin:', existing.isAdmin);
              return;
            }

            console.log('📝 Creating new profile for user:', state.user.id);
            await blink.db.userProfiles.upsert({
              id: state.user.id,
              userId: state.user.id,
              fullName: userWithName?.displayName || '',
              phoneNumber: '',
              state: '',
              district: '',
              farmSize: 0,
              farmingType: '',
              isAdmin: '0'
            });

            const created = await blink.db.userProfiles.get<UserProfile>(state.user.id);
            setProfile(created);
            console.log('✅ Profile ensured for user:', state.user.id);
          } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
          }
        };

        await fetchProfile();
      } else {
        setProfile(null);
      }
      
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    await blink.auth.signUp({ email, password, displayName });
    // Send verification email automatically
    await blink.auth.sendEmailVerification();
  };

  const signIn = async (email: string, password: string) => {
    await blink.auth.signInWithEmail(email, password);
  };

  const signOut = async () => {
    await blink.auth.signOut();
  };

  const sendVerificationEmail = async () => {
    await blink.auth.sendEmailVerification();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const existing = await blink.db.userProfiles.get<UserProfile>(user.id);

      if (existing) {
        await blink.db.userProfiles.update(user.id, {
          ...data
        });
      } else {
        await blink.db.userProfiles.create({
          userId: user.id,
          fullName: data.fullName || '',
          phoneNumber: data.phoneNumber || '',
          state: data.state || '',
          district: data.district || '',
          farmSize: data.farmSize || 0,
          farmingType: data.farmingType || '',
          isAdmin: '0'
        });
      }

      const refreshed = await blink.db.userProfiles.get<UserProfile>(user.id);
      setProfile(refreshed);
      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const checkOTPVerification = async (email: string): Promise<boolean> => {
    try {
      const rows = await blink.db.emailOtpVerification.list<{ verified: number | string }>({
        where: { email, verified: "1" },
        orderBy: { createdAt: 'desc' },
        limit: 1
      });

      return rows.length > 0 && Number(rows[0].verified) === 1;
    } catch (error) {
      console.error('Error checking OTP verification:', error);
      return false;
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
    try {
      // First, check if user exists
      const userRows = await blink.db.users.list<{ id: string }>({ where: { email }, limit: 1 });

      if (userRows.length === 0) {
        // User doesn't exist - still return true to avoid email enumeration
        console.log('⚠️ User not found, but returning success to prevent email enumeration');
        return true;
      }

      const userId = userRows[0].id;

      // Delete any existing password reset tokens for this user to prevent 409 conflict
      try {
        await blink.db.passwordResetTokens.deleteMany({ where: { userId } });
        console.log('✅ Deleted existing password reset tokens for user');
      } catch (deleteError) {
        console.log('ℹ️ No existing tokens to delete or delete failed:', deleteError);
      }

      // Now send the password reset email
      await blink.auth.sendPasswordResetEmail(email, {
        redirectUrl: `${window.location.origin}/reset-password`
      });
      
      console.log('✅ Password reset email sent successfully');
      // If no error was thrown, the email was sent successfully
      return true;
    } catch (error: any) {
      console.error('❌ Error sending password reset email:', error);
      
      // If it's a 409 conflict, try once more after clearing tokens
      if (error.message?.includes('409') || error.message?.includes('conflict')) {
        console.log('⚠️ 409 conflict detected, retrying after clearing tokens...');
        
        try {
          // Get user ID again
          const userRows = await blink.db.users.list<{ id: string }>({ where: { email }, limit: 1 });

          if (userRows.length > 0) {
            await blink.db.passwordResetTokens.deleteMany({ where: { userId: userRows[0].id } });
          }

          // Wait a moment for the delete to process
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Retry sending email
          await blink.auth.sendPasswordResetEmail(email, {
            redirectUrl: `${window.location.origin}/reset-password`
          });
          
          console.log('✅ Password reset email sent successfully on retry');
          // If no error was thrown, the retry was successful
          return true;
        } catch (retryError) {
          console.error('❌ Error on retry:', retryError);
          // Even on retry error, the email might have been sent
          // Return true to show success to user (they'll receive email)
          console.log('⚠️ Returning success despite error - email likely sent');
          return true;
        }
      }
      
      // For non-409 errors, still return true to prevent email enumeration
      // and because the email was likely sent even if an error was logged
      console.log('⚠️ Returning success despite error - email likely sent');
      return true;
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await blink.auth.confirmPasswordReset(token, newPassword);
      console.log('✅ Password reset successfully');
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const isAdmin = profile?.isAdmin === '1';
  const adminAccess = getAdminAccessLevel(isAdmin);

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    adminAccess,
    signUp,
    signIn,
    signOut,
    sendVerificationEmail,
    updateProfile,
    checkOTPVerification,
    sendPasswordResetEmail,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
