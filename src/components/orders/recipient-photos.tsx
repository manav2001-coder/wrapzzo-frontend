import type { RecipientPhoto } from '@/api/orders'
import { cn } from '@/lib/utils'

/**
 * The recipient's photos of an order, each a thumbnail that opens full size, with the name it downloads as (the
 * PCODE_AMCODE_photo name). Renders nothing for an empty list -- the caller says there is no photo.
 */
export function RecipientPhotos({ photos, size = 'h-28 w-28', className }: { photos: RecipientPhoto[]; size?: string; className?: string }) {
  if (photos.length === 0) return null
  return (
    <ul className={cn('flex flex-wrap gap-3', className)}>
      {photos.map((photo, index) => (
        <li key={photo.url} className="w-fit max-w-full">
          <a href={photo.url} target="_blank" rel="noreferrer" className="block">
            <img src={photo.url} alt={photo.fileName || `Photo ${index + 1}`} className={cn('rounded-md border object-cover', size)} />
          </a>
          {photo.fileName && <p className="mt-1 max-w-28 truncate font-mono text-[10px] text-muted-foreground" title={photo.fileName}>{photo.fileName}</p>}
        </li>
      ))}
    </ul>
  )
}
