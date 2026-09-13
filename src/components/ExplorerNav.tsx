export type ExplorerSection = 'lineage' | 'anomalies'

const SECTIONS: [ExplorerSection, string][] = [
  ['lineage', 'Lineage'],
  ['anomalies', 'Anomalies'],
]

export default function ExplorerNav({ value, onChange }: { value: ExplorerSection; onChange: (section: ExplorerSection) => void }) {
  return <nav className="bar" aria-label="Explorer sections">
    <div className="page-shell bar-inner">
      <div className="tabs">
        {SECTIONS.map(([section, label]) => (
          <button type="button" aria-pressed={value === section} onClick={() => onChange(section)} key={section}>{label}</button>
        ))}
      </div>
    </div>
  </nav>
}
