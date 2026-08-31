import Highcharts from 'highcharts'
import { HighchartsReact } from 'highcharts-react-official'
import { useMemo } from 'react'
import { useChartTheme } from './chartTheme'

export interface DonutSlice {
  name: string
  value: number
  color: string
  /** Raw backend key for this slice (e.g. "QUICK_GIFT"), passed to onSelect -- name is just the display label. */
  key: string
}

/** A themed, responsive donut with the total count centered inside the ring -- the single most useful number in
 * the chart, given a place of its own instead of being left implicit. Highcharts binds its own window-resize
 * reflow, so this just needs a height-constrained, full-width container (same convention as every other chart). */
export function DonutChart({
  slices,
  height = 240,
  empty,
  onSelect,
}: {
  slices: DonutSlice[]
  height?: number
  empty: string
  /** Called with a slice's raw key when clicked. */
  onSelect?: (key: string) => void
}) {
  const { mutedColor, dark } = useChartTheme()
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: 'pie', backgroundColor: 'transparent', height, style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      tooltip: { pointFormat: '<b>{point.y}</b> ({point.percentage:.0f}%)' },
      // Own legend rendered in React below the chart instead -- keeps the pie's center
      // (where the total is overlaid) at a fixed, predictable height/2 regardless of
      // how many legend rows Highcharts would otherwise need to reflow around.
      legend: { enabled: false },
      plotOptions: {
        pie: {
          innerSize: '72%',
          borderWidth: 3,
          borderColor: dark ? '#14171e' : '#ffffff',
          dataLabels: { enabled: false },
          cursor: onSelect ? 'pointer' : undefined,
          states: { hover: { halo: { size: 6 } } },
          point: {
            events: onSelect
              ? {
                  click() {
                    const key = slices[this.index]?.key
                    if (key) onSelect(key)
                  },
                }
              : undefined,
          },
        },
      },
      series: [
        {
          type: 'pie',
          name: 'Count',
          data: slices.map((s) => ({ name: s.name, y: s.value, color: s.color })),
        },
      ],
    }),
    [slices, height, dark, onSelect],
  )

  if (total === 0) {
    return (
      <div className="grid place-items-center text-sm text-text-muted" style={{ height }}>
        {empty}
      </div>
    )
  }

  return (
    <div className="relative" style={{ width: '100%' }}>
      <div
        className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
        style={{ top: height / 2 - 22 }}
      >
        <span className="text-2xl font-bold tracking-tight text-text">{total}</span>
        <span className="text-[10px] font-medium tracking-wide text-text-muted uppercase" style={{ color: mutedColor }}>
          Total
        </span>
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { width: '100%' } }} />
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {slices.map((slice) => (
          <button
            key={slice.key}
            type="button"
            onClick={() => onSelect?.(slice.key)}
            disabled={!onSelect}
            className={`flex items-center gap-1.5 rounded-full border-none bg-transparent p-0 text-xs font-medium ${onSelect ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
            style={{ color: 'var(--color-text)' }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
            {slice.name}
            <span style={{ color: mutedColor }}>{slice.value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
