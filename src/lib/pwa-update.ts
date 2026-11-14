import { registerSW } from 'virtual:pwa-register'

/** How often a running app asks the server whether a new version is out. */
const CHECK_EVERY_MS = 30 * 60 * 1000

/**
 * Keeps an installed app current. A browser tab checks for a new version on every page load, but an installed app
 * is mostly resumed from the background, which loads nothing -- so it kept showing the old version until it was
 * uninstalled. Here the app checks when it comes back to the foreground and every half hour while open; a new
 * version then takes over and the app reloads once (registerType 'autoUpdate').
 */
export function keepAppUpToDate() {
  if (!('serviceWorker' in navigator)) return
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        // Offline (or a request in flight) is no reason to fail; the next check tries again.
        if (navigator.onLine) registration.update().catch(() => undefined)
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('online', check)
      window.setInterval(check, CHECK_EVERY_MS)
    },
  })
}
