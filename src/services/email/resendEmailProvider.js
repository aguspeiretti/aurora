/**
 * Resend Email Provider
 * Documentación: https://resend.com/docs
 */

export function createResendEmailProvider({ apiKey, fromAddress, fromName }) {
  return {
    name: 'resend',

    isConfigured() {
      return !!(apiKey && fromAddress)
    },

    async send(message) {
      if (!this.isConfigured()) {
        return { success: false, error: 'Resend provider is not configured' }
      }

      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${message.fromName || fromName} <${message.from || fromAddress}>`,
            to: [`${message.toName} <${message.to}>`],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          return { success: false, error: data.message || 'Resend API error', rawResponse: data }
        }

        return { success: true, providerMessageId: data.id, rawResponse: data }
      } catch (err) {
        return { success: false, error: err.message }
      }
    },
  }
}
