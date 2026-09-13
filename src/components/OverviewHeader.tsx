/**
 * The heading both explorer sections open with, so a section is introduced the
 * same way wherever the reader lands.
 */
export default function OverviewHeader({ eyebrow, title, description, titleId }: { eyebrow: string; title: string; description: string; titleId?: string }) {
  return (
    <header className="overview-header">
      <span className="flow-kicker">{eyebrow}</span>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
    </header>
  )
}
