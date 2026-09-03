import { createHash } from 'node:crypto';
import { HTMLElement, parse } from 'node-html-parser';
import {
  DiagramRole,
  type DependencyGroup,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramNode,
  type IngestAlert,
  type KeyValueRow,
  type LineageDoc,
  type LineageSource,
  type TextAtom,
} from './types';
import { enumerateRawInformationCarriersFromRoot } from './rawDomCarriers';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const ROLE_BY_STROKE: Readonly<Record<string, DiagramRole>> = {
  '#0F6E56': DiagramRole.LIVE,
  '#2E5FA3': DiagramRole.EXTERNAL,
  '#854F0B': DiagramRole.INJECTION,
  '#993C1D': DiagramRole.FACT,
  '#B4B2A9': DiagramRole.DEAD,
  '#534AB7': DiagramRole.TARGET,
};
const GROUP_ROLE_BY_FILL: Readonly<Record<string, DiagramRole>> = {
  '#0F6E56': DiagramRole.LIVE,
  '#854F0B': DiagramRole.INJECTION,
  '#993C1D': DiagramRole.FACT,
  '#B4B2A9': DiagramRole.DEAD,
};

type Box = { element: HTMLElement; x: number; y: number; width: number; height: number; role: DiagramRole };
type Point = { x: number; y: number };

export type ParseCoverageReceipt = {
  totalCarriers: number;
  claimedCarrierKeys: string[];
  unclaimedCarrierKeys: string[];
  multiplyClaimedCarrierKeys: string[];
};

export type ParsedLineageWithCoverage = {
  doc: LineageDoc;
  coverage: ParseCoverageReceipt;
};

export class LineageParseError extends Error {
  constructor(public readonly alerts: IngestAlert[]) {
    super(alerts.map((alert) => `${alert.code}: ${alert.message}`).join('\n'));
    this.name = 'LineageParseError';
  }
}

function stableId(kind: string, content: unknown): string {
  const digest = createHash('sha256').update(JSON.stringify(content)).digest('hex').slice(0, 20);
  return `${kind}_${digest}`;
}

function numberAttr(element: HTMLElement, name: string): number {
  const value = Number(element.getAttribute(name));
  if (!Number.isFinite(value)) throw new LineageParseError([alert('INVALID_INPUT', `Invalid SVG ${name}`, element.toString())]);
  return value;
}

function alert(code: IngestAlert['code'], message: string, fragment?: string): IngestAlert {
  return { severity: 'CRITICAL', code, message, context: fragment === undefined ? {} : { fragment } };
}

function normalizedText(element: HTMLElement): string {
  return element.text.trim().replace(/\s+/g, ' ');
}

function contains(box: Box, point: Point, tolerance = 0): boolean {
  return point.x >= box.x - tolerance && point.x <= box.x + box.width + tolerance
    && point.y >= box.y - tolerance && point.y <= box.y + box.height + tolerance;
}

function siblingsAfter(heading: HTMLElement): HTMLElement[] {
  const elements: HTMLElement[] = [];
  let current = heading.nextElementSibling;
  while (current !== null && current.tagName !== 'H2') {
    elements.push(current);
    current = current.nextElementSibling;
  }
  return elements;
}

function findSection(root: HTMLElement, name: string): HTMLElement | undefined {
  return root.querySelectorAll('h2').find((heading) => normalizedText(heading) === name);
}

function compatibleGroup(role: DiagramRole, nodeRole: DiagramRole): boolean {
  return role === nodeRole || (role === DiagramRole.LIVE && nodeRole === DiagramRole.EXTERNAL);
}

export class HtmlLineageSource implements LineageSource {
  constructor(private readonly now: () => Date = () => new Date()) {}

  parse(input: string, sourceFile: string): LineageDoc {
    return this.parseWithCoverage(input, sourceFile).doc;
  }

  parseWithCoverage(input: string, sourceFile: string): ParsedLineageWithCoverage {
    if (!sourceFile.toLowerCase().endsWith('.html') || Buffer.byteLength(input, 'utf8') > MAX_FILE_BYTES) {
      throw new LineageParseError([alert('INVALID_INPUT', 'Input must be an HTML file no larger than 2 MiB')]);
    }
    if (!input.toLowerCase().includes('</svg>')) {
      throw new LineageParseError([alert('TRUNCATED_HTML', 'The report has no closing SVG document')]);
    }

    const root = parse(input, { lowerCaseTagName: false, comment: false });
    const svg = root.querySelector('svg');
    if (svg === null) throw new LineageParseError([alert('TRUNCATED_HTML', 'The report has no closing SVG document')]);
    if (svg.querySelectorAll('rect').length === 0 || svg.querySelectorAll('text').length === 0) {
      throw new LineageParseError([alert('EMPTY_SVG', 'The report SVG contains no diagram')]);
    }

    const required = ['Orchestrator', 'Dependencies', 'Pending validation'];
    const missing = required.filter((name) => findSection(root, name) === undefined);
    if (missing.length > 0) {
      throw new LineageParseError([alert('MISSING_SECTION', `Missing required section(s): ${missing.join(', ')}`)]);
    }

    const claimed = new Map<HTMLElement, string[]>();
    const claim = (element: HTMLElement, atomId: string): void => {
      const owners = claimed.get(element) ?? [];
      owners.push(atomId);
      claimed.set(element, owners);
    };

    const boxes: Box[] = [];
    const chipRects: HTMLElement[] = [];
    for (const rect of svg.querySelectorAll('rect')) {
      const stroke = rect.getAttribute('stroke')?.toUpperCase();
      const role = stroke === undefined ? undefined : ROLE_BY_STROKE[stroke];
      if (role !== undefined) {
        boxes.push({ element: rect, x: numberAttr(rect, 'x'), y: numberAttr(rect, 'y'), width: numberAttr(rect, 'width'), height: numberAttr(rect, 'height'), role });
      } else if (rect.getAttribute('rx') !== undefined && Number(rect.getAttribute('height')) <= 40) {
        chipRects.push(rect);
      } else {
        throw new LineageParseError([alert('UNKNOWN_COLOR', `Unknown node stroke color: ${stroke ?? '(missing)'}`, rect.toString())]);
      }
    }

    const textElements = svg.querySelectorAll('text');
    const nodeByBox = new Map<Box, DiagramNode>();
    for (const box of boxes) {
      // Generated SVG has no semantic groups. The outer stroked rect is the node boundary,
      // so text baselines whose x/y coordinates fall inside it belong to that node.
      const texts = textElements.filter((text) => contains(box, { x: numberAttr(text, 'x'), y: numberAttr(text, 'y') }));
      const horizontalLines = svg.querySelectorAll('line').filter((line) => {
        if (line.getAttribute('marker-end') !== undefined) return false;
        const y1 = numberAttr(line, 'y1');
        return Math.abs(y1 - numberAttr(line, 'y2')) < 0.01 && y1 >= box.y && y1 <= box.y + box.height
          && numberAttr(line, 'x1') >= box.x && numberAttr(line, 'x2') <= box.x + box.width;
      }).map((line) => numberAttr(line, 'y1')).sort((a, b) => a - b);
      const firstDivider = horizontalLines[0] ?? box.y + box.height;
      const lastDivider = horizontalLines.at(-1) ?? firstDivider;
      const titleTexts = texts.filter((text) => text.getAttribute('font-weight') === '500' && numberAttr(text, 'y') < firstDivider);
      const name = titleTexts.map(normalizedText).join('');
      if (name.length === 0) throw new LineageParseError([alert('UNPARSED_CONTENT', 'Node has no title', box.element.toString())]);

      const content = texts.filter((text) => !titleTexts.includes(text));
      const badgeTexts = content.filter((text) => text.getAttribute('text-anchor') === 'end');
      const subtitleTexts = content.filter((text) => !badgeTexts.includes(text) && numberAttr(text, 'y') < firstDivider);
      const columnTexts = content.filter((text) => !badgeTexts.includes(text) && numberAttr(text, 'y') > firstDivider
        && numberAttr(text, 'y') < lastDivider && text.getAttribute('font-family')?.includes('monospace'));
      const notesTexts = content.filter((text) => !badgeTexts.includes(text) && !subtitleTexts.includes(text) && !columnTexts.includes(text));
      const columnNames = columnTexts.map(normalizedText);
      const nodeContent = {
        role: box.role,
        name,
        subtitleLines: subtitleTexts.map(normalizedText),
        columns: columnNames,
        keyBadges: badgeTexts.map((badge) => ({ column: columnNames.find((column) => {
          const columnText = columnTexts[columnNames.indexOf(column)];
          return columnText !== undefined && Math.abs(numberAttr(columnText, 'y') - numberAttr(badge, 'y')) < 1;
        }) ?? '', badge: normalizedText(badge) })),
        notes: notesTexts.map(normalizedText),
      };
      const id = stableId('node', nodeContent);
      const node: DiagramNode = {
        id,
        role: box.role,
        name,
        subtitleLines: subtitleTexts.map((text) => ({ id: stableId('subtitle', [id, normalizedText(text)]), text: normalizedText(text) })),
        columns: columnTexts.map((text) => ({ id: stableId('column', [id, normalizedText(text)]), name: normalizedText(text) })),
        keyBadges: badgeTexts.map((badge) => {
          const column = columnTexts.find((text) => Math.abs(numberAttr(text, 'y') - numberAttr(badge, 'y')) < 1);
          const value = { column: column === undefined ? '' : normalizedText(column), badge: normalizedText(badge) };
          return { id: stableId('badge', [id, value]), ...value };
        }),
        notes: notesTexts.map((text) => ({ id: stableId('note', [id, normalizedText(text)]), text: normalizedText(text) })),
      };
      claim(box.element, id);
      for (const text of titleTexts) claim(text, id);
      subtitleTexts.forEach((text, index) => claim(text, node.subtitleLines[index]?.id ?? id));
      columnTexts.forEach((text, index) => claim(text, node.columns[index]?.id ?? id));
      badgeTexts.forEach((text, index) => claim(text, node.keyBadges[index]?.id ?? id));
      notesTexts.forEach((text, index) => claim(text, node.notes[index]?.id ?? id));
      nodeByBox.set(box, node);
    }

    const edgeLines = svg.querySelectorAll('line').filter((line) => line.getAttribute('marker-end') !== undefined);
    const edges: DiagramEdge[] = edgeLines.map((line) => {
      const from = boxes.find((box) => contains(box, { x: numberAttr(line, 'x1'), y: numberAttr(line, 'y1') }, 5));
      const to = boxes.find((box) => contains(box, { x: numberAttr(line, 'x2'), y: numberAttr(line, 'y2') }, 5));
      if (from === undefined || to === undefined) throw new LineageParseError([alert('UNPARSED_CONTENT', 'Edge endpoint does not meet a node', line.toString())]);
      const xMin = Math.min(numberAttr(line, 'x1'), numberAttr(line, 'x2'));
      const xMax = Math.max(numberAttr(line, 'x1'), numberAttr(line, 'x2'));
      const yMid = (numberAttr(line, 'y1') + numberAttr(line, 'y2')) / 2;
      const chip = chipRects.find((rect) => {
        const x = numberAttr(rect, 'x');
        const y = numberAttr(rect, 'y');
        return x >= xMin && x + numberAttr(rect, 'width') <= xMax && yMid >= y - 25 && yMid <= y + numberAttr(rect, 'height') + 25;
      });
      const chipTexts = chip === undefined ? [] : textElements.filter((text) => contains({
        element: chip, role: from.role, x: numberAttr(chip, 'x'), y: numberAttr(chip, 'y'), width: numberAttr(chip, 'width'), height: numberAttr(chip, 'height'),
      }, { x: numberAttr(text, 'x'), y: numberAttr(text, 'y') }));
      const flowLabel = chipTexts.map(normalizedText).join('');
      const fromNode = nodeByBox.get(from);
      const toNode = nodeByBox.get(to);
      if (fromNode === undefined || toNode === undefined) throw new LineageParseError([alert('UNPARSED_CONTENT', 'Edge references an unparsed node')]);
      const value = { fromNodeId: fromNode.id, toNodeId: toNode.id, flowLabel, style: line.getAttribute('stroke-dasharray') === undefined ? 'solid' as const : 'dashed' as const };
      const id = stableId('edge', value);
      claim(line, id);
      if (chip !== undefined) claim(chip, id);
      chipTexts.forEach((text) => claim(text, id));
      return { id, ...value };
    });

    const groupLabels = textElements.filter((text) => !claimed.has(text));
    const groups: DiagramGroup[] = groupLabels.map((label, index) => {
      const fill = label.getAttribute('fill')?.toUpperCase();
      const role = fill === undefined ? undefined : GROUP_ROLE_BY_FILL[fill];
      if (role === undefined) throw new LineageParseError([alert('UNKNOWN_COLOR', `Unknown group label color: ${fill ?? '(missing)'}`, label.toString())]);
      const y = numberAttr(label, 'y');
      const nextY = groupLabels.slice(index + 1).map((next) => numberAttr(next, 'y')).find((candidate) => candidate > y) ?? Number.POSITIVE_INFINITY;
      const nodeIds = boxes.filter((box) => box.y > y && box.y < nextY && compatibleGroup(role, box.role))
        .map((box) => nodeByBox.get(box)?.id).filter((id): id is string => id !== undefined);
      const value = { label: normalizedText(label), role, nodeIds };
      const id = stableId('group', value);
      claim(label, id);
      return { id, ...value };
    });

    const orchestratorHeading = findSection(root, 'Orchestrator');
    const orchestrator: KeyValueRow[] = orchestratorHeading === undefined ? [] : siblingsAfter(orchestratorHeading)
      .flatMap((element) => element.querySelectorAll('tr')).map((row) => {
        const cells = row.querySelectorAll('th, td');
        const value = { key: cells[0] === undefined ? '' : normalizedText(cells[0]), value: cells[1] === undefined ? '' : normalizedText(cells[1]) };
        const result = { id: stableId('orchestrator', value), ...value };
        claim(row, result.id);
        return result;
      });

    const dependencyHeading = findSection(root, 'Dependencies');
    const dependencyElements = dependencyHeading === undefined ? [] : siblingsAfter(dependencyHeading);
    const dependencies: DependencyGroup[] = dependencyElements.filter((element) => element.tagName === 'H3').map((heading) => {
      const items: { id: string; text: string }[] = [];
      let current = heading.nextElementSibling;
      let intro = '';
      while (current !== null && current.tagName !== 'H2' && current.tagName !== 'H3') {
        if (current.tagName === 'P' && current.classNames.includes('intro')) intro = normalizedText(current);
        for (const row of current.querySelectorAll('tr')) {
          const item = { id: stableId('dependency-item', [normalizedText(heading), normalizedText(row)]), text: normalizedText(row) };
          claim(row, item.id);
          items.push(item);
        }
        current = current.nextElementSibling;
      }
      const value = { heading: normalizedText(heading), intro, items };
      return { id: stableId('dependency-group', value), ...value };
    });

    const listSection = (name: string): TextAtom[] => {
      const heading = findSection(root, name);
      if (heading === undefined) return [];
      return siblingsAfter(heading).flatMap((element) => element.querySelectorAll('li')).map((item) => {
        const value = { text: normalizedText(item) };
        const atom = { id: stableId(name.toLowerCase().replace(' ', '-'), value), ...value };
        claim(item, atom.id);
        return atom;
      });
    };

    const findings = listSection('Findings');
    const pendingValidation = listSection('Pending validation');
    const rawCarriers = enumerateRawInformationCarriersFromRoot(root);
    const unclaimedCarrierKeys = rawCarriers.filter(({ element }) => (claimed.get(element) ?? []).length === 0).map(({ key }) => key);
    const multiplyClaimedCarrierKeys = rawCarriers.filter(({ element }) => (claimed.get(element) ?? []).length > 1).map(({ key }) => key);
    const claimedCarrierKeys = rawCarriers.filter(({ element }) => (claimed.get(element) ?? []).length === 1).map(({ key }) => key);
    const coverageAlerts = rawCarriers.flatMap(({ element, fragment }) => {
      const owners = claimed.get(element) ?? [];
      return owners.length === 1 ? [] : [alert('UNPARSED_CONTENT', `Information carrier was claimed ${owners.length} times`, fragment)];
    });
    if (coverageAlerts.length > 0) throw new LineageParseError(coverageAlerts);

    const title = root.querySelector('h1');
    const table = title === null ? '' : normalizedText(title).split(':')[0]?.trim() ?? '';
    if (table.length === 0) {
      throw new LineageParseError([alert('INVALID_INPUT', 'Report metadata is incomplete')]);
    }

    const doc: LineageDoc = {
      meta: {
        table,
        sourceFile,
        sourceSha256: createHash('sha256').update(input).digest('hex'),
        ingestedAt: this.now().toISOString(),
      },
      nodes: [...nodeByBox.values()], edges, groups, orchestrator, dependencies,
      findings, pendingValidation,
    };
    return {
      doc,
      coverage: {
        totalCarriers: rawCarriers.length,
        claimedCarrierKeys,
        unclaimedCarrierKeys,
        multiplyClaimedCarrierKeys,
      },
    };
  }
}
