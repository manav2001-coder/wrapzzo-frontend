import { Button } from 'primereact/button'
import { Dropdown } from 'primereact/dropdown'
import type { AudienceOptions, CampaignAudienceType } from '@/api/campaigns'

const TYPE_OPTIONS: { label: string; value: CampaignAudienceType }[] = [
  { label: 'Everyone at the company', value: 'ALL_COMPANY_USERS' },
  { label: 'Everyone in an org unit', value: 'ORG_UNIT' },
  { label: "A manager's whole team", value: 'MANAGER_TEAM' },
  { label: 'Specific people', value: 'SELECTED_USERS' },
]

export interface DraftAudience {
  key: string
  type: CampaignAudienceType
  orgUnitId?: string
  anchorUserId?: string
  userId?: string
}

let nextKey = 1

export function CampaignAudienceEditor({
  audiences,
  onChange,
  options,
  disabled,
}: {
  audiences: DraftAudience[]
  onChange: (audiences: DraftAudience[]) => void
  options: AudienceOptions | undefined
  disabled?: boolean
}) {
  function update(key: string, patch: Partial<DraftAudience>) {
    onChange(audiences.map((a) => (a.key === key ? { ...a, ...patch } : a)))
  }

  function remove(key: string) {
    onChange(audiences.filter((a) => a.key !== key))
  }

  function add() {
    onChange([...audiences, { key: `new-${nextKey++}`, type: 'SELECTED_USERS' }])
  }

  return (
    <div className="flex flex-col gap-3">
      {audiences.length === 0 && (
        <p className="text-sm text-text-muted">No audience rules yet -- add at least one so field users can find this campaign.</p>
      )}

      {audiences.map((audience) => (
        <div key={audience.key} className="grid grid-cols-1 items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-12">
          <div className="sm:col-span-4">
            <Dropdown
              value={audience.type}
              onChange={(e) => update(audience.key, { type: e.value, orgUnitId: undefined, anchorUserId: undefined, userId: undefined })}
              options={TYPE_OPTIONS}
              disabled={disabled}
              className="w-full"
            />
          </div>

          <div className="sm:col-span-6">
            {audience.type === 'ORG_UNIT' && (
              <Dropdown
                value={audience.orgUnitId}
                onChange={(e) => update(audience.key, { orgUnitId: e.value })}
                options={(options?.orgUnits ?? []).map((u) => ({ label: `${u.name} (${u.levelName})`, value: u.id }))}
                placeholder="Choose org unit"
                filter
                disabled={disabled}
                className="w-full"
              />
            )}
            {audience.type === 'MANAGER_TEAM' && (
              <Dropdown
                value={audience.anchorUserId}
                onChange={(e) => update(audience.key, { anchorUserId: e.value })}
                options={(options?.users ?? []).map((u) => ({ label: `${u.name} (${u.email})`, value: u.id }))}
                placeholder="Choose the manager"
                filter
                disabled={disabled}
                className="w-full"
              />
            )}
            {audience.type === 'SELECTED_USERS' && (
              <Dropdown
                value={audience.userId}
                onChange={(e) => update(audience.key, { userId: e.value })}
                options={(options?.users ?? []).map((u) => ({ label: `${u.name} (${u.email})`, value: u.id }))}
                placeholder="Choose person"
                filter
                disabled={disabled}
                className="w-full"
              />
            )}
            {audience.type === 'ALL_COMPANY_USERS' && <p className="text-sm text-text-muted">Applies to everyone, no further choice needed.</p>}
          </div>

          <div className="flex justify-end sm:col-span-2">
            <Button icon="pi pi-trash" text severity="danger" disabled={disabled} onClick={() => remove(audience.key)} aria-label="Remove rule" />
          </div>
        </div>
      ))}

      {!disabled && <Button label="Add audience rule" icon="pi pi-plus" outlined onClick={add} />}
    </div>
  )
}
