import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Card } from 'primereact/card'
import { Dropdown } from 'primereact/dropdown'
import { InputText } from 'primereact/inputtext'
import { InputTextarea } from 'primereact/inputtextarea'
import { Steps } from 'primereact/steps'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import type { CampaignPurpose, CampaignRecipientCategory } from '@/api/campaigns'
import { useActiveGifts } from '@/hooks/useGifts'
import { PageHeader } from '@/components/PageHeader'
import { useCreateCampaign } from '@/hooks/useCampaigns'
import { humanize } from '@/lib/format'
import { showApiError, showToast } from '@/lib/toast'
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

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  purpose: z.enum(PURPOSE_OPTIONS as [CampaignPurpose, ...CampaignPurpose[]], { message: 'Purpose is required' }),
  recipientCategory: z.enum(RECIPIENT_OPTIONS as [CampaignRecipientCategory, ...CampaignRecipientCategory[]], {
    message: 'Recipient category is required',
  }),
  giftIds: z.array(z.string()).min(1, 'Pick at least one gift -- a campaign has no purpose without one'),
  instructions: z.string().optional(),
  submissionDeadline: z.date().optional().nullable(),
})

type CampaignFormValues = z.infer<typeof campaignSchema>

const STEPS = [{ label: 'Basics' }, { label: 'Choose gift(s)' }, { label: 'Review & create' }]

export function CampaignWizardPage() {
  const navigate = useNavigate()
  const createCampaign = useCreateCampaign()
  const { data: gifts } = useActiveGifts()
  const [step, setStep] = useState(0)
  const [furthestStep, setFurthestStep] = useState(0)

  const {
    control,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: '', instructions: '', giftIds: [], submissionDeadline: null },
  })

  const values = watch()
  const selectedGifts = (gifts ?? []).filter((g) => values.giftIds.includes(g.id))

  async function goNext() {
    if (step === 0) {
      const valid = await trigger(['name', 'purpose', 'recipientCategory'])
      if (!valid) return
    }
    if (step === 1) {
      const valid = await trigger('giftIds')
      if (!valid) return
    }
    const next = Math.min(step + 1, STEPS.length - 1)
    setStep(next)
    setFurthestStep((f) => Math.max(f, next))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function onSubmit(formValues: CampaignFormValues) {
    try {
      const campaign = await createCampaign.mutateAsync({
        name: formValues.name,
        purpose: formValues.purpose,
        recipientCategory: formValues.recipientCategory,
        giftIds: formValues.giftIds,
        instructions: formValues.instructions || undefined,
        submissionDeadline: formValues.submissionDeadline ? formValues.submissionDeadline.toISOString() : undefined,
      })
      showToast({ severity: 'success', summary: 'Campaign created', detail: 'Next, set who can submit into it and activate it.' })
      navigate(`/campaigns/${campaign.id}`, { replace: true })
    } catch (error) {
      showApiError(error)
    }
  }

  return (
    <div>
      <PageHeader title="New campaign" subtitle="Set up the basics, pick your gift(s), then review and create." backTo="/campaigns" />

      <div className="mb-6">
        <Steps
          model={STEPS.map((s, i) => ({ label: s.label, command: () => i <= furthestStep && setStep(i) }))}
          activeIndex={step}
          readOnly={false}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 0 && (
          <Card className="max-w-2xl">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium text-text">
                  Campaign name
                </label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <InputText id="name" {...field} className={errors.name ? 'p-invalid' : ''} placeholder="Product Launch - Mugs" />
                  )}
                />
                {errors.name && <small className="text-red-500 dark:text-red-400">{errors.name.message}</small>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="purpose" className="text-sm font-medium text-text">
                    Purpose
                  </label>
                  <Controller
                    name="purpose"
                    control={control}
                    render={({ field }) => (
                      <Dropdown
                        inputId="purpose"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        options={PURPOSE_OPTIONS.map((value) => ({ label: humanize(value), value }))}
                        placeholder="Select purpose"
                        className={errors.purpose ? 'p-invalid w-full' : 'w-full'}
                      />
                    )}
                  />
                  {errors.purpose && <small className="text-red-500 dark:text-red-400">{errors.purpose.message}</small>}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="recipientCategory" className="text-sm font-medium text-text">
                    Recipient category
                  </label>
                  <Controller
                    name="recipientCategory"
                    control={control}
                    render={({ field }) => (
                      <Dropdown
                        inputId="recipientCategory"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        options={RECIPIENT_OPTIONS.map((value) => ({ label: humanize(value), value }))}
                        placeholder="Select recipients"
                        className={errors.recipientCategory ? 'p-invalid w-full' : 'w-full'}
                      />
                    )}
                  />
                  {errors.recipientCategory && (
                    <small className="text-red-500 dark:text-red-400">{errors.recipientCategory.message}</small>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="instructions" className="text-sm font-medium text-text">
                  Instructions for your team
                </label>
                <Controller
                  name="instructions"
                  control={control}
                  render={({ field }) => (
                    <InputTextarea id="instructions" {...field} rows={3} placeholder="Optional" className="w-full" />
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:w-64">
                <label htmlFor="submissionDeadline" className="text-sm font-medium text-text">
                  Submission deadline
                </label>
                <Controller
                  name="submissionDeadline"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      inputId="submissionDeadline"
                      value={field.value ?? undefined}
                      onChange={(e) => field.onChange(e.value ?? null)}
                      dateFormat="dd M yy"
                      showIcon
                      placeholder="Optional"
                    />
                  )}
                />
              </div>

              <div className="mt-2 flex justify-end">
                <Button type="button" label="Next: Choose gift(s)" icon="pi pi-arrow-right" iconPos="right" onClick={goNext} />
              </div>
            </div>
          </Card>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Controller
              name="giftIds"
              control={control}
              render={({ field }) => <CampaignGiftPicker selectedIds={field.value} onChange={field.onChange} />}
            />
            {errors.giftIds && <small className="text-red-500 dark:text-red-400">{errors.giftIds.message}</small>}
            <p className="text-sm text-text-muted">
              If you select more than one, the field user picks which one each recipient gets when they submit.
            </p>

            <div className="flex justify-between">
              <Button type="button" label="Back" icon="pi pi-arrow-left" text onClick={goBack} />
              <Button type="button" label="Next: Review" icon="pi pi-arrow-right" iconPos="right" onClick={goNext} />
            </div>
          </div>
        )}

        {step === 2 && (
          <Card className="max-w-2xl">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs text-text-muted">Campaign name</p>
                <p className="text-base font-medium text-text">{values.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Purpose</p>
                  <p className="text-sm text-text">{humanize(values.purpose)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Recipients</p>
                  <p className="text-sm text-text">{humanize(values.recipientCategory)}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-text-muted">Gift(s)</p>
                <div className="flex flex-wrap gap-3">
                  {selectedGifts.map((g) => {
                    const cover = [...g.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]
                    return (
                      <div key={g.id} className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted py-1 pr-3 pl-1">
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-surface">
                          {cover && <img src={cover.imageUrl} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <span className="text-sm text-text">{g.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {values.instructions && (
                <div>
                  <p className="text-xs text-text-muted">Instructions</p>
                  <p className="text-sm text-text">{values.instructions}</p>
                </div>
              )}
              {values.submissionDeadline && (
                <div>
                  <p className="text-xs text-text-muted">Deadline</p>
                  <p className="text-sm text-text">{values.submissionDeadline.toLocaleDateString()}</p>
                </div>
              )}

              <div className="mt-2 flex justify-between">
                <Button type="button" label="Back" icon="pi pi-arrow-left" text onClick={goBack} />
                <Button type="submit" label="Create campaign" icon="pi pi-check" loading={createCampaign.isPending} />
              </div>
            </div>
          </Card>
        )}
      </form>
    </div>
  )
}
