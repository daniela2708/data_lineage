import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'node-html-parser';
import { describe, expect, it } from 'vitest';
import { HtmlLineageSource, LineageParseError } from './HtmlLineageSource';
import { enumerateRawInformationCarriers } from './rawDomCarriers';

const source = new HtmlLineageSource(() => new Date('2026-09-02T00:00:00.000Z'));
const fixtureNames = [
  'item_dim_lineage.html',
  'club_card_dim_lineage.html',
  'vendor_item_xref_lineage.html',
] as const;

function fixture(name: typeof fixtureNames[number]): string {
  return readFileSync(resolve(process.cwd(), 'tests/fixtures/lineage', name), 'utf8');
}

function legacyFixture(): string {
  return readFileSync(resolve(process.cwd(), 'tests/fixtures/lineage/CLUB_CARD_DIM_lineage_Oracle.html'), 'utf8');
}

function expectAlert(action: () => unknown, code: string): void {
  try {
    action();
    throw new Error('Expected parser to reject input');
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(LineageParseError);
    if (!(error instanceof LineageParseError)) return;
    expect(error.alerts.some((item) => item.code === code)).toBe(true);
    expect(error.alerts.every((item) => item.severity === 'CRITICAL')).toBe(true);
  }
}

describe('HtmlLineageSource', () => {
  for (const name of fixtureNames) {
    it(`parses ${name} with complete carrier coverage`, () => {
      expect(source.parse(fixture(name), name)).toMatchSnapshot();
    });

    it(`has zero unclaimed raw DOM carriers in ${name}`, () => {
      const input = fixture(name);
      const rawKeys = new Set(enumerateRawInformationCarriers(input).map(({ key }) => key));
      const { coverage } = source.parseWithCoverage(input, name);
      const claimedKeys = new Set(coverage.claimedCarrierKeys);
      const unclaimedKeys = [...rawKeys].filter((key) => !claimedKeys.has(key));

      console.info(`${name}: unclaimed carriers = ${unclaimedKeys.length}`);
      expect(unclaimedKeys).toEqual([]);
      expect(coverage.multiplyClaimedCarrierKeys).toEqual([]);
      expect(claimedKeys.size).toBe(rawKeys.size);
    });
  }

  it('rejects truncated HTML', () => {
    const input = fixture(fixtureNames[0]).replace('</svg>', '');
    expectAlert(() => source.parse(input, 'truncated.html'), 'TRUNCATED_HTML');
  });

  it('rejects an empty SVG', () => {
    const input = `<h1>WMBI.EMPTY: report</h1><p class="sub">Generated from analysis/empty/lineage.yml</p>
      <svg></svg><h2>Orchestrator</h2><h2>Dependencies</h2><h2>Pending validation</h2>`;
    expectAlert(() => source.parse(input, 'empty.html'), 'EMPTY_SVG');
  });

  it('rejects a missing required section', () => {
    const input = fixture(fixtureNames[0]).replace('<h2>Orchestrator</h2>', '<h2>Removed</h2>');
    expectAlert(() => source.parse(input, 'missing-section.html'), 'MISSING_SECTION');
  });

  it('rejects an unknown node color', () => {
    const input = fixture(fixtureNames[0]).replace('stroke="#2E5FA3"', 'stroke="#123456"');
    expectAlert(() => source.parse(input, 'unknown-color.html'), 'UNKNOWN_COLOR');
  });

  it('documents the current rejection of the legacy club card report', () => {
    const input = legacyFixture();
    const markerPaths = parse(input).querySelectorAll('svg path[marker-end]');

    expect(markerPaths).toHaveLength(3);
    expectAlert(() => source.parse(input, 'CLUB_CARD_DIM_lineage_Oracle.html'), 'MISSING_SECTION');
  });
});
