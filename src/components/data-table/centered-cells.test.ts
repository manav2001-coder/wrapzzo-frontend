import { describe, expect, it } from 'vitest'

// Every table centres its values under the column title. A screen that says `align: 'left'` or
// `'right'` on a column quietly breaks that, so none may.
const sources = import.meta.glob<string>(['/src/modules/**/*.tsx', '/src/pages/**/*.tsx'], { query: '?raw', import: 'default', eager: true })

describe('table cell alignment', () => {
  it('no column overrides the centred default', () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => !path.endsWith('.test.tsx'))
      .filter(([, source]) => /align:\s*['"](left|right)['"]/.test(source))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})
