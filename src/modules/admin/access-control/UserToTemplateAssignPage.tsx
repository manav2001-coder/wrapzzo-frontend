import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { BulkUserTemplateResult } from '@/api/templates'
import { IconButton } from '@/components/icon-button'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { TransferList } from '@/components/transfer-list'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useBulkAssignUserTemplates, useReplaceUserTemplates, useTemplates, useUserTemplates } from '@/hooks/useTemplates'
import { useCompanyUsers } from '@/hooks/useUsers'
import { P } from '@/lib/permissions'
import { cn } from '@/lib/utils'

/**
 * User to Template, step 2: templates for the people ticked on the list, on top of their roles'.
 * One user: move templates across for them. Several: give them all the same templates (additive,
 * with a result per user).
 */
export function UserToTemplateAssignPage() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const location = useLocation()
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.ACCESS_EDIT)
  const { companyId, scoped } = useAccessCompany()
  const userIds = (location.state as { userIds?: string[] } | null)?.userIds ?? []
  const { data: users } = useCompanyUsers(companyId)
  const { data: templates } = useTemplates(companyId)
  const onlyUserId = userIds.length === 1 ? userIds[0] : undefined
  const { data: userTemplateIds } = useUserTemplates(companyId, onlyUserId)
  const replace = useReplaceUserTemplates(companyId ?? '')
  const bulk = useBulkAssignUserTemplates(companyId ?? '')
  const [bulkTemplates, setBulkTemplates] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<BulkUserTemplateResult[] | null>(null)

  if (userIds.length === 0) return <Navigate to={scoped('/access/user-templates')} replace />

  const all = templates ?? []
  const own = new Set(userTemplateIds)
  const toItem = (id: string) => ({ id, label: all.find((candidate) => candidate.id === id)?.name ?? id })
  const available = all
    .filter((candidate) => candidate.active && !own.has(candidate.id))
    .map((candidate) => ({ id: candidate.id, label: candidate.name, hint: candidate.system ? t('templates.systemBadge') : undefined }))
  const userName = (id: string) => users?.find((user) => user.id === id)?.name ?? id

  async function saveOne(templateIds: string[]) {
    try {
      await replace.mutateAsync({ userId: onlyUserId!, templateIds })
      toast.success(t('assign.updated', { name: userName(onlyUserId!) }))
    } catch (error) {
      showError(error)
    }
  }

  async function assignMany() {
    try {
      setResults(await bulk.mutateAsync({ userIds, templateIds: [...bulkTemplates] }))
    } catch (error) {
      showError(error)
    }
  }

  function toggle(id: string, on: boolean) {
    setBulkTemplates((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label={t('assign.back')} onClick={() => navigate(scoped('/access/user-templates'))} />}
        title={onlyUserId ? t('userToTemplate.assignTitle', { name: userName(onlyUserId) }) : t('userToTemplate.bulkTitle', { count: userIds.length })}
        description={t('userToTemplate.subtitle')}
      />

      {onlyUserId ? (
        <TransferList
          available={available}
          assigned={[...own].map(toItem)}
          disabled={!canEdit || replace.isPending}
          availableTitle={t('userToTemplate.available')}
          assignedTitle={t('userToTemplate.assigned')}
          searchLabel={t('assign.search')}
          addLabel={t('assign.add')}
          removeLabel={t('assign.remove')}
          emptyAvailable={t('userToTemplate.noneAvailable')}
          emptyAssigned={t('userToTemplate.noneAssigned')}
          onAdd={(ids) => void saveOne([...own, ...ids])}
          onRemove={(ids) => void saveOne([...own].filter((id) => !ids.includes(id)))}
        />
      ) : (
        <SectionCard
          title={t('userToTemplate.pickTemplates')}
          description={t('userToTemplate.bulkHint')}
          actions={
            <Button size="sm" disabled={!canEdit || bulkTemplates.size === 0 || bulk.isPending} onClick={() => void assignMany()}>
              {t('userToTemplate.assignToUsers', { count: userIds.length })}
            </Button>
          }
        >
          <div className="flex flex-wrap gap-2">
            {all.filter((candidate) => candidate.active).map((candidate) => (
              <label key={candidate.id} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', bulkTemplates.has(candidate.id) && 'border-primary/40 bg-primary/5')}>
                <Checkbox aria-label={candidate.name} checked={bulkTemplates.has(candidate.id)} onCheckedChange={(next) => toggle(candidate.id, next === true)} />
                {candidate.name}
              </label>
            ))}
          </div>
        </SectionCard>
      )}

      {results && (
        <SectionCard title={t('userToTemplate.results')}>
          <ul className="space-y-1 text-sm" role="list">
            {results.map((result) => (
              <li key={result.userId}>
                <span className="font-medium">{result.userName ?? result.userId}</span>:{' '}
                {result.status === 'ok' ? t('userToTemplate.resultOk', { added: result.added, skipped: result.skipped }) : (result.error ?? t('userToTemplate.failed'))}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  )
}
