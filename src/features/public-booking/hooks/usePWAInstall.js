import { useEffect, useState } from 'react'

/**
 * Inyecta un manifest dinámico con el nombre/color de la org y
 * expone el prompt de instalación nativo (Android/Chrome).
 * En iOS muestra instrucciones manuales.
 */
export function usePWAInstall({ orgName, orgSlug, branchSlug, brandColor, logoUrl } = {}) {
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  // Detectar si ya está instalada como PWA
  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream)
  }, [])

  // Capturar el evento beforeinstallprompt (Chrome/Android)
  useEffect(() => {
    function handler(e) {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Inyectar manifest dinámico con datos de la org
  useEffect(() => {
    if (!orgName || !orgSlug) return

    const startUrl = branchSlug
      ? `/book/${orgSlug}/${branchSlug}`
      : `/book/${orgSlug}`

    const manifest = {
      name: orgName,
      short_name: orgName.length > 12 ? orgName.slice(0, 12) : orgName,
      description: `Reservá tu turno en ${orgName}`,
      theme_color: brandColor || '#a87030',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: startUrl,
      scope: startUrl,
      icons: logoUrl
        ? [
            { src: logoUrl, sizes: '192x192', type: 'image/png' },
            { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ]
        : [
            { src: '/apple-touch-icon.png', sizes: '192x192', type: 'image/png' },
            { src: '/apple-touch-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
    }

    // Crear Blob URL del manifest
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
    const blobUrl = URL.createObjectURL(blob)

    // Reemplazar el link del manifest en el head
    const existing = document.querySelector('link[rel="manifest"]')
    if (existing) existing.remove()
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = blobUrl
    document.head.appendChild(link)

    // theme-color dinámico
    let themeMeta = document.querySelector('meta[name="theme-color"]')
    if (!themeMeta) {
      themeMeta = document.createElement('meta')
      themeMeta.name = 'theme-color'
      document.head.appendChild(themeMeta)
    }
    themeMeta.content = brandColor || '#a87030'

    // iOS: title de la app
    let iosTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (iosTitleMeta) iosTitleMeta.content = orgName

    return () => URL.revokeObjectURL(blobUrl)
  }, [orgName, orgSlug, branchSlug, brandColor, logoUrl])

  async function triggerInstall() {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setIsInstalled(true)
    }
    return outcome === 'accepted'
  }

  const canInstallNative = !!installPrompt && !isInstalled
  const showIOSInstructions = isIOS && !isInstalled

  return { canInstallNative, showIOSInstructions, triggerInstall, isInstalled }
}
