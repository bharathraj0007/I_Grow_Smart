import { createClient } from 'npm:@blinkdotnew/sdk@0.19.0'

type SendVerificationPayload = {
  action: 'send-verification'
  email: string
  userName?: string
  debugMode?: boolean // Added for testing token creation without email
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

// Send email using Brevo (Sendinblue) REST API
async function sendVerificationEmail(
  to: string,
  token: string,
  userName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY')
    
    if (!brevoApiKey) {
      console.error('[EMAIL ERROR] BREVO_API_KEY environment variable is not set')
      throw new Error('Email service not configured. Please contact support.')
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

    console.log('Sending verification email via Brevo API to:', to)
    
    // Use Brevo REST API v3
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'I Grow Smart',
          email: 'bharathrajgowdajb007@gmail.com', // Verified sender email in Brevo
        },
        to: [
          {
            email: to,
            name: userName,
          }
        ],
        subject: 'Verify Your Email - I Grow Smart',
        htmlContent: htmlContent,
        textContent: textContent,
      }),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('Brevo API error:', responseData)
      
      // Handle specific Brevo error messages
      if (responseData.code === 'unauthorized') {
        return { 
          success: false, 
          error: 'Email service authentication failed. Please contact support.'
        }
      }
      
      if (responseData.code === 'invalid_parameter') {
        return { 
          success: false, 
          error: 'Invalid email address or configuration.'
        }
      }
      
      return { 
        success: false, 
        error: responseData.message || 'Failed to send verification email.'
      }
    }

    console.log('Email sent successfully via Brevo, messageId:', responseData.messageId)
    
    return { 
      success: true, 
      messageId: responseData.messageId
    }
  } catch (err) {
    console.error('Brevo API error:', err)
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
      console.log('[HANDLER ERROR] Method not allowed:', req.method)
      return json({ success: false, message: 'Method not allowed' }, 405)
    }

    console.log('=== BREVO EMAIL VERIFICATION FUNCTION START ===')
    console.log('[REQUEST] Method:', req.method)
    console.log('[REQUEST] URL:', req.url)
    console.log('[REQUEST] Headers:', Object.fromEntries(req.headers.entries()))

    // Parse request body with detailed logging
    let payload: Partial<Payload>
    let rawBody: string
    try {
      rawBody = await req.text()
      console.log('[REQUEST] Raw body received:', rawBody)
      console.log('[REQUEST] Raw body length:', rawBody.length)
      
      if (!rawBody || rawBody.trim() === '') {
        console.error('[HANDLER ERROR] Empty request body received')
        return json({ 
          success: false, 
          message: 'Request body is empty. Please send JSON data.',
          debug: { rawBodyLength: 0 }
        }, 400)
      }
      
      payload = JSON.parse(rawBody)
      console.log('[REQUEST] Parsed payload:', JSON.stringify(payload, null, 2))
      console.log('[REQUEST] Action:', payload.action)
      console.log('[REQUEST] Email:', payload.action === 'send-verification' ? (payload as SendVerificationPayload).email : 'N/A')
    } catch (parseError) {
      console.error('[HANDLER ERROR] JSON parse error:', parseError)
      console.error('[HANDLER ERROR] Raw body that failed to parse:', rawBody!)
      return json({ 
        success: false, 
        message: 'Invalid JSON in request body',
        debug: {
          error: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          rawBodyPreview: rawBody ? rawBody.substring(0, 100) : 'empty'
        }
      }, 400)
    }

    // Validate payload exists
    if (!payload || typeof payload !== 'object') {
      console.error('[HANDLER ERROR] Payload is not an object:', typeof payload)
      return json({ 
        success: false, 
        message: 'Invalid request payload. Expected JSON object.',
        debug: { payloadType: typeof payload }
      }, 400)
    }

    // Validate action
    if (!payload.action) {
      console.error('[HANDLER ERROR] Missing action in payload')
      return json({ 
        success: false, 
        message: 'Action is required. Use "send-verification" or "verify-email".',
        debug: { receivedPayload: payload }
      }, 400)
    }

    // Validate email for send-verification action
    if (payload.action === 'send-verification') {
      const sendPayload = payload as Partial<SendVerificationPayload>
      
      // Check if email exists
      if (sendPayload.email === undefined || sendPayload.email === null) {
        console.error('[HANDLER ERROR] Email is undefined or null')
        return json({ 
          success: false, 
          message: 'Email is required.',
          debug: { emailValue: sendPayload.email, payloadKeys: Object.keys(payload) }
        }, 400)
      }
      
      const email = String(sendPayload.email).trim().toLowerCase()
      
      if (!email) {
        console.log('[HANDLER VALIDATION] Empty email after trimming')
        return json({ 
          success: false, 
          message: 'Email cannot be empty.',
          debug: { originalEmail: sendPayload.email }
        }, 400)
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        console.log('[HANDLER VALIDATION] Invalid email format:', email)
        return json({ 
          success: false, 
          message: 'Invalid email format.',
          debug: { email }
        }, 400)
      }
    }

    // Check environment variables
    const projectId = Deno.env.get('BLINK_PROJECT_ID')
    const secretKey = Deno.env.get('BLINK_SECRET_KEY')

    console.log('[ENV] BLINK_PROJECT_ID exists:', !!projectId)
    console.log('[ENV] BLINK_SECRET_KEY exists:', !!secretKey)

    if (!projectId || !secretKey) {
      console.error('[HANDLER ERROR] Missing Blink environment variables')
      console.error('[ENV] projectId:', projectId ? 'set' : 'MISSING')
      console.error('[ENV] secretKey:', secretKey ? 'set' : 'MISSING')
      return json({ 
        success: false, 
        message: 'Server configuration error. Missing API credentials.',
        debug: { projectIdExists: !!projectId, secretKeyExists: !!secretKey }
      }, 500)
    }

    // Send verification email with token
    if (payload.action === 'send-verification') {
      const sendPayload = payload as SendVerificationPayload
      const email = String(sendPayload.email).trim().toLowerCase()
      const userName = sendPayload.userName ? String(sendPayload.userName).trim() : 'there'
      const debugMode = sendPayload.debugMode === true

      console.log('[HANDLER] SEND-VERIFICATION - email:', email)
      console.log('[HANDLER] SEND-VERIFICATION - userName:', userName)
      console.log('[HANDLER] SEND-VERIFICATION - debugMode:', debugMode)

      // Step 1: Generate token
      console.log('[HANDLER] Step 1: Generating verification token...')
      const token = generateVerificationToken()
      console.log('[HANDLER] Token generated successfully, length:', token.length)
      console.log('[HANDLER] Token preview (first 8 chars):', token.substring(0, 8) + '...')

      // Step 2: Hash the token for database storage
      console.log('[HANDLER] Step 2: Hashing token...')
      let tokenHashHex: string
      let lookupHash: string
      try {
        const tokenHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(token)
        )
        tokenHashHex = Array.from(new Uint8Array(tokenHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
        lookupHash = token.substring(0, 16)
        console.log('[HANDLER] Token hashed successfully')
        console.log('[HANDLER] Token hash length:', tokenHashHex.length)
        console.log('[HANDLER] Lookup hash:', lookupHash)
      } catch (hashError) {
        console.error('[HANDLER ERROR] Failed to hash token:', hashError)
        return json({ 
          success: false, 
          message: 'Failed to create verification token (hash error).',
          debug: { error: hashError instanceof Error ? hashError.message : 'Unknown hash error' }
        }, 500)
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      console.log('[HANDLER] Token expires at:', expiresAt)

      // Step 3: Store in database
      console.log('[HANDLER] Step 3: Storing token in database...')
      let dbStorageSuccess = false
      let dbError: string | null = null
      
      try {
        console.log('[DB] Creating Blink client...')
        const blink = createClient({ projectId, secretKey })
        console.log('[DB] Blink client created successfully')

        // Clean up old tokens for this email
        console.log('[DB] Checking for existing tokens for email:', email)
        try {
          const existingTokens = await blink.db.emailVerificationTokens.list({
            where: { userId: email }
          })
          console.log('[DB] Found', existingTokens?.length || 0, 'existing tokens')
          
          for (const record of (existingTokens || [])) {
            try {
              console.log('[DB] Deleting old token:', record.id)
              await blink.db.emailVerificationTokens.delete(record.id)
              console.log('[DB] Deleted old token:', record.id)
            } catch (cleanupErr) { 
              console.error('[DB ERROR] Failed to delete old token:', record.id, cleanupErr)
            }
          }
        } catch (cleanupErr) {
          console.log('[DB INFO] Token cleanup skipped or failed:', cleanupErr)
          // Continue anyway - this is not critical
        }

        // Store new token
        console.log('[DB] Creating new token record...')
        console.log('[DB] Token data:', {
          userId: email,
          tokenHashLength: tokenHashHex.length,
          lookupHash,
          expiresAt,
        })
        
        const createResult = await blink.db.emailVerificationTokens.create({
          userId: email,
          tokenHash: tokenHashHex,
          lookupHash,
          expiresAt,
          createdAt: new Date().toISOString(),
        })
        
        console.log('[DB] Token create result:', createResult)
        dbStorageSuccess = true
        console.log('[DB] Token stored in database successfully')
      } catch (dbErr) {
        console.error('[DB ERROR] Database storage failed')
        console.error('[DB ERROR] Error type:', typeof dbErr)
        console.error('[DB ERROR] Error:', dbErr)
        if (dbErr instanceof Error) {
          console.error('[DB ERROR] Error message:', dbErr.message)
          console.error('[DB ERROR] Error stack:', dbErr.stack)
          dbError = dbErr.message
        } else {
          dbError = String(dbErr)
        }
        
        return json({ 
          success: false, 
          message: 'Failed to create verification token. Please try again.',
          debug: { 
            step: 'database_storage',
            error: dbError,
            email,
            tokenHashLength: tokenHashHex.length
          }
        }, 500)
      }

      // Debug mode: Skip email sending and return success with token info
      if (debugMode) {
        console.log('[HANDLER] Debug mode enabled - skipping email sending')
        return json({
          success: true,
          message: 'Token created successfully (debug mode - email not sent)',
          debug: {
            tokenCreated: true,
            dbStorageSuccess,
            email,
            lookupHash,
            expiresAt,
            tokenPreview: token.substring(0, 8) + '...'
          }
        })
      }

      // Step 4: Send email via Brevo API
      console.log('[HANDLER] Step 4: Sending verification email via Brevo API...')
      const emailResult = await sendVerificationEmail(email, token, userName)

      if (emailResult.success) {
        console.log('[HANDLER] Verification email sent successfully')
        console.log('[HANDLER] MessageId:', emailResult.messageId)
        console.log('[HANDLER] DB storage:', dbStorageSuccess ? 'success' : 'failed')
        
        return json({ 
          success: true, 
          message: 'Verification email sent! Please check your inbox.',
          messageId: emailResult.messageId
        })
      }

      // Email failed to send
      console.error('[HANDLER ERROR] Failed to send verification email:', emailResult.error)
      
      return json({ 
        success: false, 
        message: emailResult.error || 'Unable to send verification email. Please contact support.',
        debug: { 
          tokenCreated: dbStorageSuccess,
          emailError: emailResult.error
        }
      }, 400)
    }

    // Verify email token
    if (payload.action === 'verify-email') {
      const token = String(payload.token || '').trim()

      console.log('[HANDLER] VERIFY-EMAIL - token received')

      if (!token) {
        console.log('[HANDLER VALIDATION] Verification token is required')
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
          console.log('[DB] No token found for lookup hash:', lookupHash)
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
          console.error('[DB ERROR] Invalid token record data:', tokenRecord)
          return json({ 
            success: false, 
            message: 'Invalid verification record. Please request a new link.' 
          })
        }

        // Check if token matches
        if (storedTokenHash !== tokenHashHex) {
          console.log('[VERIFICATION] Token hash mismatch for lookup:', lookupHash)
          return json({ 
            success: false, 
            message: 'Invalid verification link. Please request a new one.' 
          })
        }

        // Check if token expired
        const expiresAt = new Date(expiresAtStr)
        if (!Number.isFinite(expiresAt.getTime()) || expiresAt < new Date()) {
          console.log('[VERIFICATION] Token expired for lookup:', lookupHash)
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
            console.log('[DB] User email_verified updated for:', email)
          } else {
            console.log('[DB] No user found to update email_verified status for:', email)
          }
        } catch (updateErr) {
          console.error('[DB ERROR] Failed to update user email_verified for:', email, updateErr)
        }

        // Delete the used token
        try {
          await blink.db.emailVerificationTokens.delete(tokenRecord.id)
          console.log('[DB] Used token deleted:', tokenRecord.id)
        } catch (deleteErr) {
          console.error('[DB ERROR] Failed to delete used token:', tokenRecord.id, deleteErr)
        }

        return json({ 
          success: true, 
          message: 'Email verified successfully! You can now sign in.',
          email 
        })
      } catch (verifyErr) {
        console.error('[HANDLER ERROR] Verification error:', verifyErr)
        return json({ 
          success: false, 
          message: 'Verification failed. Please try again.' 
        }, 500)
      }
    }

    console.log('[HANDLER] Invalid action received:', payload.action)
    return json({ success: false, message: 'Invalid action' }, 400)
  } catch (error) {
    console.error('=== UNHANDLED ERROR ===')
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