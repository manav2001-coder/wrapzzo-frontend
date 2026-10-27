import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { CampaignPurpose, CampaignRecipientCategory } from '@/api/campaigns'
import { FormGenerator } from '@/components/fields/form-generator'
import { Stepper } from '@/components/fields/stepper'
import { IconButton } from '@/components/icon-button'
import { selectField, textField } from '@/components/masters/master-fields'
import { MasterPageHeader } from '@/components/masters/master-page'
import { SectionCard } from '@/components/section-card'
import { Button } from '@/components/ui/button'
import { useApiErrorToast } from '@/hooks/use-api-error-toast'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { useActiveGifts } from '@/hooks/useGifts'
import { humanize } from '@/lib/format'
import { GiftThumbnail } from '@/modules/admin/gifts/GiftThumbnail'
import { CampaignGiftPicker } from './CampaignGiftPicker'

const PURPOSE_OPTIONS: CampaignPurpose[] = [
  'PRODUCT_LAUNCH',
  'EMPLOYEE_RECOGNITION',
  'FESTIVAL',
  'EVENT',
  'CONFERENCE',
  'CLIENT_ENGAGEMENT',
  'HCP_ENGAGEMENT',
  'DISTRIBUTOR_ENGAGEMENT',
  'REWARDS',
  'OTHER',
]

const RECIPIENT_OPTIONS: CampaignRecipientCategory[] = [
  'EMPLOYEE',
  'CLIENT',
  'CUSTOMER',
  'HCP_DOCTOR',
  'DISTRIBUTOR',
  'STOCKIST',
  'DEALER',
  'VENDOR_PARTNER',
  'EVENT_ATTENDEE',
  'OTHER',
]

const STEPS = ['Basics', 'Choose gift(s)', 'Review & create']

interface Basics {
  name: string
  purpose: CampaignPurpose
  recipientCategory: CampaignRecipientCategory
  instructions: string
}

/** Create a campaign in three steps: the basics, the gift(s) it offers, then a review. Audience and activation come after, on the campaign. */
export function CampaignWizardPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const showError = useApiErrorToast()
  // From a Gift Store card's "Launch campaign": that gift starts checked.
  const { initialGiftId } = (location.state as { initialGiftId?: string } | null) ?? {}
  const createCampaign = useCreateCampaign()
  const { data: gifts } = useActiveGifts()

  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [basics, setBasics] = useState<Basics | null>(null)
  const [giftIds, setGiftIds] = useState<string[]>(initialGiftId ? [initialGiftId] : [])
  const [giftError, setGiftError] = useState(false)
  const selectedGifts = (gifts ?? []).filter((g) => giftIds.includes(g.id))

  const fields = useMemo(
    () => [
      textField({ id: 'name', label: 'Campaign name', required: true, max: 200, spanToFullRow: true }),
      selectField({ id: 'purpose', label: 'Purpose', required: true, options: PURPOSE_OPTIONS.map((value) => ({ value, label: humanize(value) })) }),
      selectField({
        id: 'recipientCategory',
        label: 'Recipient category',
        required: true,
        options: RECIPIENT_OPTIONS.map((value) => ({ value, label: humanize(value) })),
      }),
      textField({ id: 'instructions', label: 'Instructions for your team', multiline: true, max: 2000, spanToFullRow: true }),
    ],
    [],
  )

  function goTo(next: number) {
    setStep(next)
    setFurthest((f) => Math.max(f, next))
  }

  async function create() {
    if (!basics) return
    try {
      const campaign = await createCampaign.mutateAsync({
        name: basics.name.trim(),
        purpose: basics.purpose,
        recipientCategory: basics.recipientCategory,
        giftIds,
        instructions: basics.instructions.trim() || undefined,
      })
      toast.success('Campaign created', { description: 'Next, choose who can submit into it and activate it.' })
      navigate(`/campaigns/${campaign.id}`, { replace: true })
    } catch (err) {
      showError(err)
    }
  }

  return (
    <div className="space-y-5 pb-6">
      <MasterPageHeader
        lead={<IconButton icon={ArrowLeft} label="Campaigns" onClick={() => navigate('/campaigns')} />}
        title="New campaign"
        description="Set up the basics, pick your gift(s), then review and create."
      />

      <Stepper steps={STEPS} activeStep={step} onStepClick={(index) => index <= furthest && setStep(index)} />

      {step === 0 && (
        <SectionCard title="Basics" className="max-w-3xl">
          <FormGenerator
            fields={fields}
            values={basics ? { ...basics } : undefined}
            mode={basics ? 'edit' : 'create'}
            maxWidgetsPerRow={2}
            submitLabel="Next: choose gift(s)"
            hideCardWrapper
            onSubmit={(submitted) => {
              setBasics({
                name: String(submitted.name ?? ''),
                purpose: submitted.purpose as CampaignPurpose,
                recipientCategory: submitted.recipientCategory as CampaignRecipientCategory,
                instructions: String(submitted.instructions ?? ''),
              })
              goTo(1)
            }}
          />
        </SectionCard>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {initialGiftId && selectedGifts.length > 0 && (
            <p className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Starting with <span className="font-medium">{selectedGifts[0].name}</span> from the Gift Store. Add more if you like.
            </p>
          )}
          <CampaignGiftPicker
            selectedIds={giftIds}
            onChange={(ids) => {
              setGiftIds(ids)
              setGiftError(false)
            }}
          />
          {giftError && <p className="text-sm text-destructive">Pick at least one gift to continue.</p>}
          <p className="text-sm text-muted-foreground">With more than one, whoever submits a recipient picks which gift they get.</p>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft />
              Back
            </Button>
            <Button onClick={() => (giftIds.length === 0 ? setGiftError(true) : goTo(2))}>
              Next: review
              <ArrowRight />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && basics && (
        <SectionCard title="Review" className="max-w-3xl">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Campaign name</dt>
              <dd className="text-base font-medium">{basics.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Purpose</dt>
              <dd className="text-sm">{humanize(basics.purpose)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recipients</dt>
              <dd className="text-sm">{humanize(basics.recipientCategory)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="mb-2 text-xs text-muted-foreground">Gift(s)</dt>
              <dd className="flex flex-wrap gap-2">
                {selectedGifts.map((g) => (
                  <span key={g.id} className="flex items-center gap-2 rounded-md border bg-muted/40 py-1 pr-3 pl-1 text-sm">
                    <GiftThumbnail gift={g} size={28} />
                    {g.name}
                  </span>
                ))}
              </dd>
            </div>
            {basics.instructions && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Instructions</dt>
                <dd className="text-sm whitespace-pre-line">{basics.instructions}</dd>
              </div>
            )}
          </dl>
          <div className="mt-5 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft />
              Back
            </Button>
            <Button loading={createCampaign.isPending} onClick={() => void create()}>
              <Check />
              Create campaign
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  )
}
