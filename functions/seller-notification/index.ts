import { createClient } from 'npm:@blinkdotnew/sdk@0.19.0'

interface NotificationPayload {
  orderId: string
  orderNumber: string
  sellerPhone: string
  sellerName: string
  buyerName: string
  buyerPhone: string
  deliveryAddress: string
  items: Array<{
    cropName: string
    quantity: number
    unit: string
    pricePerUnit: number
    totalPrice: number
  }>
  notes?: string
}

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
      ...corsHeaders,
    },
  })
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

    console.log('=== SELLER NOTIFICATION FUNCTION START ===')

    const projectId = Deno.env.get('BLINK_PROJECT_ID')
    const secretKey = Deno.env.get('BLINK_SECRET_KEY')

    if (!projectId || !secretKey) {
      console.error('Missing environment variables')
      return json({ success: false, message: 'Server configuration error' }, 500)
    }

    let payload: NotificationPayload
    try {
      payload = await req.json()
    } catch {
      return json({ success: false, message: 'Invalid request body' }, 400)
    }

    // Validate required fields
    if (
      !payload.orderId ||
      !payload.orderNumber ||
      !payload.sellerPhone ||
      !payload.sellerName ||
      !payload.buyerName ||
      !payload.buyerPhone ||
      !payload.deliveryAddress ||
      !payload.items ||
      payload.items.length === 0
    ) {
      return json(
        { success: false, message: 'Missing required fields' },
        400
      )
    }

    console.log('Looking up seller email for phone:', payload.sellerPhone)

    // Step 1: Get Blink client
    let blink: ReturnType<typeof createClient>
    try {
      blink = createClient({ projectId, secretKey })
    } catch (clientError) {
      console.error('Failed to create Blink client:', clientError)
      return json({ success: false, message: 'Server initialization error' }, 500)
    }

    // Step 2: Find the seller's user account by phone number
    let sellerEmail: string | null = null
    try {
      const userProfiles = await blink.db.userProfiles.list({
        where: { phoneNumber: payload.sellerPhone },
        limit: 1,
      })

      if (userProfiles && userProfiles.length > 0) {
        const userProfile = userProfiles[0]
        const userId = String(userProfile.userId || userProfile.user_id || '')

        console.log('Found user profile for seller, userId:', userId)

        // Get user email from users table
        if (userId) {
          const user = await blink.db.users.get(userId)
          if (user) {
            sellerEmail = String(user.email || '')
            console.log('Found seller email:', sellerEmail)
          }
        }
      }
    } catch (lookupError) {
      console.error('Error looking up seller email:', lookupError)
    }

    // If we couldn't find seller email, that's okay - we just won't send email
    // The order is still created successfully
    if (!sellerEmail) {
      console.log(
        'Warning: Could not find seller email for phone',
        payload.sellerPhone,
        '- order created but email not sent'
      )
      return json({
        success: true,
        message: 'Order created successfully. Seller email not found for notification.',
        sellerEmailFound: false,
      })
    }

    // Step 3: Format the order items table
    const itemsTable = payload.items
      .map(
        (item) =>
          `                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">${item.cropName}</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">${item.quantity} ${item.unit}</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">₹${item.pricePerUnit}</td>
                        <td style="padding: 8px 0; color: #1f2937; font-weight: 600; text-align: right;">₹${item.totalPrice.toFixed(2)}</td>
                      </tr>`
      )
      .join('\n')

    const totalAmount = payload.items.reduce((sum, item) => sum + item.totalPrice, 0)

    // Step 4: Send notification email via Blink SDK
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🛒 New Order Received!</h1>
        </div>
        
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Order Details</h2>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <div style="margin-bottom: 15px;">
              <p style="margin: 0 0 5px 0; color: #6b7280; font-weight: 500;">Order Number:</p>
              <p style="margin: 0; color: #1f2937; font-weight: 700; font-size: 18px;">${payload.orderNumber}</p>
            </div>
            
            <h3 style="color: #1f2937; margin-top: 20px; margin-bottom: 10px;">Order Items:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 8px 0; text-align: left; color: #6b7280; font-weight: 600;">Crop</th>
                  <th style="padding: 8px 0; text-align: right; color: #6b7280; font-weight: 600;">Quantity</th>
                  <th style="padding: 8px 0; text-align: right; color: #6b7280; font-weight: 600;">Price/Unit</th>
                  <th style="padding: 8px 0; text-align: right; color: #6b7280; font-weight: 600;">Total</th>
                </tr>
              </thead>
              <tbody>
${itemsTable}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td colspan="3" style="padding: 12px 0; text-align: right; color: #1f2937; font-weight: 600; font-size: 18px;">Total Amount:</td>
                  <td style="padding: 12px 0; text-align: right; color: #10b981; font-weight: 700; font-size: 20px;">₹${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <h3 style="color: #1f2937; margin-bottom: 10px;">Buyer Information</h3>
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 5px 0; color: #1e3a8a;"><strong>Name:</strong> ${payload.buyerName}</p>
            <p style="margin: 5px 0; color: #1e3a8a;"><strong>Phone:</strong> ${payload.buyerPhone}</p>
            <p style="margin: 5px 0; color: #1e3a8a;"><strong>Delivery Address:</strong> ${payload.deliveryAddress}</p>
            ${
              payload.notes
                ? `<p style="margin: 5px 0; color: #1e3a8a;"><strong>Notes:</strong> ${payload.notes}</p>`
                : ''
            }
          </div>
          
          <h3 style="color: #1f2937; margin-top: 20px; margin-bottom: 10px;">Next Steps</h3>
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px;">
            <p style="margin: 5px 0; color: #92400e;">
              <strong>1.</strong> Contact the buyer at <strong>${payload.buyerPhone}</strong> to confirm the order
            </p>
            <p style="margin: 5px 0; color: #92400e;">
              <strong>2.</strong> Arrange delivery details and payment method
            </p>
            <p style="margin: 5px 0; color: #92400e;">
              <strong>3.</strong> Update the order status once you've shipped the products
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Log in to your I Grow Smart account to manage this order and update delivery status.
          </p>
        </div>
      </div>
    `

    const textContent = `
I Grow Smart - New Order Received!

Order Number: ${payload.orderNumber}

Order Items:
${payload.items.map((item) => `- ${item.cropName}: ${item.quantity} ${item.unit} @ ₹${item.pricePerUnit} = ₹${item.totalPrice.toFixed(2)}`).join('\n')}

Total Amount: ₹${totalAmount.toFixed(2)}

Buyer Information:
Name: ${payload.buyerName}
Phone: ${payload.buyerPhone}
Delivery Address: ${payload.deliveryAddress}
${payload.notes ? `Notes: ${payload.notes}` : ''}

Next Steps:
1. Contact the buyer at ${payload.buyerPhone} to confirm the order
2. Arrange delivery details and payment method
3. Update the order status once you've shipped the products

Log in to your I Grow Smart account to manage this order.
    `

    try {
      console.log('Sending seller notification email to:', sellerEmail)

      const emailResult = await blink.notifications.email({
        to: sellerEmail,
        subject: `New Order #${payload.orderNumber} - ${payload.items[0].cropName}`,
        html: htmlContent,
        text: textContent,
      })

      console.log('Email result:', emailResult)

      if (emailResult.success) {
        console.log('Seller notification sent successfully, messageId:', emailResult.messageId)
        return json({
          success: true,
          message: 'Order created and seller notification sent successfully',
          sellerEmailFound: true,
          messageId: emailResult.messageId,
        })
      } else {
        console.error('Email send failed:', emailResult)
        return json({
          success: true,
          message: 'Order created but failed to send email notification to seller',
          sellerEmailFound: true,
          emailSent: false,
        })
      }
    } catch (emailError) {
      console.error('Error sending seller notification:', emailError)
      return json({
        success: true,
        message:
          'Order created but could not send email notification. Seller can still view order in their account.',
        sellerEmailFound: true,
        emailSent: false,
      })
    }
  } catch (error) {
    console.error('Unhandled error:', error)
    return json({ success: false, message: 'An error occurred. Please try again.' }, 500)
  }
}

Deno.serve(handler)
