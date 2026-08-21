/**
 * Design tokens and the two colour rules the whole prototype relies on.
 *
 * The hex values match the CSS custom properties in index.css. They are
 * duplicated here because SVG attributes need a real colour string, and reading
 * a custom property back out of the document on every animation frame is both
 * slower and harder to test.
 */

export const C = {
  red: '#E93D44',
  redDark: '#CA2D35',
  redDarkest: '#BA2229',
  dark: '#211E1E',
  light: '#FCFBF5',
  white: '#FFFFFF',
  nDarkest: '#797873',
  nD2: '#A2A19C',
  nDarker: '#E4E3DD',
  n: '#F1F0EA',
  nLighter: '#F7F6F0',
  coolDarkest: '#8CA2A1',
  coolDarker: '#ADBBBC',
  cool: '#CED7D6',
  coolLighter: '#ECEFEF',
  streak: '#DDFD58',
  visionary: '#8021F8',
  ecosystem: '#32A887',
  aqua: '#26BDFB',
  blue: '#1366B1',
} as const

export const FONT = {
  mono: "'Space Mono', ui-monospace, monospace",
  sans: "'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const

/**
 * How widely a change to a table would be felt, by the number of business cases
 * that depend on it. Used for the marks in the estate view and the dots in the
 * table list.
 */
export function impact(bcCount: number): string {
  if (!bcCount) return C.nD2
  if (bcCount === 1) return C.ecosystem
  if (bcCount <= 3) return C.aqua
  return C.red
}

/** Colour of a layer, reading dark to red as the data moves towards published. */
const ZONE_COLOR: Record<string, string> = {
  'SQL Server': C.dark,
  Source: C.dark,
  Landing: '#465D6B',
  Raw: '#7D6F68',
  Bronze: '#6F8F89',
  Silver: C.aqua,
  Gold: C.blue,
  CSV: C.visionary,
  Snowflake: C.red,
}

export function zoneColor(zone: string): string {
  return ZONE_COLOR[zone] ?? C.nD2
}
