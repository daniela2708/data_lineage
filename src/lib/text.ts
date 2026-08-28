/** Small text helpers shared by the SVG views, where CSS cannot wrap for us. */

/** Cut a label and add an ellipsis, so a long name never overruns its box. */
export function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/**
 * Break a table or path name into lines of at most `max` characters, preferring
 * to break after a dot, slash or underscore so the pieces stay readable.
 * Capped at `maxLines` because the SVG reserves a fixed band for the label.
 */
export function wrapLabel(s: string, max: number, maxLines = 3): string[] {
  if (s.length <= max) return [s]

  const parts = s.split(/([./_])/)
  const soft: string[] = []
  let cur = ''
  for (const p of parts) {
    if ((cur + p).length > max && cur) {
      soft.push(cur)
      cur = p
    } else {
      cur += p
    }
  }
  if (cur) soft.push(cur)

  const out: string[] = []
  for (const line of soft) {
    if (line.length <= max) {
      out.push(line)
    } else {
      out.push(...(line.match(new RegExp(`.{1,${max}}`, 'g')) ?? []))
    }
  }
  return out.slice(0, maxLines)
}

/** Join the parts of a subtitle, dropping the empty ones. */
export function joinDot(parts: (string | undefined | false)[]): string {
  return parts.filter(Boolean).join(' · ')
}

/**
 * Split a qualified name at its first dot, so a card can show the database or
 * schema quietly above the object it actually points at.
 */
export function splitQualifiedName(name: string): { qualifier: string; object: string } {
  const cut = name.indexOf('.')
  return cut === -1 ? { qualifier: '', object: name } : { qualifier: name.slice(0, cut), object: name.slice(cut + 1) }
}

/**
 * Cut a technical name after each separator. Rendering the pieces with a <wbr>
 * between them lets a narrow card wrap at CLUBCARD_ / SRC_FEED rather than
 * mid-token, which is the only place a reader can follow the break.
 */
export function splitOnSeparators(name: string): string[] {
  const parts: string[] = []
  let current = ''
  for (const char of name) {
    current += char
    if (char === '_' || char === '.' || char === '/') {
      parts.push(current)
      current = ''
    }
  }
  if (current) parts.push(current)
  return parts
}
