import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Menu } from 'primereact/menu'
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import type { ThemePreference } from '@/features/ui/uiSlice'
import { setTheme } from '@/features/ui/uiSlice'
import { useLogout } from '@/hooks/useAuth'

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
]

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const theme = useAppSelector((state) => state.ui.theme)
  const menuRef = useRef<Menu>(null)
  const themeMenuRef = useRef<Menu>(null)
  const navigate = useNavigate()
  const logout = useLogout()

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?'
  const ActiveThemeIcon = THEME_OPTIONS.find((option) => option.value === theme)?.Icon ?? Monitor

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <i className="pi pi-bars" />
      </button>
      <span />

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted"
          onClick={(event) => themeMenuRef.current?.toggle(event)}
          aria-label="Change theme"
        >
          <ActiveThemeIcon className="size-4" strokeWidth={1.75} />
        </button>
        <Menu
          ref={themeMenuRef}
          popup
          className="w-44"
          model={THEME_OPTIONS.map((option) => ({
            template: () => (
              <button
                type="button"
                onClick={(event) => {
                  dispatch(setTheme(option.value))
                  themeMenuRef.current?.hide(event)
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-text hover:bg-surface-muted"
              >
                <option.Icon className="size-4 text-text-muted" strokeWidth={1.75} />
                <span className="flex-1">{option.label}</span>
                {theme === option.value && <Check className="size-3.5 text-accent" strokeWidth={2} />}
              </button>
            ),
          }))}
        />

        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-surface-muted"
          onClick={(event) => menuRef.current?.toggle(event)}
          aria-label="Account menu"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
            {initial}
          </span>
          <i className="pi pi-chevron-down mr-1 text-[10px] text-text-muted" />
        </button>
        <Menu
          ref={menuRef}
          popup
          className="mt-1 w-56"
          model={[
            {
              template: () => (
                <div className="px-3.5 py-2.5">
                  <p className="text-[11px] tracking-wide text-text-muted uppercase">Signed in as</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-text">{user?.email}</p>
                </div>
              ),
            },
            { separator: true },
            {
              label: 'Log out',
              icon: 'pi pi-sign-out',
              command: () => {
                logout()
                navigate('/login', { replace: true })
              },
            },
          ]}
        />
      </div>
    </header>
  )
}
