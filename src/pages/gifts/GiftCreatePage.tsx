import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { createGift } from '../../api/gifts'
import type { OutletContext } from '../../layouts/AppShell'

export function GiftCreatePage() {
  const { accessToken, onError } = useOutletContext<OutletContext>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [moq, setMoq] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !category.trim()) return
    try {
      const gift = await createGift(accessToken, {
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        moq: moq ? Number(moq) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
      })
      navigate(`/gifts/${gift.id}`)
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="card">
      <h2>Add gift</h2>
      <form className="stacked-form" onSubmit={handleSubmit}>
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          Category
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="field">
          Description (optional)
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label className="field">
          MOQ (optional)
          <input type="number" min="1" value={moq} onChange={(e) => setMoq(e.target.value)} />
        </label>
        <label className="field">
          Lead time in days (optional)
          <input type="number" min="1" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit">
            Create
          </button>
          <button className="btn" type="button" onClick={() => navigate('/gifts')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
