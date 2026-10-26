import { Megaphone, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { GiftCatalogue } from '@/components/gifts/gift-catalogue'
import { MasterPageHeader } from '@/components/masters/master-page'
import { Button } from '@/components/ui/button'
import { useActiveGifts } from '@/hooks/useGifts'
import { useHasAccess } from '@/hooks/use-permission'

/** The company's catalogue: every gift from the vendors serving the user, sendable now or as a campaign. */
export function GiftStorePage() {
  const { t } = useTranslation('gifts')
  const navigate = useNavigate()
  const { data: gifts, isLoading } = useActiveGifts()
  const canQuickGift = useHasAccess('quickgift.create')
  const canLaunchCampaign = useHasAccess('campaign.manage')

  return (
    <div>
      <MasterPageHeader title={t('store.title')} description={t('store.subtitle')} />
      <GiftCatalogue
        gifts={gifts}
        isLoading={isLoading}
        renderActions={(gift) =>
          canQuickGift || canLaunchCampaign ? (
            <>
              {canQuickGift && (
                <Button size="sm" onClick={() => navigate(`/quick-gift/new/${gift.id}`)}>
                  <Zap />
                  {t('store.quickGift')}
                </Button>
              )}
              {canLaunchCampaign && (
                <Button size="sm" variant="outline" onClick={() => navigate('/campaigns/new', { state: { initialGiftId: gift.id } })}>
                  <Megaphone />
                  {t('store.launchCampaign')}
                </Button>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">{t('store.notAvailable')}</span>
          )
        }
      />
    </div>
  )
}
