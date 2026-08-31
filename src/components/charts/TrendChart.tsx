import Highcharts from 'highcharts'
import { HighchartsReact } from 'highcharts-react-official'
import { useMemo } from 'react'
import { fadeGradient, useChartTheme } from './chartTheme'

export interface TrendSeries {
  name: string
  data: number[]
  color: string
  /** Stable identifier for the series (e.g. "CAMPAIGN") -- passed back to onSelect so a click knows which line was clicked, not just which week. */
  key: string
}

/** A themed, responsive trend line -- e.g. weekly campaign submissions vs. Quick Gift requests. */
export function TrendChart({
  categories,
  series,
  height = 280,
  onSelect,
}: {
  categories: string[]
  series: TrendSeries[]
  height?: number
  /** Fired with the clicked point's category index and its series' key (e.g. to drill into that week for just that series). */
  onSelect?: (index: number, seriesKey: string) => void
}) {
  const { textColor, mutedColor, gridColor } = useChartTheme()
  const hasData = series.some((s) => s.data.some((v) => v > 0))

  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: { type: 'areaspline', backgroundColor: 'transparent', height, style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories,
        labels: { style: { color: mutedColor, fontSize: '11px' } },
        lineColor: gridColor,
        tickColor: gridColor,
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: gridColor,
        allowDecimals: false,
        min: 0,
        labels: { style: { color: mutedColor, fontSize: '11px' } },
      },
      legend: {
        itemStyle: { color: textColor, fontSize: '12px', fontWeight: '500' },
        itemHoverStyle: { color: textColor },
        symbolRadius: 6,
      },
      tooltip: { shared: true },
      plotOptions: {
        areaspline: {
          lineWidth: 3,
          fillOpacity: 1,
          marker: { enabled: false, radius: 4, lineWidth: 2, lineColor: '#ffffff', states: { hover: { enabled: true } } },
          states: { hover: { lineWidth: 3.5 } },
          cursor: onSelect ? 'pointer' : undefined,
          point: onSelect
            ? {
                events: {
                  click: function (this: Highcharts.Point) {
                    const key = (this.series.options as Highcharts.SeriesAreasplineOptions & { custom?: { key: string } }).custom?.key
                    if (key) onSelect(this.index, key)
                  },
                },
              }
            : undefined,
        },
      },
      series: series.map((s) => ({
        type: 'areaspline',
        name: s.name,
        data: s.data,
        color: s.color,
        fillColor: fadeGradient(s.color),
        custom: { key: s.key },
      })),
    }),
    [categories, series, height, textColor, mutedColor, gridColor, onSelect],
  )

  if (!hasData) {
    return (
      <div className="grid place-items-center text-sm text-text-muted" style={{ height }}>
        No activity in this period.
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { width: '100%' } }} />
    </div>
  )
}
