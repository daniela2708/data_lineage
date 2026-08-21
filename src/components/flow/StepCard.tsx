import { zoneColor } from '../../lib/tokens'
import type { FlowNode } from '../../types'

/** What happens at the step showing now, in words rather than in the diagram. */
export default function StepCard({ node }: { node: FlowNode }) {
  const sides = node.side ?? []
  const sideLabel = sides.length
    ? `${sides[0].kind === 'origin' ? 'Source tables' : 'Also reads'}: ${sides
        .map((s) => s.label)
        .join(', ')}`
    : ''
  const foot = [node.pipe ? `Moved by ${node.pipe}` : '', sideLabel]
    .filter(Boolean)
    .join('   ·   ')

  return (
    <div className="fnow" style={{ borderLeftColor: zoneColor(node.zone) }}>
      <div className="z">{node.zone}</div>
      <div>
        <div className="l">{node.label}</div>
        <div className="d">{node.detail}</div>
        {!!foot && <div className="p">{foot}</div>}
      </div>
    </div>
  )
}
