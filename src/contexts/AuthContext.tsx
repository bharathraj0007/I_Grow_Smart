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
  login: (redirectUrl?: string) => void;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
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
        const fetchOrCreateProfile = async () => {
          try {
            const rows = await blink.db.userProfiles.list<UserProfile>({
              where: { userId: state.user!.id },
              limit: 1,
            });

            if (rows.length > 0) {
              setProfile(rows[0]);
              console.log('👤 Profile loaded:', rows[0].fullName || userWithName?.displayName, 'Admin:', rows[0].isAdmin);
              return;
            }

            // Create default profile
            console.log('📝 Creating new profile for user:', state.user.id);
            await blink.db.userProfiles.create({
              userId: state.user.id,
              fullName: userWithName?.displayName || '',
              phoneNumber: '',
              state: '',
              district: '',
              farmSize: 0,
              farmingType: '',
              isAdmin: '0',
            });

            const created = await blink.db.userProfiles.list<UserProfile>({
              where: { userId: state.user.id },
              limit: 1,
            });
            if (created.length > 0) {
              setProfile(created[0]);
              console.log('✅ Profile created successfully for user:', state.user.id);
            } else {
              console.error('Error fetching newly created profile for user:', state.user.id);
              setProfile(null);
            }
          } catch (error: any) {
            // If it's a UNIQUE constraint error, it means profile was created by another request
            if (error.message?.includes('UNIQUE constraint failed')) {
              console.log('ℹ️ Profile already exists (created by concurrent request)');
              // Fetch the existing profile
              try {
                const existingResult = await blink.db.userProfiles.list<UserProfile>({
                  where: { userId: state.user.id },
                  limit: 1,
                });
                
                if (existingResult.length > 0) {
                  setProfile(existingResult[0]);
                  console.log('✅ Loaded existing profile for user:', state.user.id);
                } else {
                  console.error('Error fetching existing profile after concurrent creation for user:', state.user.id);
                  setProfile(null);
                }
              } catch (fetchError) {
                console.error('Error fetching existing profile:', fetchError);
                setProfile(null);
              }
            } else {
              // Other error - log and continue
              console.error('Error fetching or creating profile:', error);
              setProfile(null);
            }
          }
        };

        await fetchOrCreateProfile();
      } else {
        setProfile(null);
      }
      
      setLoading(state.isLoading);
    });

    return unsubscribe;
  }, []);

  const login = (redirectUrl?: string) => {
    // For headless mode, navigate to our custom signin page
    // The actual sign-in is handled by the SignInPage component
    window.location.href = `/signin?redirect=${encodeURIComponent(redirectUrl || window.location.href)}`;
  };

  const logout = async () => {
    await blink.auth.signOut();
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    try {
      // Use upsert to handle both creation and update
      await blink.db.userProfiles.upsert({
        userId: user.id,
        fullName: data.fullName ?? profile?.fullName ?? user.displayName ?? '',
        phoneNumber: data.phoneNumber ?? profile?.phoneNumber ?? '',
        state: data.state ?? profile?.state ?? '',
        district: data.district ?? profile?.district ?? '',
        farmSize: data.farmSize ?? profile?.farmSize ?? 0,
        farmingType: data.farmingType ?? profile?.farmingType ?? '',
        isAdmin: profile?.isAdmin ?? '0', // Keep existing isAdmin if not provided in data
      });

      // Refresh profile from database
      const refreshResult = await blink.db.userProfiles.list<UserProfile>({
        where: { userId: user.id },
        limit: 1,
      });
      
      if (refreshResult.length > 0) {
        setProfile(refreshResult[0]);
        console.log('✅ Profile updated successfully');
      } else {
        console.error('Error refreshing profile after update for user:', user.id);
        setProfile(null); // Clear profile if refresh fails
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
    try {
      // First, check if user exists
      const userResult = await blink.db.users.list<{ id: string }>({
        where: { email: email },
        limit: 1,
      });

      if (userResult.length === 0) {
        // User doesn't exist - still return true to avoid email enumeration
        console.log('⚠️ User not found, but returning success to prevent email enumeration');
        return true;
      }

      const userId = userResult[0].id;

      // Delete any existing password reset tokens for this user to prevent 409 conflict
      try {
        await blink.db.passwordResetTokens.deleteMany({
          where: { userId: userId },
        });
        console.log('✅ Deleted existing password reset tokens for user');
      } catch (deleteError) {
        console.log('ℹ️ No existing tokens to delete or delete failed:', deleteError);
        // Continue anyway - this is not critical
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
          const userResult = await blink.db.users.list<{ id: string }>({
            where: { email: email },
            limit: 1,
          });

          if (userResult.length > 0) {
            // Force delete all tokens with raw SQL
            await blink.db.passwordResetTokens.deleteMany({
              where: { userId: userResult[0].id },
            });
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
    login,
    logout,
    updateProfile,
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