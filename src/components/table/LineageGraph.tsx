import { DATA } from '../../data/dataset'
import type { TableRec } from '../../types'

interface JourneyItem {
  label: string
  detail: string
  tone?: 'focus' | 'impact'
}

interface JourneyStage {
  label: string
  description: string
  items: JourneyItem[]
}

/**
 * A readable journey from the recorded source to the business cases served.
 * Empty stages remain visible because they are findings, not missing UI.
 */
export default function LineageGraph({ table }: { table: TableRec }) {
  const triggers = DATA.triggers.filter((trigger) => trigger.tables.includes(table.id))
  const pipelines = DATA.pipelines.filter((pipeline) => table.pipeIds.includes(pipeline.id))

  const stages: JourneyStage[] = [
    {
      label: 'Starts in',
      description: 'Recorded source system',
      items: table.src ? [{ label: table.src, detail: 'Source system' }] : [],
    },
    {
      label: 'Scheduled by',
      description: 'What starts the load',
      items: triggers.map((trigger) => ({
        label: trigger.name,
        detail: [trigger.freq.join(', '), trigger.status].filter(Boolean).join(' · '),
      })),
    },
    {
      label: 'Moved through',
      description: 'Pipelines that carry the data',
      items: pipelines.map((pipeline) => ({
        label: pipeline.name,
        detail: [pipeline.id, pipeline.tgt ? `to ${pipeline.tgt}` : ''].filter(Boolean).join(' · '),
      })),
    },
    {
      label: 'Loads',
      description: 'The selected table',
      items: [
        {
          label: table.name,
          detail: [table.db, table.schema].filter(Boolean).join('.') || table.id,
          tone: 'focus',
        },
      ],
    },
    {
      label: 'Supports',
      description: 'Recorded business use',
      items: table.bcs.map((businessCase) => ({
        label: businessCase,
        detail: 'Business case',
        tone: 'impact',
      })),
    },
  ]

  return (
    <div className="lineage-journey" aria-label={`Documented loading path for ${table.name}`}>
      <div className="journey-scroll" tabIndex={0}>
        <div className="journey-grid">
          {stages.map((stage, index) => (
            <section
              className={`journey-stage journey-stage-${index + 1}`}
              key={stage.label}
              aria-labelledby={`stage-${index}`}
            >
              <div className="stage-heading">
                <span className="stage-number">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3 id={`stage-${index}`}>{stage.label}</h3>
                  <p>{stage.description}</p>
                </div>
              </div>

              <div className="stage-items">
                {stage.items.length ? (
                  stage.items.map((item, itemIndex) => (
                    <div
                      className={`journey-item${item.tone ? ` ${item.tone}` : ''}`}
                      key={`${item.label}-${itemIndex}`}
                    >
                      <strong title={item.label}>{item.label}</strong>
                      <span>{item.detail || 'Detail not documented'}</span>
                    </div>
                  ))
                ) : (
                  <div className="journey-item undocumented">
                    <strong>Not documented</strong>
                    <span>No value is recorded in the source files</span>
                  </div>
                )}
              </div>

              {index < stages.length - 1 && <span className="stage-arrow" aria-hidden="true" />}
            </section>
          ))}
        </div>
      </div>
      <p className="journey-caption">
        Read from left to right. Dashed cards identify information that is not documented in the
        source files.
      </p>
    </div>
  )
}
