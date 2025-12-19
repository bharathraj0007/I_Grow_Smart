/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  // Kept for backward compatibility; OTP generation now happens server-side.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const EMAIL_OTP_FUNCTION_URL = 'https://m80q4b8r--email-otp.functions.blink.new';

type EmailOtpSendResponse = { success: boolean; message?: string };

type EmailOtpVerifyResponse = { success: boolean; message?: string };

async function callEmailOtpFunction(payload: unknown): Promise<any> {
  console.log('Calling email-otp function with payload:', JSON.stringify(payload));
  
  const res = await fetch(EMAIL_OTP_FUNCTION_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  console.log('email-otp response status:', res.status);

  let data: any = null;
  try {
    const text = await res.text();
    console.log('email-otp response body:', text);
    data = JSON.parse(text);
  } catch (parseError) {
    console.error('Failed to parse response:', parseError);
  }

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    console.error('email-otp error:', msg);
    throw new Error(msg);
  }

  return data;
}

/**
 * Send OTP verification email (server-side)
 */
export async function sendOTPEmail(email: string, _otp?: string, userName?: string): Promise<boolean> {
  try {
    const result = (await callEmailOtpFunction({
      action: 'send',
      email,
      userName,
    })) as EmailOtpSendResponse;

    return Boolean(result?.success);
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
}

/**
 * Store OTP in database (server-side). Kept for compatibility.
 * The edge function generates + stores OTP; the `otp` argument is ignored.
 */
export async function storeOTP(email: string, _otp: string): Promise<boolean> {
  return sendOTPEmail(email);
}

/**
 * Verify OTP code (server-side)
 */
export async function verifyOTP(email: string, otp: string): Promise<{ success: boolean; message: string }> {
  try {
    const result = (await callEmailOtpFunction({
      action: 'verify',
      email,
      otp,
    })) as EmailOtpVerifyResponse;

    return {
      success: Boolean(result?.success),
      message: result?.message || (result?.success ? 'Email verified successfully!' : 'Invalid OTP.'),
    };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    return { success: false, message: error?.message || 'An error occurred during verification. Please try again.' };
  }
}

/**
 * Check if email has been verified via OTP
 * Note: We cannot safely check this without a user session in client-side code.
 * Use verifyOTP(...) or implement a server-side check endpoint if needed.
 */
export async function isEmailOTPVerified(_email: string): Promise<boolean> {
  return false;
}

/**
 * Clean up expired OTPs (server-side concern)
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  // No-op on client.
}