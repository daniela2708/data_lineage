import { describe, expect, it } from 'vitest'
import type { LineageReport } from '../data/lineageReports'
import { schemaGroupsForReport, shouldGroupBySchema } from './schemaGroups'

function reportWithDependencies(values: string[], downstreamValues: string[] = []): LineageReport {
  return {
    tableName: 'TARGET',
    qualifiedTable: 'CORE.TARGET',
    title: 'Target lineage',
    subtitle: '',
    sourceFile: 'target.html',
    publicPath: '/target.html',
    sourceSha256: 'test',
    diagramSvg: '<svg />',
    rowCount: null,
    columnCount: null,
    sections: [{
      title: 'Dependencies',
      blocks: [
        { type: 'heading', text: 'Owned by other processes' },
        {
          type: 'table',
          rows: values.map((text) => [{ text, kind: 'item' as const }]),
        },
        { type: 'heading', text: 'Depends on this table, confirmed in code' },
        {
          type: 'table',
          rows: downstreamValues.map((text) => [{ text, kind: 'value' as const }]),
        },
      ],
    }],
    footer: '',
    carrierCount: 0,
  }
}

describe('schemaGroupsForReport', () => {
  it('groups and deduplicates qualified tables while ignoring file names', () => {
    const report = reportWithDependencies([
      'CORE.TABLE_D: confirmed in loader.fex',
      'CORE.TABLE_A',
      'CORE.TABLE_B',
      'CORE.TABLE_C',
      'CORE.TABLE_A: richer context',
      'STAGE.INPUT_A',
      'CORE.TARGET: self-reference',
      'source_without_schema: retained context',
    ], ['PUBLISH.OUTPUT_A'])

    const groups = schemaGroupsForReport(report)

    expect(groups.map((group) => [group.schema, group.tables.length])).toEqual([
      ['CORE', 4],
      ['Schema not documented', 1],
      ['STAGE', 1],
    ])
    expect(groups[0].tables[0]).toMatchObject({
      qualifiedName: 'CORE.TABLE_A',
      detail: 'richer context',
    })
    expect(groups[1].tables[0]).toMatchObject({
      qualifiedName: 'source_without_schema',
      detail: 'retained context',
    })
    expect(shouldGroupBySchema(groups)).toBe(true)
  })

  it('groups a large single-schema source set and keeps three sources unchanged', () => {
    expect(shouldGroupBySchema(schemaGroupsForReport(reportWithDependencies([
      'CORE.TABLE_A',
      'CORE.TABLE_B',
      'CORE.TABLE_C',
      'CORE.TABLE_D',
    ])))).toBe(true)

    expect(shouldGroupBySchema(schemaGroupsForReport(reportWithDependencies([
      'CORE.TABLE_A',
      'CORE.TABLE_B',
      'CORE.TABLE_C',
    ])))).toBe(false)
  })
})
