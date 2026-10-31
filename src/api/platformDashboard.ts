import { apiClient } from '@/lib/axiosClient'

export interface PlatformDashboard {
  companies: number
  activeCompanies: number
  vendors: number
  activeVendors: number
  users: number
  gifts: number
  activeGifts: number
  orders: number
  ordersByStatus: Record<string, number>
}

export async function getPlatformDashboard(): Promise<PlatformDashboard> {
  const { data } = await apiClient.get<PlatformDashboard>('/platform/dashboard')
  return data
}
