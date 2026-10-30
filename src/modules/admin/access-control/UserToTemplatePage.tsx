import { Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import type { BulkUserTemplateResult } from '@/api/templates'
import { EmptyState } from '@/components/empty-state'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { TransferList } from '@/components/transfer-list'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useHasAccess } from '@/hooks/use-permission'
import { useAccessCompany } from '@/hooks/useAccessCompany'
import { useBulkAssignUserTemplates, useReplaceUserTemplates, useTemplates, useUserTemplates } from '@/hooks/useTemplates'
import { useCompanyUsers } from '@/hooks/useUsers'
import { P } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { CompanyPicker } from './CompanyPicker'

/**
 * User to Template: templates for one person on top of their role's -- the exception, not the
 * norm. Tick one user to move templates across for them; tick several to give them all the same
 * templates in one go (additive, with a result per user).
 */
export function UserToTemplatePage() {
  const { t } = useTranslation('admin')
  const showError = useApiErrorToast()
  const canEdit = useHasAccess(P.ACCESS_EDIT)
  const { isPlatformStaff, companyId, picked, setPicked } = useAccessCompany()
  const { data: users } = useCompanyUsers(companyId)
  const { data: templates } = useTemplates(companyId)
  const replace = useReplaceUserTemplates(companyId ?? '')
  const bulk = useBulkAssignUserTemplates(companyId ?? '')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTemplates, setBulkTemplates] = useState<Set<string>>(new Set())
  const [results, setResults] = useState<BulkUserTemplateResult[] | null>(null)

  const onlyUserId = selected.size === 1 ? [...selected][0] : undefined
  const { data: userTemplateIds } = useUserTemplates(companyId, onlyUserId)
  const all = templates ?? []
  const toItem = (id: string) => ({ id, label: all.find((candidate) => candidate.id === id)?.name ?? id })
  const own = new Set(userTemplateIds)
  const available = all
    .filter((candidate) => candidate.active && !own.has(candidate.id))
    .map((candidate) => ({ id: candidate.id, label: candidate.name, hint: candidate.system ? t('templates.systemBadge') : undefined }))

  const shownUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (users ?? []).filter((user) => !needle || `${user.name} ${user.email}`.toLowerCase().includes(needle))
  }, [users, query])

  function flip(setter: typeof setSelected, id: string, on: boolean) {
    setter((current) => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function saveOne(templateIds: string[]) {
    try {
      await replace.mutateAsync({ userId: onlyUserId!, templateIds })
      toast.success(t('assign.updated', { name: users?.find((user) => user.id === onlyUserId)?.name ?? '' }))
    } catch (error) {
      showError(error)
    }
  }

  async function assignMany() {
    try {
      setResults(await bulk.mutateAsync({ userIds: [...selected], templateIds: [...bulkTemplates] }))
    } catch (error) {
      showError(error)
    }
  }

  return (
    <div className="space-y-6">
      <MasterPageHeader title={t('userToTemplate.title')} description={t('userToTemplate.subtitle')} />
      {isPlatformStaff && <CompanyPicker id="u2t-company" value={picked} onChange={(id) => { setPicked(id); setSelected(new Set()); setResults(null) }} />}

      {!companyId ? (
        <EmptyState icon={Users} size="sm" title={t('roles.pickCompany')} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <SectionCard title={t('userToTemplate.users', { count: selected.size })}>
            <Input aria-label={t('userToTemplate.search')} placeholder={t('userToTemplate.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
            <ul className="mt-2 max-h-96 divide-y overflow-y-auto">
              {shownUsers.map((user) => (
                <li key={user.id}>
                  <label className={cn('flex cursor-pointer items-center gap-2 py-1.5 text-sm', selected.has(user.id) && 'font-medium')}>
                    <Checkbox aria-label={user.name} checked={selected.has(user.id)} onCheckedChange={(next) => { flip(setSelected, user.id, next === true); setResults(null) }} />
                    <span className="flex-1">{user.name}</span>
                    <span className="text-xs text-muted-foreground">{user.roleName}</span>
                  </label>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="space-y-4">
            {selected.size === 0 && <EmptyState icon={Users} size="sm" title={t('userToTemplate.pickUsers')} />}

            {onlyUserId && (
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
            )}

            {selected.size > 1 && (
              <SectionCard
                title={t('userToTemplate.bulkTitle', { count: selected.size })}
                description={t('userToTemplate.bulkHint')}
                actions={
                  <Button size="sm" disabled={!canEdit || bulkTemplates.size === 0 || bulk.isPending} onClick={() => void assignMany()}>
                    {t('userToTemplate.assignToUsers', { count: selected.size })}
                  </Button>
                }
              >
                <div className="flex flex-wrap gap-2">
                  {all.filter((candidate) => candidate.active).map((candidate) => (
                    <label key={candidate.id} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm', bulkTemplates.has(candidate.id) && 'border-primary/40 bg-primary/5')}>
                      <Checkbox aria-label={candidate.name} checked={bulkTemplates.has(candidate.id)} onCheckedChange={(next) => flip(setBulkTemplates, candidate.id, next === true)} />
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
        </div>
      )}
    </div>
  )
}
