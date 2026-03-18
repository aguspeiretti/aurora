import { mockWhatsappProvider } from './mockWhatsappProvider'
import { createMetaWhatsAppProvider } from './metaWhatsappProvider'

/**
 * Fábrica del provider activo según configuración de entorno.
 * En Edge Functions, leer las variables del servidor.
 */
export function createWhatsAppProvider() {
  const providerName = import.meta.env?.VITE_WHATSAPP_PROVIDER || 'mock'

  switch (providerName) {
    case 'meta':
      return createMetaWhatsAppProvider({
        token:   import.meta.env.VITE_META_WHATSAPP_TOKEN,
        phoneId: import.meta.env.VITE_META_WHATSAPP_PHONE_ID,
      })

    case 'mock':
    default:
      return mockWhatsappProvider
  }
}

export const whatsappProvider = createWhatsAppProvider()
