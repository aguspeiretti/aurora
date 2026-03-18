/**
 * Mock WhatsApp Provider
 *
 * Para desarrollo y testing. Loguea los mensajes a consola
 * y simula latencia de red. No envía mensajes reales.
 */

export const mockWhatsappProvider = {
  name: 'mock',

  isConfigured() {
    return true // siempre disponible en dev
  },

  async send(message) {
    console.group(`📱 [WhatsApp Mock] Mensaje enviado`)
    console.log('To:', message.to)
    console.log('Recipient:', message.recipientName)
    console.log('Event:', message.eventType)
    console.log('Body:', message.body)
    console.groupEnd()

    // Simular latencia
    await new Promise(resolve => setTimeout(resolve, 200))

    // Simular ~95% de éxito
    const success = Math.random() > 0.05

    if (!success) {
      return {
        success: false,
        error: 'Simulated delivery failure',
      }
    }

    return {
      success: true,
      providerMessageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      rawResponse: { status: 'sent', mock: true },
    }
  },
}
