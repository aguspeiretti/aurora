/**
 * WhatsApp Provider Interface
 *
 * Todos los providers de WhatsApp deben implementar esta interfaz.
 * Los providers concretos se inyectan a través de createWhatsAppProvider().
 */

/**
 * @typedef {Object} WhatsAppMessage
 * @property {string} to           - Número destino (formato internacional, ej: +5491155550000)
 * @property {string} recipientName
 * @property {string} body         - Cuerpo del mensaje (ya resuelto con variables)
 * @property {string} [templateName]
 * @property {Object} [templateVariables]
 * @property {string} eventType    - notification_event_type
 * @property {string} jobId        - ID del notification_job
 */

/**
 * @typedef {Object} WhatsAppDeliveryResult
 * @property {boolean} success
 * @property {string}  [providerMessageId]
 * @property {string}  [error]
 * @property {Object}  [rawResponse]
 */

/**
 * Interfaz base del provider
 * @typedef {Object} WhatsAppProvider
 * @property {string} name - Nombre del provider
 * @property {(message: WhatsAppMessage) => Promise<WhatsAppDeliveryResult>} send
 * @property {() => boolean} isConfigured
 */

export function assertWhatsAppProvider(provider) {
  if (!provider || typeof provider.send !== 'function') {
    throw new Error('Invalid WhatsApp provider: must implement send(message)')
  }
}
