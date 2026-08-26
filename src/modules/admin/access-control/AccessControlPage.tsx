import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Checkbox } from 'primereact/checkbox'
import { Dropdown } from 'primereact/dropdown'
import { useMemo, useState } from 'react'
import type { AccessControlItem } from '@/api/accessControls'
import type { DesignationAccess } from '@/api/designations'
import { PageHeader } from '@/components/PageHeader'
import { useCompanies } from '@/hooks/useCompanies'
import { useAccessControlCatalog, useDesignationAccess, useDesignations, useReplaceDesignationAccess } from '@/hooks/useDesignations'
import { showApiError, showToast } from '@/lib/toast'

function groupByCategory(items: AccessControlItem[]): [string, AccessControlItem[]][] {
  const groups = new Map<string, AccessControlItem[]>()
  for (const item of items) {
    const bucket = groups.get(item.category)
    if (bucket) {
      bucket.push(item)
    } else {
      groups.set(item.category, [item])
    }
  }
  return [...groups.entries()]
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false
  for (const value of a) {
    if (!b.has(value)) return false
  }
  return true
}

function DesignationEditor({
  companyId,
  access,
  catalogByCategory,
}: {
  companyId: string
  access: DesignationAccess
  catalogByCategory: [string, AccessControlItem[]][]
}) {
  const replaceAccess = useReplaceDesignationAccess(companyId)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set(access.accessControlIds))

  const dirty = !setsEqual(checkedIds, new Set(access.accessControlIds))

  function toggleAccessControl(accessControlId: string, checked: boolean) {
    setCheckedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(accessControlId)
      } else {
        next.delete(accessControlId)
      }
      return next
    })
  }

  async function handleSave() {
    try {
      await replaceAccess.mutateAsync({ designation: access.designation, accessControlIds: [...checkedIds] })
      showToast({
        severity: 'success',
        summary: 'Access updated',
        detail: `${access.designation} now has ${checkedIds.size} permission${checkedIds.size === 1 ? '' : 's'}.`,
      })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <Card className="mt-6 border border-border">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          {catalogByCategory.map(([category, items]) => (
            <div key={category} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold tracking-wide text-text-muted uppercase">{category}</p>
              {items.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm text-text">
                  <Checkbox checked={checkedIds.has(item.id)} onChange={(e) => toggleAccessControl(item.id, Boolean(e.checked))} />
                  <span>
                    {item.name}
                    {item.description && <span className="block text-xs text-text-muted">{item.description}</span>}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button label="Save" loading={replaceAccess.isPending} disabled={!dirty} onClick={handleSave} />
        </div>
      </div>
    </Card>
  )
}

export function AccessControlPage() {
  const { data: companies } = useCompanies()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [designation, setDesignation] = useState<string | null>(null)

  const { data: designations } = useDesignations(companyId ?? undefined)
  const { data: catalog } = useAccessControlCatalog()
  const { data: access } = useDesignationAccess(companyId ?? undefined, designation ?? undefined)

  const catalogByCategory = useMemo(() => groupByCategory(catalog ?? []), [catalog])

  function handleCompanyChange(value: string) {
    setCompanyId(value)
    setDesignation(null)
  }

  return (
    <div>
      <PageHeader
        title="Access Control"
        subtitle="Choose a company and a designation, then grant the access-control keys it should have."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex w-full max-w-sm flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Company</label>
          <Dropdown
            value={companyId}
            onChange={(e) => handleCompanyChange(e.value)}
            options={(companies ?? []).map((c) => ({ label: c.name, value: c.id }))}
            placeholder="Choose a company"
            filter
            className="w-full"
          />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-1.5">
          <label className="text-sm font-medium text-text">Designation</label>
          <Dropdown
            value={designation}
            onChange={(e) => setDesignation(e.value)}
            options={(designations ?? []).map((d) => ({ label: d, value: d }))}
            placeholder="Choose a designation"
            disabled={!companyId}
            className="w-full"
          />
        </div>
      </div>

      {companyId && designations && designations.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">This company has no users with a designation set yet.</p>
      )}

      {companyId && access && (
        <DesignationEditor key={`${companyId}:${access.designation}`} companyId={companyId} access={access} catalogByCategory={catalogByCategory} />
      )}
    </div>
  )
}
