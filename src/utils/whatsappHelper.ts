/**
 * WhatsApp Helper Utility
 * Generates WhatsApp links for connecting buyers and sellers
 */

export interface WhatsAppMessageParams {
  phoneNumber: string;
  cropName?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  pricePerUnit?: number;
  buyerName?: string;
  buyerPhone?: string;
  customMessage?: string;
  orderNumber?: string;
}

/**
 * Formats phone number for WhatsApp API
 * Removes all non-numeric characters and adds country code if needed
 */
export function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add India country code (+91) if not present
  if (!cleaned.startsWith('91') && cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

/**
 * Generates a pre-filled WhatsApp message for buyer-seller communication
 */
export function generateWhatsAppMessage(params: WhatsAppMessageParams): string {
  const { cropName, quantity, unit, price, pricePerUnit, buyerName, buyerPhone, customMessage, orderNumber } = params;
  
  let message = `Hello! I'm interested in your listing`;
  
  if (orderNumber) {
    message = `Hello! I've placed an order (${orderNumber})`;
  }
  
  if (cropName) {
    message += ` for *${cropName}*`;
  }
  
  if (quantity && unit) {
    message += `\n📦 Quantity: ${quantity} ${unit}`;
  }
  
  if (pricePerUnit && unit) {
    message += `\n💵 Offered Price: ₹${pricePerUnit.toFixed(2)}/${unit}`;
  }
  
  if (price) {
    message += `\n💰 Total Offer Value: ₹${price.toFixed(2)}`;
  }
  
  if (buyerName) {
    message += `\n\n👤 Buyer Name: ${buyerName}`;
  }
  
  if (buyerPhone) {
    message += `\n📱 Buyer Contact: ${buyerPhone}`;
  }
  
  if (customMessage) {
    message += `\n\n📝 Message from Buyer:\n"${customMessage}"`;
  }
  
  message += `\n\nPlease let me know about:\n✓ Delivery arrangements\n✓ Payment details\n✓ Any other requirements`;
  
  return encodeURIComponent(message);
}

/**
 * Creates a WhatsApp Web/API URL with pre-filled message
 */
export function createWhatsAppLink(params: WhatsAppMessageParams): string {
  const formattedPhone = formatPhoneForWhatsApp(params.phoneNumber);
  const message = generateWhatsAppMessage(params);
  
  // Use wa.me for universal WhatsApp link (works on desktop and mobile)
  return `https://wa.me/${formattedPhone}?text=${message}`;
}

/**
 * Opens WhatsApp chat in new window/tab
 */
export function openWhatsAppChat(params: WhatsAppMessageParams): void {
  const link = createWhatsAppLink(params);
  window.open(link, '_blank', 'noopener,noreferrer');
}
