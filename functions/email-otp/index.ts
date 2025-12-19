import { createClient } from 'npm:@blinkdotnew/sdk@0.19.0'

type SendPayload = {
  action: 'send'
  email: string
  userName?: string
}

type VerifyPayload = {
  action: 'verify'
  email: string
  otp: string
}

type Payload = SendPayload | VerifyPayload

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

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return json({ success: false, message: 'Method not allowed' }, 405)
    }

    const projectId = Deno.env.get('BLINK_PROJECT_ID')
    const secretKey = Deno.env.get('BLINK_SECRET_KEY')

    console.log('=== EMAIL OTP FUNCTION START ===')

    if (!projectId || !secretKey) {
      console.error('Missing environment variables')
      return json({ success: false, message: 'Server configuration error' }, 500)
    }

    let blink: ReturnType<typeof createClient>
    try {
      blink = createClient({ projectId, secretKey })
    } catch (clientError) {
      console.error('Failed to create Blink client:', clientError)
      return json({ success: false, message: 'Server initialization error' }, 500)
    }

    let payload: Partial<Payload>
    try {
      payload = await req.json()
      console.log('Received action:', payload.action)
    } catch {
      return json({ success: false, message: 'Invalid request body' }, 400)
    }

    if (payload.action === 'send') {
      const email = String(payload.email || '').trim().toLowerCase()
      const userName = payload.userName ? String(payload.userName).trim() : 'there'

      console.log('SEND - email:', email)

      if (!email) {
        return json({ success: false, message: 'Email is required' }, 400)
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return json({ success: false, message: 'Invalid email format' }, 400)
      }

      const otp = generateOtp()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // Delete existing unverified OTPs and create new one
      try {
        const existingOtps = await blink.db.emailOtpVerification.list({
          where: { email, verified: '0' }
        })
        
        for (const record of (existingOtps || [])) {
          try {
            await blink.db.emailOtpVerification.delete(record.id)
          } catch { /* ignore */ }
        }
      } catch { /* ignore cleanup errors */ }

      try {
        await blink.db.emailOtpVerification.create({
          email,
          otpCode: otp,
          expiresAt,
          verified: '0',
          attempts: '0',
        })
        console.log('OTP record created successfully')
      } catch (createErr) {
        console.error('Failed to create OTP record:', createErr)
        return json({ success: false, message: 'Failed to generate verification code' }, 500)
      }

      // Prepare email content using Blink SDK notifications
      const htmlContent = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🌱 I Grow Smart</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Smart Agriculture Support System</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">Hi ${userName},</p>
            <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">Your verification code for I Grow Smart is:</p>
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 25px; text-align: center; border-radius: 12px; margin: 25px 0; border: 2px dashed #10b981;">
              <span style="font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 20px 0;">
              <strong>⏰ This code expires in 10 minutes.</strong>
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              If you didn't request this verification code, you can safely ignore this email.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} I Grow Smart - Empowering Farmers with Technology</p>
          </div>
        </div>
      `
      
      const textContent = `I Grow Smart - Email Verification

Hi ${userName},

Your verification code is: ${otp}

This code expires in 10 minutes.

If you didn't request this, please ignore this email.

© ${new Date().getFullYear()} I Grow Smart`

      const emailSubject = `${otp} is your I Grow Smart verification code`

      // TESTING MODE: Blink SDK uses Resend which has free-tier restrictions
      // Resend free tier only allows sending to the account owner's email
      // In production, you need a verified domain in Resend (https://resend.com/domains)
      // For testing, all emails are forced to: bharathrajgowdajb007@gmail.com
      const TEST_EMAIL = 'bharathrajgowdajb007@gmail.com'
      const originalEmail = email
      const isTestMode = true // Set to false in production with verified domain
      
      const emailRecipient = isTestMode ? TEST_EMAIL : email
      
      if (isTestMode) {
        console.log(`[TESTING MODE] Redirecting email from ${originalEmail} to ${TEST_EMAIL}`)
      }

      // Send email via Blink SDK notifications
      console.log('Sending OTP email via Blink notifications to:', emailRecipient)
      
      try {
        const emailResult = await blink.notifications.email({
          to: emailRecipient,
          subject: emailSubject,
          html: htmlContent,
          text: textContent,
        })

        console.log('Blink email result:', JSON.stringify(emailResult))

        if (emailResult.success) {
          console.log('Email sent successfully, messageId:', emailResult.messageId)
          
          const message = isTestMode
            ? `[TESTING MODE] Verification code sent to bharathrajgowdajb007@gmail.com. In production, configure a verified domain in Resend.`
            : 'Verification code sent successfully! Please check your email (including spam folder).'
          
          return json({ 
            success: true, 
            message,
            testMode: isTestMode
          })
        } else {
          console.error('Blink email failed:', emailResult)
          
          // Don't throw 500 error - return clear message instead
          const message = isTestMode
            ? 'Email delivery restricted in testing mode. Verification code sent to bharathrajgowdajb007@gmail.com for testing.'
            : 'Failed to send verification email. Please try again.'
          
          return json({ 
            success: false, 
            message,
            testMode: isTestMode
          }, 400)
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError)
        
        // Provide helpful error message without 500 status
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error'
        console.error('Email error details:', errorMessage)
        
        // Check if it's a restriction error
        const isRestricted = errorMessage.includes('restricted') || errorMessage.includes('not allowed')
        const message = isRestricted && isTestMode
          ? 'Email delivery restricted in testing mode. Verification code sent to bharathrajgowdajb007@gmail.com for testing.'
          : 'Unable to send verification email. Please contact support.'
        
        return json({ 
          success: false, 
          message,
          testMode: isTestMode
        }, 400)
      }
    }

    if (payload.action === 'verify') {
      const email = String(payload.email || '').trim().toLowerCase()
      const otp = String(payload.otp || '').trim()

      console.log('VERIFY - email:', email)

      if (!email) return json({ success: false, message: 'Email is required' }, 400)
      if (!otp) return json({ success: false, message: 'OTP is required' }, 400)

      try {
        const rows = await blink.db.emailOtpVerification.list<{
          id: string
          otp_code?: string
          otpCode?: string
          expires_at?: string
          expiresAt?: string
          attempts?: number | string
        }>({
          where: { email, verified: '0' },
          orderBy: { createdAt: 'desc' },
          limit: 1,
        })

        if (!rows || rows.length === 0) {
          return json({ success: false, message: 'No verification code found. Please request a new one.' })
        }

        const otpRecord = rows[0]
        const storedOtp = String(otpRecord.otp_code || otpRecord.otpCode || '').trim()
        const expiresAtStr = String(otpRecord.expires_at || otpRecord.expiresAt || '')
        const attemptsCount = Number(otpRecord.attempts || 0)
        const recordId = String(otpRecord.id)

        if (!storedOtp || !expiresAtStr || !recordId) {
          return json({ success: false, message: 'Invalid verification record. Please request a new code.' })
        }

        const expiresAt = new Date(expiresAtStr)
        if (!Number.isFinite(expiresAt.getTime()) || expiresAt < new Date()) {
          return json({ success: false, message: 'Verification code has expired. Please request a new one.' })
        }

        if (attemptsCount >= 3) {
          return json({ success: false, message: 'Maximum attempts exceeded. Please request a new verification code.' })
        }

        if (storedOtp !== otp) {
          try {
            await blink.db.emailOtpVerification.update(recordId, { attempts: String(attemptsCount + 1) })
          } catch { /* ignore */ }
          const remaining = 3 - (attemptsCount + 1)
          return json({ success: false, message: `Invalid code. ${remaining} attempt(s) remaining.` })
        }

        try {
          await blink.db.emailOtpVerification.update(recordId, { verified: '1' })
        } catch { /* ignore */ }
        
        return json({ success: true, message: 'Email verified successfully!' })
      } catch (verifyErr) {
        console.error('Verification error:', verifyErr)
        return json({ success: false, message: 'Verification failed. Please try again.' }, 500)
      }
    }

    return json({ success: false, message: 'Invalid action' }, 400)
  } catch (error) {
    console.error('Unhandled error:', error)
    return json({ success: false, message: 'An error occurred. Please try again.' }, 500)
  }
}

Deno.serve(handler);
