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

/** A themed, responsive donut -- Highcharts binds its own window-resize reflow, so this just needs a height-constrained, full-width container (same convention as every other chart in the app). */
export function DonutChart({
  slices,
  height = 220,
  empty,
  onSelect,
}: {
  slices: DonutSlice[]
  height?: number
  empty: string
  /** Called with a slice's raw key when clicked. */
  onSelect?: (key: string) => void
}) {
  const { textColor, dark } = useChartTheme()
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: 'pie', backgroundColor: 'transparent', height, style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      tooltip: { pointFormat: '<b>{point.y}</b> ({point.percentage:.0f}%)' },
      legend: { itemStyle: { color: textColor, fontSize: '12px' }, itemHoverStyle: { color: textColor } },
      plotOptions: {
        pie: {
          innerSize: '68%',
          borderWidth: 2,
          borderColor: dark ? '#1e293b' : '#ffffff',
          dataLabels: { enabled: false },
          cursor: onSelect ? 'pointer' : undefined,
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
    [slices, height, textColor, dark, onSelect],
  )

  if (total === 0) {
    return (
      <div className="grid place-items-center text-sm text-text-muted" style={{ height }}>
        {empty}
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { width: '100%' } }} />
    </div>
  )
}
