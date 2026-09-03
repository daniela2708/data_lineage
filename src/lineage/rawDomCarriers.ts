import { createHash } from 'node:crypto';
import { HTMLElement, parse } from 'node-html-parser';

export type RawCarrierKind = 'svg-text' | 'svg-rect' | 'svg-marker-line' | 'table-row' | 'list-item';

export type RawInformationCarrier = {
  key: string;
  kind: RawCarrierKind;
  fragment: string;
  element: HTMLElement;
};

const RAW_SELECTORS: ReadonlyArray<{ kind: RawCarrierKind; selector: string }> = [
  { kind: 'svg-text', selector: 'svg text' },
  { kind: 'svg-rect', selector: 'svg rect' },
  { kind: 'svg-marker-line', selector: 'svg line[marker-end]' },
  { kind: 'table-row', selector: 'tr' },
  { kind: 'list-item', selector: 'li' },
];

function carrierKey(kind: RawCarrierKind, index: number, fragment: string): string {
  const digest = createHash('sha256').update(fragment).digest('hex').slice(0, 16);
  return `${kind}:${index}:${digest}`;
}

/**
 * This is deliberately a raw DOM inventory. It knows nothing about lineage
 * roles, colors, geometry, parser atoms, or which report sections are present.
 */
export function enumerateRawInformationCarriersFromRoot(root: HTMLElement): RawInformationCarrier[] {
  return RAW_SELECTORS.flatMap(({ kind, selector }) => root.querySelectorAll(selector).map((element, index) => {
    const fragment = element.toString();
    return { key: carrierKey(kind, index, fragment), kind, fragment, element };
  }));
}

export function enumerateRawInformationCarriers(input: string): RawInformationCarrier[] {
  return enumerateRawInformationCarriersFromRoot(parse(input, { lowerCaseTagName: false, comment: false }));
}

