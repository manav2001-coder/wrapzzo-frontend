import { Chart } from 'primereact/chart'
import { useAppSelector } from '@/app/hooks'
import { humanize } from '@/lib/format'
import { resolveTheme } from '@/lib/theme'
import { statusColor } from '@/lib/statusColors'

export function StatusDonutChart({ counts }: { counts: Record<string, number> }) {
  const themePreference = useAppSelector((state) => state.ui.theme)
  const dark = resolveTheme(themePreference) === 'dark'
  const mutedColor = dark ? '#64748b' : '#94a3b8'

  const entries = Object.entries(counts).filter(([, count]) => count > 0)
  if (entries.length === 0) {
    return <div className="grid h-48 place-items-center text-sm text-text-muted">No data yet</div>
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const height = 192

  const data = {
    labels: entries.map(([status]) => humanize(status)),
    datasets: [
      {
        data: entries.map(([, count]) => count),
        backgroundColor: entries.map(([status]) => statusColor(status)),
        borderWidth: 3,
        borderColor: dark ? '#14171e' : '#ffffff',
      },
    ],
  }

  const options = {
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    cutout: '72%',
    responsive: true,
    maintainAspectRatio: false,
  }

  // PrimeReact's own .p-chart wrapper has no intrinsic height of its own -- without an
  // explicit height here Chart.js's ResizeObserver measures an unconstrained ancestor and
  // the canvas balloons to its default (much taller than intended, worst on narrow/mobile
  // viewports where there's no wide ancestor to implicitly cap it via aspect ratio).
  return (
    <div>
      <div className="relative" style={{ height, width: '100%' }}>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-text">{total}</span>
          <span className="text-[10px] font-medium tracking-wide text-text-muted uppercase" style={{ color: mutedColor }}>
            Total
          </span>
        </div>
        <Chart type="doughnut" data={data} options={options} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {entries.map(([status, count]) => (
          <div key={status} className="flex items-center gap-1.5 text-xs font-medium text-text">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor(status) }} />
            {humanize(status)}
            <span style={{ color: mutedColor }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
