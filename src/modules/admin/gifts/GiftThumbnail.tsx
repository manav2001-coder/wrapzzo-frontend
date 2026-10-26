import { Gift as GiftIcon } from 'lucide-react'

import type { Gift } from '@/api/gifts'

/** The gift's first image, or a gift icon on a tinted tile when it has none. */
export function GiftThumbnail({ gift, size = 36 }: { gift: Pick<Gift, 'images'>; size?: number }) {
  const cover = [...gift.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]
  return cover ? (
    <img src={cover.imageUrl} alt="" className="shrink-0 rounded-md border object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-md bg-primary/10 text-primary" style={{ width: size, height: size }}>
      <GiftIcon className="h-4 w-4" />
    </span>
  )
}
