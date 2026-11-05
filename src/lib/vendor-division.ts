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

/** Narrows to one division; a stale choice (no orders there any more) shows everything rather than an empty portal. */
export function inDivision<T extends VendorOrder>(orders: readonly T[], division: string): T[] {
  if (division === ALL_DIVISIONS || !orders.some((order) => order.divisionId === division)) return [...orders]
  return orders.filter((order) => order.divisionId === division)
}
