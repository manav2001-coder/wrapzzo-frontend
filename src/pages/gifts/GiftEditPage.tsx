import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  activateGift,
  deactivateGift,
  deleteGiftImage,
  getGift,
  updateGift,
  uploadGiftImage,
  type Gift,
} from '../../api/gifts'
import type { OutletContext } from '../../layouts/AppShell'

export function GiftEditPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const navigate = useNavigate()

  const [gift, setGift] = useState<Gift | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [moq, setMoq] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('')

  async function load() {
    if (!id) return
    try {
      const loaded = await getGift(accessToken, id)
      setGift(loaded)
      setName(loaded.name)
      setCategory(loaded.category)
      setDescription(loaded.description ?? '')
      setMoq(loaded.moq?.toString() ?? '')
      setLeadTimeDays(loaded.leadTimeDays?.toString() ?? '')
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, accessToken])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!id || !name.trim() || !category.trim()) return
    try {
      const updated = await updateGift(accessToken, id, {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        moq: moq ? Number(moq) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      })
      setGift(updated)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleToggleActive() {
    if (!id || !gift) return
    try {
      setGift(gift.active ? await deactivateGift(accessToken, id) : await activateGift(accessToken, id))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!id || !file) return
    try {
      setGift(await uploadGiftImage(accessToken, id, file))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!id) return
    try {
      setGift(await deleteGiftImage(accessToken, id, imageId))
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  if (!gift) return null

  return (
    <div>
      <div className="page-header">
        <h2>{gift.name}</h2>
        <div className="btn-row" style={{ marginBottom: 0 }}>
          <button className="btn" onClick={handleToggleActive}>
            {gift.active ? 'Deactivate' : 'Activate'}
          </button>
          <button className="btn" onClick={() => navigate('/gifts')}>
            Back to list
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Images</h2>
        <div className="image-gallery">
          {gift.images.map((image) => (
            <div key={image.id} className="image-gallery-item">
              <img src={image.imageUrl} alt={gift.name} />
              <button className="btn" onClick={() => handleDeleteImage(image.id)}>
                Remove
              </button>
            </div>
          ))}
          <label className="btn">
            Upload image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleImageSelected}
              hidden
            />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>Details</h2>
        <form className="stacked-form" onSubmit={handleSave}>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label className="field">
            Description
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="field">
            MOQ
            <input type="number" min="1" value={moq} onChange={(e) => setMoq(e.target.value)} />
          </label>
          <label className="field">
            Lead time in days
            <input type="number" min="1" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
          </label>
          <button className="btn btn-primary" type="submit">
            Save
          </button>
        </form>
      </div>
    </div>
  )
}
