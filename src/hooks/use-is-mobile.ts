import * as React from 'react'

const QUERY = '(max-width: 767px)'

/** True on phone-sized viewports (below Tailwind's `md`). Updates when the window is resized or rotated. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = React.useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(QUERY).matches)
  React.useEffect(() => {
    const media = window.matchMedia?.(QUERY)
    if (!media) return
    const update = () => setMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return mobile
}
