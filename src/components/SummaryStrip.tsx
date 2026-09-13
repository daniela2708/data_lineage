export interface SummaryMetric {
  label: string
  value: number
  /** Semantic markers, used sparingly: a healthy count and a count that needs work. */
  tone?: 'positive' | 'warning'
}

/**
 * One horizontal strip of derived counts, shared by both explorer sections so a
 * number means the same thing and looks the same wherever it appears.
 */
export default function SummaryStrip({ metrics, label }: { metrics: SummaryMetric[]; label: string }) {
  return (
    <section className="summary-strip" aria-label={label}>
      {metrics.map((metric) => (
        <article className={metric.tone} key={metric.label}>
          <strong>{metric.value}</strong>
          <span>{metric.label}</span>
        </article>
      ))}
    </section>
  )
}
