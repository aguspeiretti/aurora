/**
 * Email Provider Interface
 *
 * @typedef {Object} EmailMessage
 * @property {string}   to           - Email destino
 * @property {string}   toName       - Nombre del destinatario
 * @property {string}   from         - Email remitente
 * @property {string}   fromName     - Nombre del remitente
 * @property {string}   subject
 * @property {string}   html         - Cuerpo HTML
 * @property {string}   [text]       - Cuerpo texto plano (fallback)
 * @property {string}   eventType
 * @property {string}   jobId
 */

/**
 * @typedef {Object} EmailDeliveryResult
 * @property {boolean} success
 * @property {string}  [providerMessageId]
 * @property {string}  [error]
 * @property {Object}  [rawResponse]
 */

export function assertEmailProvider(provider) {
  if (!provider || typeof provider.send !== 'function') {
    throw new Error('Invalid email provider: must implement send(message)')
  }
}
