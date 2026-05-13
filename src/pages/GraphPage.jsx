import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import MobileShell from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";

/* ─── Constants ──────────────────────────────────────────────── */
const CHAR_W        = 7.2;  // px/char for outer nodes (11px font)
const CENTER_CHAR_W = 8.6;  // px/char for center node (bold, ~13px font)
const PAD_H         = 18;
const CENTER_PAD    = 30;
const NODE_H        = 26;
const NODE_RX       = 13;

function trimLabel(label) { return label.length > 22 ? label.slice(0, 21) + "…" : label; }
function nodeWidth(label)  { return trimLabel(label).length * CHAR_W + PAD_H; }
function centerNodeWidth(label) { return label.length * CENTER_CHAR_W + CENTER_PAD; }

/* ─── Seeded random (mulberry32) ─────────────────────────────── */
function seededRand(seed) {
  let s = (seed + 1) * 2654435761;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s ^= s >>> 16;
  return (s >>> 0) / 0xFFFFFFFF;
}

/* ─── Cloud layout with collision separation ─────────────────── */
function cloudLayout(nodes, cx, cy, maxR, minR) {
  if (!nodes.length) return [];

  // 1. Initial random placement
  let pts = nodes.map((n, i) => {
    const angle = seededRand(i * 13 + 7) * 2 * Math.PI;
    const t     = seededRand(i * 13 + 3);
    const r     = minR + Math.sqrt(t) * (maxR - minR);
    return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  // 2. Iterative separation — push overlapping nodes apart
  for (let iter = 0; iter < 50; iter++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        // Required separation = sum of half-widths + vertical gap
        const minSep = (nodeWidth(a.label) + nodeWidth(b.label)) / 2 + 12;
        if (dist < minSep) {
          const push = (minSep - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          pts[i] = { ...pts[i], x: a.x - nx * push, y: a.y - ny * push };
          pts[j] = { ...pts[j], x: b.x + nx * push, y: b.y + ny * push };
        }
      }
    }
  }
  return pts;
}

/* ─── Graph layout builder ───────────────────────────────────── */
function buildGraph(keyTerms, centerLabel, width, height) {
  const cx  = width  / 2;
  const cy  = height / 2;
  const raw = keyTerms?.nodes ?? [];
  const edges = keyTerms?.edges ?? [];

  const base   = Math.min(width, height);
  const maxR   = Math.min(base * 0.44, Math.max(base * 0.26, base * 0.14 + raw.length * base * 0.014));
  const minR   = 58;

  const positioned = cloudLayout(raw, cx, cy, maxR, minR);
  const byId       = Object.fromEntries(positioned.map((n) => [n.id, n]));

  const spokes = positioned.map((n, i) => ({ id: `s-${i}`, sx: "__center__", tx: n.id }));
  const extra  = edges
    .filter((e) => byId[e.source] && byId[e.target])
    .map((e, i) => ({ id: `e-${i}`, sx: e.source, tx: e.target }));

  return { cx, cy, nodes: positioned, edges: [...spokes, ...extra], center: centerLabel || "Key Terms", hasNodes: raw.length > 0 };
}

/* ─── Parse definitions from terms string ───────────────────── */
function parseTermDefs(raw) {
  const map = {};
  if (!raw?.trim()) return map;
  raw.replace(/\\n/g, "\n").split(/\n\n+/).forEach((entry) => {
    const m = entry.trim().match(/^\*\*(.+?)\*\*\s*[—\-]\s*(.+)$/s);
    if (m) map[m[1].trim().toLowerCase()] = m[2].trim();
  });
  return map;
}

/* ─── Drag positions ─────────────────────────────────────────── */
function useDragPositions(nodes) {
  const [positions, setPositions] = useState({});
  const key = nodes.map((n) => n.id).join(",");
  useEffect(() => { setPositions({}); }, [key]); // eslint-disable-line
  const getPos = useCallback((n) => positions[n.id] ?? { x: n.x, y: n.y }, [positions]);
  return { setPositions, getPos };
}

/* ─── GraphPage ──────────────────────────────────────────────── */
export default function GraphPage() {
  const { keyTerms, summaryVariants, setActiveTab } = useDocument();
  const svgRef     = useRef(null);
  const wrapRef    = useRef(null);
  const isDragging = useRef(false);
  const nodeRefs   = useRef({});

  const [dims,  setDims]  = useState({ width: 380, height: 540 });
  const [popup, setPopup] = useState(null); // { label, def, pctX, pctY }

  useEffect(() => { setActiveTab("graph"); }, [setActiveTab]);

  // Container resize
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0)
        setDims((p) => p.width === Math.round(width) && p.height === Math.round(height)
          ? p : { width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const centerLabel = useMemo(() => {
    const s = summaryVariants?.concise;
    if (!s) return "Key Terms";
    return s.split(/[.!?]/)[0].trim().slice(0, 42) || "Key Terms";
  }, [summaryVariants?.concise]);

  // Center width computed directly — no getBBox needed
  const centerW = useMemo(() => centerNodeWidth(centerLabel), [centerLabel]);

  const termDefs = useMemo(() => parseTermDefs(summaryVariants?.terms ?? ""), [summaryVariants?.terms]);
  const graph    = useMemo(() => buildGraph(keyTerms, centerLabel, dims.width, dims.height), [keyTerms, centerLabel, dims.width, dims.height]);
  const { setPositions, getPos } = useDragPositions(graph.nodes);

  /* ── Drag logic ─── */
  const startDrag = useCallback((nodeId, clientX, clientY) => {
    const svg = svgRef.current; if (!svg) return;
    isDragging.current = false;
    const pt   = svg.createSVGPoint();
    const toSV = (cx, cy) => { pt.x = cx; pt.y = cy; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
    const s0   = toSV(clientX, clientY);
    const node = graph.nodes.find((n) => n.id === nodeId);
    const p0   = node ? (nodeRefs.current[nodeId]?._pos ?? { x: node.x, y: node.y }) : { x: 0, y: 0 };
    const ox = s0.x - p0.x, oy = s0.y - p0.y;
    function onMove(ev) {
      ev.preventDefault(); isDragging.current = true;
      const c = ev.touches ? ev.touches[0] : ev;
      const sp = toSV(c.clientX, c.clientY);
      const np = { x: sp.x - ox, y: sp.y - oy };
      if (nodeRefs.current[nodeId]) nodeRefs.current[nodeId]._pos = np;
      setPositions((p) => ({ ...p, [nodeId]: np }));
    }
    function onEnd() {
      window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("mousemove", onMove);  window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false }); window.addEventListener("touchend", onEnd, { passive: false });
  }, [graph.nodes, setPositions]);

  useEffect(() => {
    const ls = [];
    graph.nodes.forEach((node) => {
      const el = nodeRefs.current[node.id]?._el; if (!el) return;
      function h(e) { e.preventDefault(); startDrag(node.id, e.touches[0].clientX, e.touches[0].clientY); }
      el.addEventListener("touchstart", h, { passive: false });
      ls.push({ el, h });
    });
    return () => ls.forEach(({ el, h }) => el.removeEventListener("touchstart", h));
  }, [graph.nodes, startDrag]);

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return;
    function close(e) { if (!e.target.closest?.(".graph-popup")) setPopup(null); }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [popup]);

  // Resolve edge positions
  const liveEdges = graph.edges.map((e) => {
    const sn  = graph.nodes.find((n) => n.id === e.sx);
    const tn  = graph.nodes.find((n) => n.id === e.tx);
    const src = e.sx === "__center__" ? { x: graph.cx, y: graph.cy } : getPos(sn ?? { id: "", x: 0, y: 0 });
    const tgt = e.tx === "__center__" ? { x: graph.cx, y: graph.cy } : getPos(tn ?? { id: "", x: 0, y: 0 });
    return { ...e, x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y };
  });

  function handleNodeClick(node, x, y) {
    if (isDragging.current) return;
    setPopup({
      label: node.label,
      def:   termDefs[node.label.toLowerCase()] ?? "",
      pctX:  (x / dims.width)  * 100,
      pctY:  (y / dims.height) * 100,
    });
  }

  if (!graph.hasNodes) {
    return (
      <MobileShell topTabs>
        <div className="graph-page graph-page--empty">
          <p className="graph-empty-hint">Summarize a document to generate your key-term graph.</p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell topTabs>
      <div className="graph-page" ref={wrapRef} style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          className="graph-svg"
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          width={dims.width} height={dims.height}
          aria-label="Key term graph"
          onClick={() => setPopup(null)}
        >
          {/* Edges */}
          <g className="graph-edges">
            {liveEdges.map((e) => <line key={e.id} className="graph-line" x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />)}
          </g>

          {/* Outer nodes */}
          {graph.nodes.map((node) => {
            const { x, y } = getPos(node);
            const lbl = trimLabel(node.label);
            const w   = nodeWidth(node.label);
            return (
              <g
                key={node.id}
                className="graph-node-group"
                transform={`translate(${x},${y})`}
                ref={(el) => {
                  if (!nodeRefs.current[node.id]) nodeRefs.current[node.id] = {};
                  nodeRefs.current[node.id]._el = el;
                }}
                onMouseDown={(e) => { isDragging.current = false; startDrag(node.id, e.clientX, e.clientY); }}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(node, x, y); }}
                role="button" tabIndex={0} aria-label={node.label}
              >
                <rect className="graph-node-rect" x={-w/2} y={-NODE_H/2} width={w} height={NODE_H} rx={NODE_RX} />
                <text className="graph-node-label" dominantBaseline="middle" textAnchor="middle">{lbl}</text>
              </g>
            );
          })}

          {/* Center node — width from formula */}
          <g transform={`translate(${graph.cx},${graph.cy})`} style={{ cursor: "default" }} onClick={(e) => e.stopPropagation()}>
            <rect className="graph-node-rect graph-node-rect--center" x={-centerW/2} y={-NODE_H/2} width={centerW} height={NODE_H} rx={NODE_RX} />
            <text className="graph-node-label graph-node-label--center" dominantBaseline="middle" textAnchor="middle">
              {graph.center}
            </text>
          </g>
        </svg>

        {/* Popup */}
        {popup && (
          <div className="graph-popup" style={{ left: `${popup.pctX}%`, top: `${popup.pctY}%` }}>
            <p className="graph-popup__term">{popup.label}</p>
            {popup.def
              ? <p className="graph-popup__def">{popup.def}</p>
              : <p className="graph-popup__def graph-popup__def--none">No definition available yet.</p>
            }
          </div>
        )}
      </div>
    </MobileShell>
  );
}