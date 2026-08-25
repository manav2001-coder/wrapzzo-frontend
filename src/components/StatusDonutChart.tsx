import { Chart } from 'primereact/chart'
import { useAppSelector } from '@/app/hooks'
import { humanize } from '@/lib/format'
import { resolveTheme } from '@/lib/theme'
import { statusColor } from '@/lib/statusColors'

export function StatusDonutChart({ counts }: { counts: Record<string, number> }) {
  const themePreference = useAppSelector((state) => state.ui.theme)
  const dark = resolveTheme(themePreference) === 'dark'
  const textColor = dark ? '#cbd5e1' : '#475569'

  const entries = Object.entries(counts).filter(([, count]) => count > 0)
  if (entries.length === 0) {
    return <div className="grid h-48 place-items-center text-sm text-text-muted">No data yet</div>
  }

  const data = {
    labels: entries.map(([status]) => humanize(status)),
    datasets: [
      {
        data: entries.map(([, count]) => count),
        backgroundColor: entries.map(([status]) => statusColor(status)),
        borderWidth: 0,
      },
    ],
  }

  const options = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: textColor, usePointStyle: true, padding: 12, boxWidth: 8 },
      },
    },
    cutout: '65%',
    responsive: true,
    maintainAspectRatio: false,
  }

  // PrimeReact's own .p-chart wrapper has no intrinsic height of its own -- without an
  // explicit height here Chart.js's ResizeObserver measures an unconstrained ancestor and
  // the canvas balloons to its default (much taller than intended, worst on narrow/mobile
  // viewports where there's no wide ancestor to implicitly cap it via aspect ratio).
  return (
    <div style={{ height: '192px', width: '100%', position: 'relative' }}>
      <Chart type="doughnut" data={data} options={options} style={{ height: '100%', width: '100%' }} />
    </div>
  )
}
