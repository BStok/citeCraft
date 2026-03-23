import { useState } from 'react';

const NODES = [
  { id: 0, x: 250, y: 80,  label: 'Transformer Architecture', author: 'Vaswani et al.',    city: 'Mountain View', year: '2017' },
  { id: 1, x: 95,  y: 178, label: 'Attention Mechanism',      author: 'Bahdanau et al.',   city: 'Montreal',      year: '2015' },
  { id: 2, x: 410, y: 168, label: 'BERT Pretraining',         author: 'Devlin et al.',     city: 'Seattle',       year: '2018' },
  { id: 3, x: 155, y: 298, label: 'Word Embeddings',          author: 'Mikolov et al.',    city: 'Prague',        year: '2013' },
  { id: 4, x: 345, y: 308, label: 'GPT Language Model',       author: 'Radford et al.',    city: 'San Francisco', year: '2018' },
  { id: 5, x: 72,  y: 362, label: 'Recurrent Networks',       author: 'Hochreiter et al.', city: 'Munich',        year: '2014' },
  { id: 6, x: 438, y: 348, label: 'Fine-tuning Methods',      author: 'Howard et al.',     city: 'San Francisco', year: '2019' },
  { id: 7, x: 250, y: 378, label: 'Transfer Learning',        author: 'Pan et al.',        city: 'Hong Kong',     year: '2020' },
  { id: 8, x: 168, y: 118, label: 'Sequence Modeling',        author: 'Sutskever et al.',  city: 'Toronto',       year: '2016' },
  { id: 9, x: 375, y: 98,  label: 'Multi-head Attention',     author: 'Luong et al.',      city: 'Stanford',      year: '2017' },
];

const EDGES = [
  [0,1],[0,2],[0,8],[0,9],
  [1,3],[1,8],
  [2,4],[2,6],
  [3,5],[3,7],
  [4,6],[4,7],
  [8,9],[5,7],
];

const ACCENT      = 'hsl(345,40%,52%)';
const ACCENT_RING = 'hsl(345,40%,72%)';
const NODE_DEFAULT  = '#E5E7EB';
const NODE_STROKE   = '#C9CDD3';
const EDGE_DEFAULT  = '#D1D5DB';
const EDGE_ACTIVE   = ACCENT;

// Tooltip dimensions
const TW = 130; // width
const TH = 58;  // height
const TR = 6;   // border-radius

function getNeighbors(nodeId: number): Set<number> {
  const set = new Set<number>();
  EDGES.forEach(([a, b]) => {
    if (a === nodeId) set.add(b);
    if (b === nodeId) set.add(a);
  });
  return set;
}

// Clamp tooltip so it stays inside the 500×420 viewBox
function tooltipX(nx: number): number {
  const half = TW / 2;
  if (nx - half < 4) return 4;
  if (nx + half > 496) return 496 - TW;
  return nx - half;
}
function tooltipY(ny: number): number {
  const above = ny - TH - 18;
  return above < 4 ? ny + 18 : above;
}

interface TooltipProps {
  n: typeof NODES[number];
}
function Tooltip({ n }: TooltipProps) {
  const tx = tooltipX(n.x);
  const ty = tooltipY(n.y);
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={tx} y={ty}
        width={TW} height={TH}
        rx={TR}
        fill="white"
        stroke="#E5E7EB"
        strokeWidth={0.75}
        filter="url(#ttShadow)"
      />
      {/* Title */}
      <text
        x={tx + TW / 2}
        y={ty + 16}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={600}
        fill="#111111"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {n.label}
      </text>
      {/* Author */}
      <text
        x={tx + TW / 2}
        y={ty + 31}
        textAnchor="middle"
        fontSize={9.5}
        fill="#6B7280"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {n.author}
      </text>
      {/* City · Year */}
      <text
        x={tx + TW / 2}
        y={ty + 46}
        textAnchor="middle"
        fontSize={9}
        fill="#9CA3AF"
        fontFamily="Inter, system-ui, sans-serif"
      >
        {n.city} · {n.year}
      </text>
    </g>
  );
}

export function CitationNetwork() {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  const neighbors = hoveredNode !== null ? getNeighbors(hoveredNode) : new Set<number>();
  const hasHover  = hoveredNode !== null;

  const isNodeActive  = (id: number) => id === hoveredNode || neighbors.has(id);
  const isEdgeActive  = (a: number, b: number) =>
    hasHover && (a === hoveredNode || b === hoveredNode);

  return (
    <div className="w-full h-full bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">

      {/* Hint bar at the top */}
      <div className="flex items-center justify-center gap-1.5 px-4 py-2 border-b border-border/60 bg-background/60">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="hsl(345,40%,52%)" strokeWidth="1.2" fill="hsl(345,40%,52%)" fillOpacity="0.15"/>
          <circle cx="6" cy="6" r="2" fill="hsl(345,40%,52%)"/>
        </svg>
        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '0.01em' }}>
          Hover a paper node to explore citation relationships
        </span>
      </div>

      {/* SVG graph */}
      <div className="flex-1 relative">
        <svg
          viewBox="0 0 500 420"
          width="100%"
          height="100%"
          style={{ display: 'block' }}
        >
          <defs>
            <filter id="ttShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodOpacity="0.10" />
            </filter>
          </defs>

          {/* ── Edges ── */}
          {EDGES.map(([a, b], i) => {
            const na = NODES[a];
            const nb = NODES[b];
            const active = isEdgeActive(a, b);
            return (
              <line
                key={i}
                x1={na.x} y1={na.y}
                x2={nb.x} y2={nb.y}
                stroke={active ? EDGE_ACTIVE : EDGE_DEFAULT}
                strokeWidth={active ? 2 : 0.75}
                opacity={1}
                style={{ transition: 'stroke 0.18s, stroke-width 0.18s' }}
              />
            );
          })}

          {/* ── Nodes (rendered below tooltips) ── */}
          {NODES.map(n => {
            const active = isNodeActive(n.id);
            return (
              <circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={8}
                fill={active ? ACCENT : NODE_DEFAULT}
                stroke={active ? ACCENT_RING : NODE_STROKE}
                strokeWidth={active ? 2 : 1}
                style={{ cursor: 'pointer', transition: 'fill 0.18s, stroke 0.18s' }}
                onMouseEnter={() => setHoveredNode(n.id)}
                onMouseLeave={() => setHoveredNode(null)}
              />
            );
          })}

          {/* ── Tooltips (rendered on top) ── */}
          {hasHover && NODES.map(n => {
            const show = n.id === hoveredNode || neighbors.has(n.id);
            if (!show) return null;
            return <Tooltip key={n.id} n={n} />;
          })}

        </svg>
      </div>
    </div>
  );
}
