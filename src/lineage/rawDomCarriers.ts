import { createHash } from 'node:crypto';
import { HTMLElement, parse } from 'node-html-parser';

export type ElementDisposition = 'carrier' | 'structural' | 'decorative' | 'unhandled';
export type RegisteredElementRole =
  | 'svg-text' | 'svg-node-box' | 'svg-flow-chip' | 'svg-marker-line' | 'table-row' | 'list-item'
  | 'svg-arrow-path' | 'document-metadata' | 'report-metadata' | 'section-heading' | 'text-container'
  | 'layout-container' | 'table-container' | 'list-container' | 'inline-code' | 'svg-root'
  | 'svg-definitions' | 'svg-marker-definition' | 'svg-group' | 'stylesheet' | 'svg-marker-glyph'
  | 'svg-node-header' | 'svg-divider';

export type RegisteredDomElement = {
  key: string;
  tagName: string;
  role?: RegisteredElementRole;
  disposition: ElementDisposition;
  fragment: string;
  element: HTMLElement;
};

const HEADER_FILLS = new Set(['#E1F5EE', '#EAF0FB', '#FAEEDA', '#FAECE7', '#F1EFE8', '#EEEDFE']);

function elementKey(tagName: string, index: number, fragment: string): string {
  const digest = createHash('sha256').update(fragment).digest('hex').slice(0, 16);
  return `${tagName}:${index}:${digest}`;
}

function hasAncestor(element: HTMLElement, tagName: string): boolean {
  let current: HTMLElement | null = element;
  while (current !== null) {
    if (current.tagName === tagName) return true;
    current = current.parentNode instanceof HTMLElement ? current.parentNode : null;
  }
  return false;
}

function known(role: RegisteredElementRole, disposition: Exclude<ElementDisposition, 'unhandled'>): Pick<RegisteredDomElement, 'role' | 'disposition'> {
  return { role, disposition };
}

function classifySvg(element: HTMLElement): Pick<RegisteredDomElement, 'role' | 'disposition'> {
  const tag = element.tagName;
  if (tag === 'SVG') return known('svg-root', 'structural');
  if (tag === 'DEFS') return known('svg-definitions', 'structural');
  if (tag === 'MARKER') return known('svg-marker-definition', 'structural');
  if (tag === 'G') return known('svg-group', 'structural');
  if (tag === 'TEXT') return known('svg-text', 'carrier');
  if (tag === 'RECT') {
    if (element.getAttribute('rx') === undefined || element.getAttribute('stroke') === undefined) return { disposition: 'unhandled' };
    if (Number(element.getAttribute('height')) <= 40) return known('svg-flow-chip', 'carrier');
    if (Number(element.getAttribute('height')) > 40) return known('svg-node-box', 'carrier');
    return { disposition: 'unhandled' };
  }
  if (tag === 'LINE') {
    if (element.getAttribute('marker-end') !== undefined) return known('svg-marker-line', 'carrier');
    return known('svg-divider', 'decorative');
  }
  if (tag === 'PATH') {
    if (hasAncestor(element.parentNode instanceof HTMLElement ? element.parentNode : element, 'MARKER')) return known('svg-marker-glyph', 'decorative');
    const fill = element.getAttribute('fill')?.toUpperCase();
    const hasArrowAttributes = element.getAttribute('marker-end') !== undefined
      || element.getAttribute('stroke-dasharray') !== undefined
      || (fill === 'NONE' && element.getAttribute('stroke') !== undefined);
    if (hasArrowAttributes) return { role: 'svg-arrow-path', disposition: 'unhandled' };
    if (fill !== undefined && HEADER_FILLS.has(fill)) return known('svg-node-header', 'decorative');
    return { disposition: 'unhandled' };
  }
  return { disposition: 'unhandled' };
}

function classifyBody(element: HTMLElement): Pick<RegisteredDomElement, 'role' | 'disposition'> {
  switch (element.tagName) {
    case 'META':
    case 'TITLE': return known('document-metadata', 'structural');
    case 'STYLE': return known('stylesheet', 'decorative');
    case 'H1': return known('report-metadata', 'structural');
    case 'H2':
    case 'H3': return known('section-heading', 'structural');
    case 'P':
    case 'TH':
    case 'TD': return known('text-container', 'structural');
    case 'DIV': return known('layout-container', 'structural');
    case 'TABLE':
    case 'TBODY': return known('table-container', 'structural');
    case 'TR': return known('table-row', 'carrier');
    case 'UL': return known('list-container', 'structural');
    case 'LI': return known('list-item', 'carrier');
    case 'CODE': return known('inline-code', 'structural');
    default: return { disposition: 'unhandled' };
  }
}

/**
 * Every DOM element is classified. This registry does not import or apply
 * lineage parser roles, node geometry, or atom ownership.
 */
export function enumerateRegisteredElementsFromRoot(root: HTMLElement): RegisteredDomElement[] {
  return root.querySelectorAll('*').map((element, index) => {
    const fragment = element.toString();
    return {
      key: elementKey(element.tagName.toLowerCase(), index, fragment),
      tagName: element.tagName.toLowerCase(),
      fragment,
      element,
      ...(hasAncestor(element, 'SVG') ? classifySvg(element) : classifyBody(element)),
    };
  });
}

export function enumerateRegisteredElements(input: string): RegisteredDomElement[] {
  return enumerateRegisteredElementsFromRoot(parse(input, { lowerCaseTagName: false, comment: false }));
}

export function enumerateRawInformationCarriersFromRoot(root: HTMLElement): RegisteredDomElement[] {
  return enumerateRegisteredElementsFromRoot(root).filter(({ disposition }) => disposition === 'carrier');
}

export function enumerateRawInformationCarriers(input: string): RegisteredDomElement[] {
  return enumerateRegisteredElements(input).filter(({ disposition }) => disposition === 'carrier');
}
