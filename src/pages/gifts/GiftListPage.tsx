import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { listGifts, type Gift } from '../../api/gifts'
import type { OutletContext } from '../../layouts/AppShell'

export function GiftListPage() {
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const [gifts, setGifts] = useState<Gift[]>([])

  useEffect(() => {
    listGifts(accessToken)
      .then(setGifts)
      .catch((err) => onError(err instanceof Error ? err.message : String(err)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  return (
    <div>
      <div className="page-header">
        <h2>Gift Store</h2>
        <Link className="btn btn-primary" to="/gifts/new">
          + Add gift
        </Link>
      </div>

      <div className="gift-grid">
        {gifts.map((gift) => {
          const cover = gift.images.at(-1)
          return (
            <Link key={gift.id} to={`/gifts/${gift.id}`} className="gift-card">
              <div className="gift-card-image">
                {cover ? <img src={cover.imageUrl} alt={gift.name} /> : <span className="gift-card-image-empty">No image</span>}
              </div>
              <div className="gift-card-body">
                <span className="gift-card-name">{gift.name}</span>
                <span className={`badge ${gift.active ? 'badge-active' : 'badge-inactive'}`}>
                  {gift.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </Link>
          )
        })}
        {gifts.length === 0 && <p className="app-subtitle">No gifts yet.</p>}
      </div>
    </div>
  )
}
