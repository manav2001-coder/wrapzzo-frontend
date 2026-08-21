import { Button } from 'primereact/button'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
      <span className="text-5xl font-bold text-accent">404</span>
      <h1 className="text-lg font-semibold text-text">Page not found</h1>
      <p className="max-w-sm text-sm text-text-muted">The page you're looking for doesn't exist or has been moved.</p>
      <Button label="Go to dashboard" onClick={() => navigate('/admin')} className="mt-2" />
    </div>
  )
}
