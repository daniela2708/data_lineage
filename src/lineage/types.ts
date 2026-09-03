export enum DiagramRole {
  LIVE = 'LIVE',
  EXTERNAL = 'EXTERNAL',
  INJECTION = 'INJECTION',
  FACT = 'FACT',
  DEAD = 'DEAD',
  TARGET = 'TARGET',
}

export type AtomRef = { id: string };

export type DiagramNode = AtomRef & {
  role: DiagramRole;
  name: string;
  subtitleLines: TextAtom[];
  columns: (AtomRef & { name: string })[];
  keyBadges: (AtomRef & { column: string; badge: string })[];
  notes: TextAtom[];
};

export type DiagramEdge = AtomRef & {
  fromNodeId: string;
  toNodeId: string;
  flowLabel: string;
  style: 'solid' | 'dashed';
};

export type DiagramGroup = AtomRef & {
  label: string;
  role: DiagramRole;
  nodeIds: string[];
};

export type KeyValueRow = AtomRef & { key: string; value: string };
export type DependencyItem = AtomRef & { text: string };
export type DependencyGroup = AtomRef & {
  heading: string;
  intro: string;
  items: DependencyItem[];
};
export type DeadChain = AtomRef & {
  process: string;
  tables: string[];
  lastExecution?: string;
};
export type TextAtom = AtomRef & { text: string };

export type LineageDoc = {
  meta: {
    table: string;
    sourceFile: string;
    sourceSha256: string;
    ingestedAt: string;
  };
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  orchestrator: KeyValueRow[];
  dependencies: DependencyGroup[];
  findings: TextAtom[];
  pendingValidation: TextAtom[];
};

export type IngestAlert = {
  severity: 'WARN' | 'CRITICAL';
  code: 'INVALID_INPUT' | 'TRUNCATED_HTML' | 'EMPTY_SVG' | 'MISSING_SECTION' | 'UNKNOWN_COLOR' | 'UNKNOWN_ELEMENT' | 'UNPARSED_CONTENT';
  message: string;
  context: Record<string, unknown>;
};

export interface LineageSource {
  parse(input: string, sourceFile: string): LineageDoc;
}
