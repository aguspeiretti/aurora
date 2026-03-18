import { mockEmailProvider } from './mockEmailProvider'
import { createResendEmailProvider } from './resendEmailProvider'

export function createEmailProvider() {
  const providerName = import.meta.env?.VITE_EMAIL_PROVIDER || 'mock'

  switch (providerName) {
    case 'resend':
      return createResendEmailProvider({
        apiKey:      import.meta.env.VITE_RESEND_API_KEY,
        fromAddress: import.meta.env.VITE_EMAIL_FROM_ADDRESS,
        fromName:    import.meta.env.VITE_EMAIL_FROM_NAME || 'Aurora',
      })

    case 'mock':
    default:
      return mockEmailProvider
  }
}

export const emailProvider = createEmailProvider()
