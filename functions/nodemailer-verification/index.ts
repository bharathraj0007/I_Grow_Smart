import { createClient } from 'npm:@blinkdotnew/sdk@0.19.0'

type SendVerificationPayload = {
  action: 'send-verification'
  email: string
  userName?: string
}

type VerifyEmailPayload = {
  action: 'verify-email'
  token: string
}

type Payload = SendVerificationPayload | VerifyEmailPayload

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders 
    },
  })
}

// Generate a simple 6-digit numeric verification code using Math.random()
// This is more reliable than crypto.randomUUID() in edge function runtimes
function generateVerificationCode(): string {
  // Generate 6-digit code between 100000 and 999999
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  console.log('[TOKEN] Generated 6-digit verification code successfully')
  return code
}

// Generate a longer token for URL-based verification (fallback)
function generateVerificationToken(): string {
  try {
    // Use simple Math.random() based generation - more reliable than crypto.randomUUID()
    const segments: string[] = []
    for (let i = 0; i < 4; i++) {
      const segment = Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, '0')
      segments.push(segment)
    }
    const token = segments.join('')
    console.log('[TOKEN] Generated verification token successfully, length:', token.length)
    return token
  } catch (err) {
    console.error('[TOKEN ERROR] Failed to generate token:', err)
    // Fallback to simple timestamp-based token
    const fallback = Date.now().toString(36) + Math.random().toString(36).substring(2, 15)
    console.log('[TOKEN] Using fallback token generation, length:', fallback.length)
    return fallback
  }
}

// Send email using Resend API (fetch-based, no SMTP)
// ========== IMPORTANT: PRODUCTION REQUIREMENTS ==========
// RESEND FREE-TIER LIMITATION: Only sends to the account owner's email (bharathrajgowdajb007@gmail.com)
// 
// PRODUCTION SETUP REQUIRED:
// 1. Verify your domain in Resend dashboard (https://resend.com/domains)
// 2. Set isTestMode = false once domain is verified
// 3. Configure custom email sender (e.g., verify@yourdomain.com)
// 4. Remove the TEST_EMAIL override
// 
// TESTING/DEVELOPMENT MODE:
// - Emails are redirected to: bharathrajgowdajb007@gmail.com
// - Verification token is returned in API response for UI fallback testing
// - This enables development without Resend domain setup
// ======================================================
async function sendVerificationEmail(
  to: string,
  token: string,
  userName: string
): Promise<{ success: boolean; messageId?: string; error?: string; isTestMode?: boolean }> {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (!resendApiKey) {
      console.error('[EMAIL ERROR] RESEND_API_KEY not configured')
      throw new Error('RESEND_API_KEY not configured')
    }

    // TESTING MODE: Force all emails to test account for Resend free tier
    const TEST_EMAIL = 'bharathrajgowdajb007@gmail.com'
    const originalEmail = to
    const isTestMode = true // Set to false in production with verified domain
    
    if (isTestMode) {
      to = TEST_EMAIL
      console.log(`[EMAIL] [TESTING MODE] Redirecting email from ${originalEmail} to ${TEST_EMAIL}`)
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://smart-agriculture-support-system-m80q4b8r.sites.blink.new'
    const verificationUrl = `${appUrl}/verify-email?token=${token}`

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 28px;">🌱 I Grow Smart</h1>
          </div>
          
          <h2 style="color: #374151; margin-bottom: 20px;">Verify Your Email Address</h2>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Hi ${userName},
          </p>
          
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6;">
            Thank you for joining I Grow Smart! To complete your registration and access all features, 
            please verify your email address by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; 
                      border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link into your browser:
          </p>
          
          <div style="background-color: #f3f4f6; padding: 12px; border-radius: 4px; word-break: break-all; margin: 15px 0;">
            <a href="${verificationUrl}" style="color: #059669; text-decoration: none; font-size: 13px;">
              ${verificationUrl}
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            This verification link will expire in 24 hours.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
            If you didn't create an account with I Grow Smart, you can safely ignore this email.
          </p>
          
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
            Need help? Contact us at support@igrowsmart.app
          </p>
        </div>
      </div>
    `

    const textContent = `
I Grow Smart - Email Verification

Hi ${userName},

Thank you for joining I Grow Smart! To complete your registration and access all features, 
please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with I Grow Smart, you can safely ignore this email.

Need help? Contact us at support@igrowsmart.app
    `

    console.log('Sending verification email via Resend API to:', to)
    
    // Use Resend REST API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'I Grow Smart <onboarding@resend.dev>',
        to: [to],
        subject: 'Verify Your Email - I Grow Smart',
        html: htmlContent,
        text: textContent,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', responseData)
      
      // Handle restricted recipient errors more gracefully (don't throw 500)
      if (responseData.message?.includes('restricted') || responseData.message?.includes('not allowed')) {
        return { 
          success: false, 
          error: `Email delivery restricted in testing mode. Verification link sent to ${TEST_EMAIL} for testing.`,
          isTestMode: true
        }
      }
      
      return { 
        success: false, 
        error: responseData.message || 'Failed to send email via Resend',
        isTestMode
      }
    }

    console.log('Email sent successfully via Resend, id:', responseData.id)
    
    return { 
      success: true, 
      messageId: responseData.id,
      isTestMode
    }
  } catch (err) {
    console.error('[EMAIL ERROR] Unexpected error sending email:', err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown email error' 
    }
  }
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      console.log('[HANDLER] Method not allowed:', req.method)
      return json({ success: false, message: 'Method not allowed' }, 405)
    }

    console.log('=== EMAIL VERIFICATION FUNCTION START ===')

    // Parse request body first
    let payload: Partial<Payload>
    try {
      payload = await req.json()
      console.log('Received action:', payload.action)
    } catch (parseError) {
      console.error('[HANDLER] JSON parse error:', parseError)
      return json({ success: false, message: 'Invalid request body' }, 400)
    }

    // Validate email early for send-verification action
    if (payload.action === 'send-verification') {
      const email = String(payload.email || '').trim().toLowerCase()
      
      if (!email) {
        console.log('[HANDLER] Missing email in request')
        return json({ success: false, message: 'Email is required' }, 400)
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        console.log('[HANDLER] Invalid email format:', email)
        return json({ success: false, message: 'Invalid email format' }, 400)
      }
    }

    // Check environment variables
    const projectId = Deno.env.get('BLINK_PROJECT_ID')
    const secretKey = Deno.env.get('BLINK_SECRET_KEY')

    if (!projectId || !secretKey) {
      console.error('[HANDLER] Missing Blink environment variables')
      return json({ success: false, message: 'Server configuration error' }, 500)
    }

    // Send verification email with token
    if (payload.action === 'send-verification') {
      const email = String(payload.email || '').trim().toLowerCase()
      const userName = payload.userName ? String(payload.userName).trim() : 'there'

      console.log('[HANDLER] SEND-VERIFICATION - email:', email)

      // Step 1: Generate token FIRST
      console.log('[HANDLER] Generating verification token...')
      const token = generateVerificationToken()
      console.log('[HANDLER] Token generated successfully, length:', token.length)

      // Step 2: Hash the token for database storage
      const tokenHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(token)
      )
      const tokenHashHex = Array.from(new Uint8Array(tokenHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      const lookupHash = token.substring(0, 16)

      // Step 3: Try to store in database
      let dbStorageSuccess = false
      try {
        const blink = createClient({ projectId, secretKey })

        // Clean up old tokens for this email
        try {
          const existingTokens = await blink.db.emailVerificationTokens.list({
            where: { userId: email }
          })
          
          for (const record of (existingTokens || [])) {
            try {
              await blink.db.emailVerificationTokens.delete(record.id)
            } catch { /* ignore individual delete errors */ }
          }
        } catch (cleanupErr) {
          console.log('[HANDLER] Token cleanup skipped:', cleanupErr)
        }

        // Store new token
        await blink.db.emailVerificationTokens.create({
          userId: email,
          tokenHash: tokenHashHex,
          lookupHash,
          expiresAt,
          createdAt: new Date().toISOString(),
        })
        dbStorageSuccess = true
        console.log('[HANDLER] Token stored in database successfully')
      } catch (dbError) {
        console.error('[HANDLER] Database storage failed (continuing anyway):', dbError)
      }

      // Step 4: Send email via Resend API
      console.log('[HANDLER] Sending verification email via Resend API...')
      const emailResult = await sendVerificationEmail(email, token, userName)

      if (emailResult.success) {
        console.log('[HANDLER] Verification email sent successfully')
        console.log('[HANDLER] MessageId:', emailResult.messageId)
        console.log('[HANDLER] DB storage:', dbStorageSuccess ? 'success' : 'failed (email still sent)')
        
        const message = emailResult.isTestMode 
          ? `[TESTING MODE] Verification email sent to bharathrajgowdajb007@gmail.com. In production, configure a verified domain in Resend.`
          : 'Verification email sent! Please check your inbox.'
        
        return json({ 
          success: true, 
          message,
          messageId: emailResult.messageId,
          testMode: emailResult.isTestMode,
          // FALLBACK FOR TESTING: Include token in response so frontend can verify without email
          // In production (testMode=false), this token should not be exposed in response
          token: emailResult.isTestMode ? token : undefined
        })
      }

      // Email failed to send - Return clear message, not 500 error
      console.error('[HANDLER] Failed to send verification email:', emailResult.error)
      
      // Don't throw 500 error - return clear message instead
      return json({ 
        success: false, 
        message: emailResult.error || 'Unable to send verification email. Please contact support.',
        testMode: emailResult.isTestMode
      }, 400)
    }

    // Verify email token
    if (payload.action === 'verify-email') {
      const token = String(payload.token || '').trim()

      console.log('[HANDLER] VERIFY-EMAIL - token received')

      if (!token) {
        console.log('[HANDLER] Missing verification token')
        return json({ success: false, message: 'Verification token is required' }, 400)
      }

      // Hash the token to compare with stored hash
      const tokenHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(token)
      )
      const tokenHashHex = Array.from(new Uint8Array(tokenHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const lookupHash = token.substring(0, 16)

      try {
        const blink = createClient({ projectId, secretKey })

        // Find token by lookup hash
        const tokens = await blink.db.emailVerificationTokens.list({
          where: { lookupHash }
        })

        if (!tokens || tokens.length === 0) {
          console.log('[HANDLER] No token found for lookup hash')
          return json({ 
            success: false, 
            message: 'Invalid or expired verification link. Please request a new one.' 
          })
        }

        const tokenRecord = tokens[0]
        const storedTokenHash = String(tokenRecord.tokenHash || '')
        const expiresAtStr = String(tokenRecord.expiresAt || '')
        const email = String(tokenRecord.userId || '')

        if (!storedTokenHash || !expiresAtStr || !email) {
          console.log('[HANDLER] Invalid token record data')
          return json({ 
            success: false, 
            message: 'Invalid verification record. Please request a new link.' 
          })
        }

        // Check if token matches
        if (storedTokenHash !== tokenHashHex) {
          console.log('[HANDLER] Token hash mismatch')
          return json({ 
            success: false, 
            message: 'Invalid verification link. Please request a new one.' 
          })
        }

        // Check if token expired
        const expiresAt = new Date(expiresAtStr)
        if (!Number.isFinite(expiresAt.getTime()) || expiresAt < new Date()) {
          console.log('[HANDLER] Token expired')
          return json({ 
            success: false, 
            message: 'Verification link has expired. Please request a new one.' 
          })
        }

        // Update user's email_verified status
        try {
          const users = await blink.db.users.list({
            where: { email }
          })

          if (users && users.length > 0) {
            await blink.db.users.update(users[0].id, { 
              emailVerified: 1 
            })
            console.log('[HANDLER] User email_verified updated for:', email)
          }
        } catch (updateErr) {
          console.error('[HANDLER] Failed to update user email_verified:', updateErr)
        }

        // Delete the used token
        try {
          await blink.db.emailVerificationTokens.delete(tokenRecord.id)
          console.log('[HANDLER] Used token deleted')
        } catch (deleteErr) {
          console.error('[HANDLER] Failed to delete used token:', deleteErr)
        }

        return json({ 
          success: true, 
          message: 'Email verified successfully! You can now sign in.',
          email 
        })
      } catch (verifyErr) {
        console.error('[HANDLER] Verification error:', verifyErr)
        return json({ 
          success: false, 
          message: 'Verification failed. Please try again.' 
        }, 500)
      }
    }

    console.log('[HANDLER] Invalid action:', payload.action)
    return json({ success: false, message: 'Invalid action' }, 400)
  } catch (error) {
    console.error('=== UNHANDLED ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return json({ 
      success: false, 
      message: 'An unexpected error occurred. Please try again.' 
    }, 500)
  }
}

Deno.serve(handler)
