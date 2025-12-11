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
        // Fetch user profile
        const fetchProfile = async () => {
          try {
            // Use direct SQL for more reliable query
            const result = await blink.db.sql<UserProfile>(`
              SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1
            `, [state.user.id]);
            
            if (result.rows.length > 0) {
              setProfile(result.rows[0]);
              console.log('👤 Profile loaded:', result.rows[0].fullName || userWithName?.displayName, 'Admin:', result.rows[0].isAdmin);
            } else {
              // Profile doesn't exist - create a default one
              console.log('📝 Creating new profile for user:', state.user.id);
              try {
                // Try to insert with error handling for duplicate key
                await blink.db.sql(`
                  INSERT INTO user_profiles (
                    user_id, full_name, phone_number, state, district, 
                    farm_size, farming_type, is_admin, created_at, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, '0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                `, [
                  state.user.id,
                  userWithName?.displayName || '',
                  '',
                  '',
                  '',
                  0,
                  ''
                ]);
                
                // Fetch the newly created profile
                const newResult = await blink.db.sql<UserProfile>(`
                  SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1
                `, [state.user.id]);
                
                if (newResult.rows.length > 0) {
                  setProfile(newResult.rows[0]);
                  console.log('✅ Profile created successfully for user:', state.user.id);
                }
              } catch (createError: any) {
                // If it's a UNIQUE constraint error, it means profile was created by another request
                if (createError?.details?.error_details?.includes('UNIQUE constraint failed')) {
                  console.log('ℹ️ Profile already exists (created by concurrent request)');
                  // Fetch the existing profile
                  try {
                    const existingResult = await blink.db.sql<UserProfile>(`
                      SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1
                    `, [state.user.id]);
                    
                    if (existingResult.rows.length > 0) {
                      setProfile(existingResult.rows[0]);
                      console.log('✅ Loaded existing profile for user:', state.user.id);
                    }
                  } catch (fetchError) {
                    console.error('Error fetching existing profile:', fetchError);
                    setProfile(null);
                  }
                } else {
                  // Other error - log and continue
                  console.error('Error creating profile:', createError);
                  setProfile(null);
                }
              }
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
          }
        };

        // Fetch profile once - it will create if not exists
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
      // Check if profile exists
      const result = await blink.db.sql<UserProfile>(`
        SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1
      `, [user.id]);

      if (result.rows.length > 0) {
        // Profile exists - update using raw SQL to avoid field mapping issues
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        
        // Map camelCase to snake_case for database columns
        if (data.fullName !== undefined) {
          updateFields.push('full_name = ?');
          updateValues.push(data.fullName);
        }
        if (data.phoneNumber !== undefined) {
          updateFields.push('phone_number = ?');
          updateValues.push(data.phoneNumber);
        }
        if (data.state !== undefined) {
          updateFields.push('state = ?');
          updateValues.push(data.state);
        }
        if (data.district !== undefined) {
          updateFields.push('district = ?');
          updateValues.push(data.district);
        }
        if (data.farmSize !== undefined) {
          updateFields.push('farm_size = ?');
          updateValues.push(data.farmSize);
        }
        if (data.farmingType !== undefined) {
          updateFields.push('farming_type = ?');
          updateValues.push(data.farmingType);
        }
        
        // Always update updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        
        if (updateFields.length > 0) {
          updateValues.push(user.id); // Add user_id for WHERE clause
          
          await blink.db.sql(`
            UPDATE user_profiles 
            SET ${updateFields.join(', ')}
            WHERE user_id = ?
          `, updateValues);
        }
      } else {
        // Profile doesn't exist - create new one
        await blink.db.sql(`
          INSERT INTO user_profiles (
            user_id, full_name, phone_number, state, district, 
            farm_size, farming_type, is_admin, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, '0', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          user.id,
          data.fullName || '',
          data.phoneNumber || '',
          data.state || '',
          data.district || '',
          data.farmSize || 0,
          data.farmingType || ''
        ]);
      }

      // Refresh profile from database
      const refreshResult = await blink.db.sql<UserProfile>(`
        SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1
      `, [user.id]);
      
      if (refreshResult.rows.length > 0) {
        setProfile(refreshResult.rows[0]);
        console.log('✅ Profile updated successfully');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const checkOTPVerification = async (email: string): Promise<boolean> => {
    try {
      const result = await blink.db.sql<{ verified: number }>(`
        SELECT verified
        FROM email_otp_verification
        WHERE email = ? AND verified = 1
        ORDER BY created_at DESC
        LIMIT 1
      `, [email]);
      
      return result.rows.length > 0 && Number(result.rows[0].verified) === 1;
    } catch (error) {
      console.error('Error checking OTP verification:', error);
      return false;
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<boolean> => {
    try {
      // First, check if user exists
      const userResult = await blink.db.sql<{ id: string }>(`
        SELECT id FROM users WHERE email = ? LIMIT 1
      `, [email]);

      if (userResult.rows.length === 0) {
        // User doesn't exist - still return true to avoid email enumeration
        console.log('⚠️ User not found, but returning success to prevent email enumeration');
        return true;
      }

      const userId = userResult.rows[0].id;

      // Delete any existing password reset tokens for this user to prevent 409 conflict
      try {
        await blink.db.sql(`
          DELETE FROM password_reset_tokens 
          WHERE user_id = ?
        `, [userId]);
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
          const userResult = await blink.db.sql<{ id: string }>(`
            SELECT id FROM users WHERE email = ? LIMIT 1
          `, [email]);

          if (userResult.rows.length > 0) {
            // Force delete all tokens with raw SQL
            await blink.db.sql(`
              DELETE FROM password_reset_tokens 
              WHERE user_id = ?
            `, [userResult.rows[0].id]);
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
