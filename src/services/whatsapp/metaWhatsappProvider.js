/**
 * Meta WhatsApp Cloud API Provider
 *
 * Implementación para Meta (Facebook) WhatsApp Cloud API.
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Requiere:
 *   - WHATSAPP_META_TOKEN:    Bearer token de la app de Meta
 *   - WHATSAPP_META_PHONE_ID: ID del número de teléfono registrado
 */

const BASE_URL = 'https://graph.facebook.com/v18.0'

export function createMetaWhatsAppProvider({ token, phoneId }) {
  if (!token || !phoneId) {
    console.warn('[Meta WhatsApp] Missing credentials. Provider will fail.')
  }

  return {
    name: 'meta',

    isConfigured() {
      return !!(token && phoneId)
    },

    async send(message) {
      if (!this.isConfigured()) {
        return { success: false, error: 'Meta WhatsApp provider is not configured' }
      }

      try {
        const payload = {
          messaging_product: 'whatsapp',
          to: message.to.replace('+', ''),
          type: 'text',
          text: { body: message.body },
        }

        const response = await fetch(`${BASE_URL}/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const data = await response.json()

        if (!response.ok) {
          return {
            success: false,
            error: data.error?.message || 'Meta API error',
            rawResponse: data,
          }
        }

        return {
          success: true,
          providerMessageId: data.messages?.[0]?.id,
          rawResponse: data,
        }
      } catch (err) {
        return { success: false, error: err.message }
      }
    },
  }
}
