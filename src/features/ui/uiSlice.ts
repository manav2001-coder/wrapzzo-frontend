import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type ThemePreference = 'light' | 'dark' | 'system'

interface UiState {
  sidebarCollapsed: boolean
  /** Which sidebar module groups are expanded, keyed by NavModule.key. */
  expandedModules: string[]
  theme: ThemePreference
}

const EXPANDED_MODULES_KEY = 'wrapzzo.expandedModules'
const THEME_KEY = 'wrapzzo.theme'

function loadExpandedModules(): string[] {
  try {
    const raw = localStorage.getItem(EXPANDED_MODULES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : ['admin']
  } catch {
    return ['admin']
  }
}

function loadTheme(): ThemePreference {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

const initialState: UiState = {
  sidebarCollapsed: localStorage.getItem('wrapzzo.sidebarCollapsed') === 'true',
  expandedModules: loadExpandedModules(),
  theme: loadTheme(),
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
      localStorage.setItem('wrapzzo.sidebarCollapsed', String(state.sidebarCollapsed))
    },
    toggleModuleExpanded(state, action: PayloadAction<string>) {
      state.expandedModules = state.expandedModules.includes(action.payload)
        ? state.expandedModules.filter((key) => key !== action.payload)
        : [...state.expandedModules, action.payload]
      localStorage.setItem(EXPANDED_MODULES_KEY, JSON.stringify(state.expandedModules))
    },
    setTheme(state, action: PayloadAction<ThemePreference>) {
      state.theme = action.payload
      localStorage.setItem(THEME_KEY, action.payload)
    },
  },
})

export const { toggleSidebar, toggleModuleExpanded, setTheme } = uiSlice.actions
export default uiSlice.reducer
