import { useSyncExternalStore } from 'react'

import type { VendorOrder } from '@/api/vendorOrders'

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

/** The divisions the vendor's orders come from, busiest first; orders placed in no division are not offered. */
export function divisionsOf(orders: readonly VendorOrder[]): DivisionOption[] {
  const byId = new Map<string, DivisionOption>()
  for (const order of orders) {
    if (!order.divisionId || !order.divisionName) continue
    const entry = byId.get(order.divisionId) ?? { id: order.divisionId, name: order.divisionName, count: 0 }
    entry.count += 1
    byId.set(order.divisionId, entry)
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
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

/** Narrows to one division; "all" shows everything. A choice with no orders shows none -- that is the answer. */
export function inDivision<T extends VendorOrder>(orders: readonly T[], division: string): T[] {
  if (division === ALL_DIVISIONS) return [...orders]
  return orders.filter((order) => order.divisionId === division)
}
