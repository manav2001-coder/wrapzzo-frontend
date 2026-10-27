import type { CreateQuickGiftInput } from '@/api/quickGifts'
import { apiClient } from '@/lib/axiosClient'

export type RecurringPlanStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED'

/** A Quick Gift placed again every month -- the first order goes out when the plan is made. */
export interface RecurringOrderPlan {
  id: string
  giftId: string
  giftName: string
  vendorName: string | null
  recipientName: string
  recipientPhone: string
  deliveryAddress: string
  quantity: number
  status: RecurringPlanStatus
  /** YYYY-MM-DD: when the next order is placed. */
  nextRunOn: string
  runsCompleted: number
  /** Why the last scheduled run failed; null when it went through. */
  lastError: string | null
  createdAt: string
}

export type RecurringPlanAction = 'pause' | 'resume' | 'cancel' | 'placeNextNow'

export async function createRecurringOrderPlan(input: CreateQuickGiftInput): Promise<RecurringOrderPlan> {
  const { data } = await apiClient.post<RecurringOrderPlan>('/api/recurring-orders', input)
  return data
}

export async function listMyRecurringOrderPlans(): Promise<RecurringOrderPlan[]> {
  const { data } = await apiClient.get<RecurringOrderPlan[]>('/api/recurring-orders/mine')
  return data
}

export async function actOnRecurringOrderPlan(id: string, action: RecurringPlanAction): Promise<RecurringOrderPlan> {
  const { data } = await apiClient.post<RecurringOrderPlan>(`/api/recurring-orders/${id}/${action}`)
  return data
}
