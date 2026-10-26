import { fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RootState } from '@/app/store'
import { renderWithProviders, screen } from '@/test/test-utils'
import { LandingPage } from './LandingPage'
import { NotFoundPage } from './NotFoundPage'
import { RecipientUploadPage } from './RecipientUploadPage'

const getRecipientUploadDetails = vi.hoisted(() => vi.fn())
const uploadRecipientPhoto = vi.hoisted(() => vi.fn())
vi.mock('@/api/recipientUpload', () => ({ getRecipientUploadDetails, uploadRecipientPhoto }))

const DETAILS = {
  recipientName: 'Asha',
  companyName: 'Acme',
  giftName: 'Desk Plant',
  giftDescription: 'A small succulent',
  giftImageUrls: [],
  alreadyUploaded: false,
}

/** An axios failure carrying the backend's `{ error }` body, as the public endpoints send it. */
function apiError(message: string) {
  const headers = new AxiosHeaders()
  return new AxiosError('fail', 'ERR_BAD_REQUEST', { headers }, null, {
    status: 410,
    statusText: 'Gone',
    headers: {},
    config: { headers },
    data: { error: message },
  })
}

function renderUpload(route = '/recipient-upload/tok-1', kind?: 'quick-gift') {
  return renderWithProviders(
    <Routes>
      <Route path="/recipient-upload/:token" element={<RecipientUploadPage />} />
      <Route path="/quick-gift-upload/:token" element={<RecipientUploadPage kind={kind} />} />
      <Route path="/recipient-upload" element={<RecipientUploadPage />} />
    </Routes>,
    { route },
  )
}

function pickPhoto() {
  const file = new File(['x'], 'me.png', { type: 'image/png' })
  fireEvent.change(screen.getByTestId('photo-input'), { target: { files: [file] } })
  return file
}

describe('LandingPage', () => {
  function renderLanding(preloadedState?: Partial<RootState>) {
    return renderWithProviders(
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<h1>Sign in</h1>} />
        <Route path="/admin/companies" element={<h1>Companies</h1>} />
        <Route path="/vendor" element={<h1>Vendor portal</h1>} />
      </Routes>,
      { route: '/', preloadedState },
    )
  }

  it('shows the hero and every solution to a signed-out visitor', () => {
    renderLanding()
    expect(screen.getByRole('heading', { level: 1, name: /gifting platform for every relationship/i })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(8)
  })

  it('sends the visitor to sign-in from the hero', async () => {
    renderLanding()
    await userEvent.click(screen.getAllByRole('link', { name: /^log in/i })[0])
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('forwards a signed-in user past the landing page', () => {
    renderLanding({ auth: { accessToken: 't', refreshToken: 'r', user: { email: 'a@b.c', sub: 'u1' }, rememberMe: true } })
    expect(screen.getByRole('heading', { name: 'Companies' })).toBeInTheDocument()
  })

  it('forwards a signed-in vendor to the vendor portal', () => {
    renderLanding({ vendorAuth: { accessToken: 't', refreshToken: 'r', vendor: { email: 'v@b.c', sub: 'v1' }, rememberMe: true } })
    expect(screen.getByRole('heading', { name: 'Vendor portal' })).toBeInTheDocument()
  })
})

describe('NotFoundPage', () => {
  it('links home to the landing page', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<h1>Home</h1>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>,
      { route: '/nowhere' },
    )
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Go to home' }))
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })
})

describe('RecipientUploadPage', () => {
  beforeEach(() => {
    getRecipientUploadDetails.mockReset()
    uploadRecipientPhoto.mockReset()
    URL.createObjectURL = vi.fn(() => 'blob:preview')
    URL.revokeObjectURL = vi.fn()
  })

  it('names the company, recipient and gift, and needs a photo before sending', async () => {
    getRecipientUploadDetails.mockResolvedValue(DETAILS)
    renderUpload()
    expect(await screen.findByRole('heading', { name: 'Acme has a gift for you, Asha!' })).toBeInTheDocument()
    expect(screen.getByText('Desk Plant')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send my photo' })).toBeDisabled()
    expect(getRecipientUploadDetails).toHaveBeenCalledWith('tok-1', 'recipient')
  })

  it('uploads the picked photo and thanks the recipient', async () => {
    getRecipientUploadDetails.mockResolvedValue(DETAILS)
    uploadRecipientPhoto.mockResolvedValue(undefined)
    renderUpload()
    await screen.findByRole('heading', { name: /has a gift for you/ })
    const file = pickPhoto()
    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', 'blob:preview')
    await userEvent.click(screen.getByRole('button', { name: 'Send my photo' }))
    expect(await screen.findByRole('heading', { name: 'Thank you!' })).toBeInTheDocument()
    expect(screen.getByText(/Acme will use it to get your Desk Plant ready/)).toBeInTheDocument()
    expect(uploadRecipientPhoto).toHaveBeenCalledWith('tok-1', file, 'recipient')
  })

  it("shows the server's reason when the upload fails, and keeps the form", async () => {
    getRecipientUploadDetails.mockResolvedValue(DETAILS)
    uploadRecipientPhoto.mockRejectedValue(apiError('File too large'))
    renderUpload()
    await screen.findByRole('heading', { name: /has a gift for you/ })
    pickPhoto()
    await userEvent.click(screen.getByRole('button', { name: 'Send my photo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('File too large')
    expect(screen.getByRole('button', { name: 'Send my photo' })).toBeEnabled()
  })

  it('uses the quick-gift endpoint for a quick-gift link', async () => {
    getRecipientUploadDetails.mockResolvedValue({ ...DETAILS, recipientName: null })
    renderUpload('/quick-gift-upload/qg-9', 'quick-gift')
    expect(await screen.findByRole('heading', { name: 'Acme has a gift for you!' })).toBeInTheDocument()
    expect(getRecipientUploadDetails).toHaveBeenCalledWith('qg-9', 'quick-gift')
  })

  it('goes straight to thanks when the photo is already in', async () => {
    getRecipientUploadDetails.mockResolvedValue({ ...DETAILS, giftName: null, alreadyUploaded: true })
    renderUpload()
    expect(await screen.findByRole('heading', { name: 'Thank you!' })).toBeInTheDocument()
    expect(screen.getByText(/get your gift ready/)).toBeInTheDocument()
  })

  it("explains a dead link with the server's reason", async () => {
    getRecipientUploadDetails.mockRejectedValue(apiError('This link has expired.'))
    renderUpload()
    expect(await screen.findByRole('heading', { name: "This link isn't valid anymore" })).toBeInTheDocument()
    expect(screen.getByText('This link has expired.')).toBeInTheDocument()
  })

  it('falls back to a generic reason when the failure carries none', async () => {
    getRecipientUploadDetails.mockRejectedValue(new Error('network'))
    renderUpload()
    await waitFor(() => expect(screen.getByText('It may have expired or already been used.')).toBeInTheDocument())
  })
})
