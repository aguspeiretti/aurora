export const mockEmailProvider = {
  name: 'mock',

  isConfigured() {
    return true
  },

  async send(message) {
    console.group(`📧 [Email Mock] Email enviado`)
    console.log('To:', `${message.toName} <${message.to}>`)
    console.log('Subject:', message.subject)
    console.log('Event:', message.eventType)
    console.log('Preview:', message.html?.slice(0, 200))
    console.groupEnd()

    await new Promise(resolve => setTimeout(resolve, 100))

    return {
      success: true,
      providerMessageId: `mock_email_${Date.now()}`,
      rawResponse: { mock: true },
    }
  },
}
