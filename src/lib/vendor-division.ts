import { useSyncExternalStore } from 'react'

const KEY = 'vendor.division'
export const ALL_DIVISIONS = 'all'

const listeners = new Set<() => void>()
let selected = read()

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? ALL_DIVISIONS
  } catch {
    return ALL_DIVISIONS
  }
}

/** The division the vendor narrowed the portal to; kept across visits, shared by every vendor screen. */
export function setVendorDivision(id: string) {
  selected = id
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Private mode: the choice just lasts until reload.
  }
  listeners.forEach((listener) => listener())
}

export function useVendorDivision(): string {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => selected,
    () => ALL_DIVISIONS,
  )
}

export interface DivisionOption {
  id: string
  name: string
  count: number
}

/**
 * Every division the vendor can pick: the ones the company mapped it to (even with no order yet, shown with a zero) and any an
 * order came from. Busiest first, then by name.
 */
export function mergeDivisions(served: readonly { id: string; name: string }[], fromOrders: readonly DivisionOption[]): DivisionOption[] {
  const byId = new Map<string, DivisionOption>(served.map((division) => [division.id, { id: division.id, name: division.name, count: 0 }]))
  for (const option of fromOrders) byId.set(option.id, option)
  return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

