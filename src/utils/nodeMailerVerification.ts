/**
 * Brevo Email Verification Utility
 * Handles sending verification emails and verifying tokens using Brevo API
 */

const VERIFICATION_FUNCTION_URL = 'https://m80q4b8r--brevo-verification.functions.blink.new';

interface SendVerificationResponse {
  success: boolean;
  message: string;
  messageId?: string;
}

interface VerifyEmailResponse {
  success: boolean;
  message: string;
  email?: string;
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  userName: string = 'there'
): Promise<SendVerificationResponse> {
  try {
    console.log('Sending verification email to:', email);

    const response = await fetch(VERIFICATION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'send-verification',
        email: email.trim().toLowerCase(),
        userName: userName.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Verification email send failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to send verification email',
      };
    }

    console.log('Verification email sent successfully');

    return {
      success: true,
      message: data.message || 'Verification email sent successfully!',
      messageId: data.messageId,
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send verification email',
    };
  }
}

/**
 * Verify email token
 */
export async function verifyEmailToken(
  token: string
): Promise<VerifyEmailResponse> {
  try {
    if (!token) {
      return {
        success: false,
        message: 'Invalid verification link',
      };
    }

    console.log('Verifying email token...');

    const response = await fetch(VERIFICATION_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify-email',
        token: token.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Email verification failed:', data);
      return {
        success: false,
        message: data.message || 'Failed to verify email',
      };
    }

    console.log('Email verified successfully');
    return {
      success: true,
      message: data.message || 'Email verified successfully!',
      email: data.email,
    };
  } catch (error) {
    console.error('Error verifying email token:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify email',
    };
  }
}
