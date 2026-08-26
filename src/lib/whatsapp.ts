/** A wa.me deep link pre-filling a message -- no WhatsApp Business API/account needed, just opens the chat for a human to hit send. */
export function buildWhatsAppShareUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
