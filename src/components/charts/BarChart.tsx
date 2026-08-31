import Highcharts from 'highcharts'
import { HighchartsReact } from 'highcharts-react-official'
import { useMemo } from 'react'
import { barGradient, useChartTheme } from './chartTheme'

export interface BarRow {
  label: string
  value: number
  /** If set, a click navigates here instead of calling onSelect. */
  to?: string
}

/** A themed, responsive horizontal bar ranking -- e.g. top gifts/campaigns/departments by order count. */
export function BarChart({
  rows,
  color,
  empty,
  onSelect,
}: {
  rows: BarRow[]
  color: string
  empty: string
  /** Called with the clicked row (whether or not it has a `to`) -- the caller decides what "select" means. */
  onSelect?: (row: BarRow) => void
}) {
  const { textColor, mutedColor, gridColor } = useChartTheme()
  const height = Math.max(140, rows.length * 42 + 20)
  const clickable = Boolean(onSelect)

  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: 'bar', backgroundColor: 'transparent', height, style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: rows.map((r) => r.label),
        labels: { style: { color: textColor, fontSize: '12px' } },
        lineColor: gridColor,
        tickColor: gridColor,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: gridColor,
        allowDecimals: false,
        labels: { style: { color: mutedColor, fontSize: '11px' } },
      },
      legend: { enabled: false },
      tooltip: { pointFormat: '<b>{point.y}</b>' },
      plotOptions: {
        bar: {
          borderRadius: 6,
          borderWidth: 0,
          color: barGradient(color),
          dataLabels: { enabled: true, style: { color: textColor, fontSize: '12px', fontWeight: '600', textOutline: 'none' } },
          cursor: clickable ? 'pointer' : undefined,
          point: {
            events: clickable
              ? {
                  click() {
                    const row = rows[this.index]
                    if (row) onSelect?.(row)
                  },
                }
              : undefined,
          },
        },
      },
      series: [{ type: 'bar', name: 'Orders', data: rows.map((r) => r.value), dataLabels: { enabled: true } }],
    }),
    [rows, height, color, textColor, mutedColor, gridColor, clickable, onSelect],
  )

  if (rows.length === 0) {
    return (
      <div className="grid place-items-center py-6 text-sm text-text-muted" style={{ minHeight: 140 }}>
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
