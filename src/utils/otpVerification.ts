import { blink } from '@/lib/blink';

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(email: string, otp: string, userName?: string): Promise<boolean> {
  try {
    const result = await blink.notifications.email({
      to: email,
      subject: '🔐 Email Verification - Smart Agriculture Support System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌾 Smart Agriculture</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 14px;">Email Verification</p>
          </div>
          
          <div style="background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Hi ${userName || 'there'}! 👋</h2>
            
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              Thank you for registering with Smart Agriculture Support System. 
              To complete your registration, please verify your email address using the OTP code below:
            </p>
            
            <div style="background: white; border: 2px dashed #10b981; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
              <div style="font-size: 40px; font-weight: bold; color: #10b981; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px;">This code expires in 10 minutes</p>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ Important:</strong> If you didn't request this verification, please ignore this email.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              Once verified, you'll have full access to:
            </p>
            <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
              <li>🌱 Crop Recommendations powered by AI</li>
              <li>🩺 Dr.Plant Disease Detection</li>
              <li>📈 Price Predictions</li>
              <li>🛒 Marketplace for buying and selling crops</li>
              <li>📰 Agricultural newsletters and schemes</li>
            </ul>
            
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br>
              <strong style="color: #1f2937;">Smart Agriculture Support System Team</strong>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              © 2024 Smart Agriculture Support System. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
Hi ${userName || 'there'}!

Thank you for registering with Smart Agriculture Support System.

Your email verification code is: ${otp}

This code expires in 10 minutes.

Please enter this code on the verification page to complete your registration.

If you didn't request this verification, please ignore this email.

Best regards,
Smart Agriculture Support System Team
      `
    });

    return result.success;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

/**
 * Store OTP in database with 10-minute expiration
 */
export async function storeOTP(email: string, otp: string): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    
    // Delete any existing unverified OTPs for this email
    await blink.db.emailOtpVerification.deleteMany({
      where: { email, verified: "0" }
    });

    // Insert new OTP
    await blink.db.emailOtpVerification.create({
      email,
      otpCode: otp,
      expiresAt,
      verified: "0",
      attempts: 0
    });
    
    console.log('✅ OTP stored for email:', email);
    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  try {
    // Find the most recent unverified OTP for this email
    const rows = await blink.db.emailOtpVerification.list<any>({
      where: { email, verified: "0" },
      orderBy: { createdAt: 'desc' },
      limit: 1
    });

    console.log('📊 Query result:', { rowCount: rows.length, rows });

    if (rows.length === 0) {
      return { success: false, message: 'No OTP found. Please request a new one.' };
    }

    const otpRecord = rows[0] as any;
    
    // Extract OTP code - handle both snake_case and camelCase
    const storedOTPCode = otpRecord.otp_code || otpRecord.otpCode;
    const expiresAtStr = otpRecord.expires_at || otpRecord.expiresAt;
    const attemptsCount = otpRecord.attempts;
    const recordId = otpRecord.id;
    
    console.log('📋 OTP Record:', { storedOTPCode, expiresAtStr, attemptsCount, recordId });
    
    if (!storedOTPCode) {
      console.error('❌ OTP code is missing from database record');
      return { success: false, message: 'Invalid OTP record. Please request a new code.' };
    }
    
    // Check if OTP has expired
    const expiresAt = new Date(expiresAtStr);
    if (expiresAt < new Date()) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }
    
    // Check maximum attempts (3 attempts allowed)
    if (Number(attemptsCount) >= 3) {
      return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
    }
    
    // Verify OTP code (trim whitespace and compare as strings)
    const storedOTP = String(storedOTPCode).trim();
    const enteredOTP = String(otp).trim();
    
    console.log('🔍 OTP Comparison:', { storedOTP, enteredOTP, match: storedOTP === enteredOTP });
    
    if (storedOTP !== enteredOTP) {
      // Increment attempts
      await blink.db.emailOtpVerification.update(recordId, {
        attempts: Number(attemptsCount) + 1
      });
      
      const remainingAttempts = 3 - (Number(attemptsCount) + 1);
      return { 
        success: false, 
        message: `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.` 
      };
    }
    
    // OTP is valid - mark as verified
    await blink.db.emailOtpVerification.update(recordId, { verified: "1" });
    
    console.log('✅ OTP verified successfully for:', email);
    return { success: true, message: 'Email verified successfully!' };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: 'An error occurred during verification. Please try again.' };
  }
}

/**
 * Check if email has been verified via OTP
 */
export async function isEmailOTPVerified(email: string): Promise<boolean> {
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
}

/**
 * Clean up expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  try {
    const all = await blink.db.emailOtpVerification.list<any>({ limit: 1000 });
    const now = Date.now();
    const expired = all.filter((r: any) => {
      const exp = new Date(r.expiresAt || r.expires_at || '').getTime();
      return Number.isFinite(exp) && exp < now;
    });

    for (const record of expired) {
      try {
        await blink.db.emailOtpVerification.delete(record.id);
      } catch {
        // ignore
      }
    }

    console.log(`🧹 Cleaned up expired OTPs: ${expired.length}`);
  } catch (error) {
    console.error('Error cleaning up OTPs:', error);
  }
}
