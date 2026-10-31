import userEvent from '@testing-library/user-event'
import { Navigate, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/lib/axiosClient'
import { renderWithProviders, screen } from '@/test/test-utils'
import { LoginPage } from './LoginPage'

const login = vi.hoisted(() => vi.fn())
const vendorLogin = vi.hoisted(() => vi.fn())
vi.mock('@/api/auth', () => ({ login, getCurrentUser: vi.fn() }))
vi.mock('@/api/vendorAuth', () => ({ vendorLogin }))

const TOKENS = { accessToken: 'h.eyJzdWIiOiJ1MSJ9.s', refreshToken: 'r', expiresInSeconds: 900 }

function renderLogin(route = '/login') {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/bounced" element={<Navigate to="/login" replace state={{ from: { pathname: '/campaigns' } }} />} />
      <Route path="/home" element={<h1>Home</h1>} />
      <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      <Route path="/campaigns" element={<h1>Campaigns</h1>} />
      <Route path="/vendor" element={<h1>Vendor portal</h1>} />
    </Routes>,
    { route },
  )
}

async function signIn(email = 'priya@acme.com', password = 'secret') {
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    login.mockReset()
    vendorLogin.mockReset()
  })

  it('validates before calling the API', async () => {
    renderLogin()
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email is required')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('signs a company user in and lands on their first menu', async () => {
    login.mockResolvedValue(TOKENS)
    const { store } = renderLogin()
    await signIn()
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(store.getState().auth.user?.email).toBe('priya@acme.com')
  })

  it('always opens the first menu, not the page the visitor was bounced from', async () => {
    login.mockResolvedValue(TOKENS)
    renderLogin('/bounced')
    await signIn()
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Campaigns' })).not.toBeInTheDocument()
  })

  it('falls back to the vendor portal when the email is not a user', async () => {
    login.mockRejectedValue(new ApiError('Invalid credentials', 401))
    vendorLogin.mockResolvedValue(TOKENS)
    const { store } = renderLogin()
    await signIn('orders@printhouse.in')
    expect(await screen.findByRole('heading', { name: 'Vendor portal' })).toBeInTheDocument()
    expect(store.getState().vendorAuth.vendor?.email).toBe('orders@printhouse.in')
  })

  it('says the credentials are wrong when neither identity accepts them', async () => {
    login.mockRejectedValue(new ApiError('Invalid credentials', 401))
    vendorLogin.mockRejectedValue(new ApiError('Invalid credentials', 401))
    renderLogin()
    await signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })

  it('reports a locked account without trying the vendor login', async () => {
    login.mockRejectedValue(new ApiError('Locked', 423, { lockedUntil: '2026-10-26T18:00:00Z' }))
    renderLogin()
    await signIn()
    expect(await screen.findByRole('alert')).toHaveTextContent(/locked until/i)
    expect(vendorLogin).not.toHaveBeenCalled()
  })
})
