import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import MobileShell from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";
import { useTheme } from "../context/ThemeContext";

/* ─── Force simulation constants ────────────────────────────── */
const REPULSE_STRENGTH  = 9600;  // node-node repulsion — high so nodes spread wide
const SPRING_LENGTH     = 150;    // rest length of each edge spring (center spokes)
const SPRING_STRENGTH   = 0.028;  // edge spring stiffness
const NESTED_SPRING_LEN = 110;    // shorter spring for peer (non-spoke) edges
const CENTER_PULL       = 0.008;  // very weak gravity — lets nodes roam freely
const CENTER_ANCHOR     = 0.10;   // keeps the center node pinned near canvas center
const DAMPING           = 0.78;   // velocity damping per tick
const TICK_MS           = 16;     // ~60fps simulation
const SETTLE_TICKS      = 420;    // auto-stop after this many quiet ticks
const NODE_R            = 7;      // default node radius px
const NESTED_R          = 5;      // radius for nested (leaf) nodes
const CENTER_R          = 14;     // center node radius px
const LABEL_OFFSET      = 13;     // label below node center

/* ─── Seeded random ──────────────────────────────────────────── */
function seededRand(seed) {
  let s = (seed + 1) * 2654435761;
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  s ^= s >>> 16;
  return (s >>> 0) / 0xFFFFFFFF;
}

/* ─── Build simulation node/edge lists from context data ─────── */
function buildSimData(keyTerms, centerLabel, width, height) {
  const cx  = width  / 2;
  const cy  = height / 2;
  const raw = keyTerms?.nodes ?? [];
  const llmEdgeRaw = (keyTerms?.edges ?? []);

  // Collect node ids with at least one peer (non-center) LLM edge
  // These become "nested" nodes — they won't get a direct spoke to center,
  // instead they cluster around their connected peers.
  const rawIds = new Set(raw.map((n) => n.id));
  const peerConnected = new Set(); // ids that appear in a peer (non-spoke) edge
  llmEdgeRaw.forEach(({ source, target }) => {
    if (rawIds.has(source) && rawIds.has(target)) {
      peerConnected.add(source);
      peerConnected.add(target);
    }
  });

  // Nodes that have at least ONE peer edge but are not also directly spoke-able
  // are "nested" (leaf-like). We keep spokes for nodes that have no peer edges.
  // Nodes with BOTH peer edges AND spoke remain connected to center (hubs).
  // Rule: if a node only appears as a peer (no spoke), mark nested=true.
  // If it has many peer edges it's actually a hub — keep its spoke too.
  const peerEdgeCount = {};
  llmEdgeRaw.forEach(({ source, target }) => {
    if (rawIds.has(source) && rawIds.has(target)) {
      peerEdgeCount[source] = (peerEdgeCount[source] ?? 0) + 1;
      peerEdgeCount[target] = (peerEdgeCount[target] ?? 0) + 1;
    }
  });
  // A node is "nested" (no direct spoke) only if it has exactly 1 peer edge
  // (it's a leaf of another node, not a hub).
  const isNestedNode = (id) => (peerEdgeCount[id] ?? 0) === 1;

  // Center node always id "__center__"
  const simNodes = [
    {
      id: "__center__", label: centerLabel || "Key Terms",
      x: cx, y: cy, vx: 0, vy: 0,
      isCenter: true, isNested: false, degree: raw.length,
    },
    ...raw.map((n, i) => {
      // Spread initial positions much further out from center
      const angle = seededRand(i * 17 + 3) * 2 * Math.PI;
      const r     = 140 + seededRand(i * 17 + 7) * 100;
      return {
        id: n.id, label: n.label,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        vx: (seededRand(i * 31 + 1) - 0.5) * 2,  // tiny random initial velocity
        vy: (seededRand(i * 31 + 9) - 0.5) * 2,
        isCenter: false,
        isNested: isNestedNode(n.id),
        degree: 1,
      };
    }),
  ];

  // Spoke edges — only for non-nested nodes (or nodes with many peer edges)
  const spokeEdges = raw
    .filter((n) => !isNestedNode(n.id))
    .map((n) => ({ source: "__center__", target: n.id, isPeer: false }));

  // Peer (LLM) edges between outer nodes
  const peerEdges = llmEdgeRaw
    .filter(({ source, target }) => rawIds.has(source) && rawIds.has(target))
    .map(({ source, target }) => ({ source, target, isPeer: true }));

  const edgeList = [...spokeEdges, ...peerEdges];

  // Recount degrees
  edgeList.forEach(({ source, target }) => {
    const sn = simNodes.find((n) => n.id === source);
    const tn = simNodes.find((n) => n.id === target);
    if (sn && !sn.isCenter) sn.degree += 1;
    if (tn && !tn.isCenter) tn.degree += 1;
  });

  return { simNodes, simEdges: edgeList };
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

/* ─── Graph CSS — uses CSS variables so light/dark/contrast themes
     are handled automatically. Font sizes use em so ThemeContext
     font-size steps propagate into SVG text.
     Transitions are suppressed by the global reduce-motion rule in
     index.css, but we also gate the force simulation in the
     component itself (see reduceMotion usage below).            ── */
const OBSIDIAN_CSS = `
/* ── Canvas background ───────────────────────────────────────── */
.obsidian-canvas {
  /* Dark mode: keep the deep navy. Light mode: use the page mesh so
     the graph feels part of the app instead of a black box inside it. */
  background: var(--graph-canvas-bg);
  overflow: hidden;
}

.obsidian-svg {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
}

/* ── Edges ───────────────────────────────────────────────────── */
.obsidian-edge {
  stroke: var(--graph-edge);
  stroke-width: 1.2;
  pointer-events: none;
  transition: stroke 0.15s, opacity 0.15s;
}
.obsidian-edge--lit {
  stroke: var(--graph-edge-lit);
  stroke-width: 1.8;
}

/* ── Nodes ───────────────────────────────────────────────────── */
.obsidian-node {
  fill: var(--graph-node);
  stroke: var(--graph-node-stroke);
  stroke-width: 1.5;
  cursor: pointer;
  transition: fill 0.15s;
}
.obsidian-node--center {
  fill: var(--graph-node-center);
  stroke: var(--graph-node-center-stroke);
  stroke-width: 2;
}
.obsidian-node--hovered {
  fill: var(--graph-node-hovered);
  stroke: var(--graph-node-hovered-stroke);
  stroke-width: 2;
}
.obsidian-node--nested {
  fill: var(--graph-node-nested);
  stroke: var(--graph-node-nested-stroke);
  stroke-width: 1;
}
.obsidian-node-glow {
  fill: var(--graph-node-glow);
  pointer-events: none;
}

/* ── Labels — em-based sizes so ThemeContext font steps apply ── */
.obsidian-label {
  fill: var(--graph-label);
  font-family: var(--font-body, system-ui);
  font-size: 0.625em;   /* ≈10px at 16px base */
  font-weight: 400;
  pointer-events: none;
  letter-spacing: 0.01em;
}
.obsidian-label--center {
  fill: var(--graph-label-center);
  font-size: 0.6875em;  /* ≈11px at 16px base */
  font-weight: 700;
}
.obsidian-label--hovered {
  fill: var(--graph-label-hovered);
  font-weight: 600;
}
.obsidian-label--nested {
  fill: var(--graph-label-nested);
  font-size: 0.5625em;  /* ≈9px at 16px base */
}

/* ── Hint text ───────────────────────────────────────────────── */
.obsidian-hint {
  bottom: 10px;
  color: var(--graph-hint);
  font-family: var(--font-body, system-ui);
  font-size: 0.5625em;  /* ≈9px at 16px base */
  left: 50%;
  pointer-events: none;
  position: absolute;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* ── Dark mode tokens ────────────────────────────────────────── */
html:not(.dark) .obsidian-canvas,
html:not(.dark) .obsidian-canvas * {
  --graph-canvas-bg:          var(--bg-mesh);
  --graph-edge:               rgba(80,90,110,0.30);
  --graph-edge-lit:           rgba(108,154,158,0.85);
  --graph-node:               rgba(108,154,158,0.22);
  --graph-node-stroke:        rgba(108,154,158,0.65);
  --graph-node-center:        var(--clr-teal);
  --graph-node-center-stroke: #5a8a8e;
  --graph-node-hovered:       rgba(108,154,158,0.45);
  --graph-node-hovered-stroke:var(--clr-teal);
  --graph-node-nested:        rgba(158,139,178,0.18);
  --graph-node-nested-stroke: rgba(158,139,178,0.55);
  --graph-node-glow:          rgba(108,154,158,0.18);
  --graph-label:              var(--text-secondary);
  --graph-label-center:       var(--text-primary);
  --graph-label-hovered:      var(--text-primary);
  --graph-label-nested:       var(--text-muted);
  --graph-hint:               var(--text-muted);
}

html.dark .obsidian-canvas,
html.dark .obsidian-canvas * {
  --graph-canvas-bg:          #0f1117;
  --graph-edge:               rgba(130,140,160,0.28);
  --graph-edge-lit:           rgba(108,154,158,0.75);
  --graph-node:               #3a5068;
  --graph-node-stroke:        rgba(108,154,158,0.55);
  --graph-node-center:        #6c9a9e;
  --graph-node-center-stroke: #a8d4d8;
  --graph-node-hovered:       #7ab4b8;
  --graph-node-hovered-stroke:#c0e8ec;
  --graph-node-nested:        #2a3a52;
  --graph-node-nested-stroke: rgba(158,139,178,0.50);
  --graph-node-glow:          rgba(108,154,158,0.12);
  --graph-label:              rgba(200,210,225,0.72);
  --graph-label-center:       #a8d4d8;
  --graph-label-hovered:      #e0f0f2;
  --graph-label-nested:       rgba(180,190,210,0.55);
  --graph-hint:               rgba(160,170,185,0.45);
}

/* ── High contrast overrides ─────────────────────────────────── */
html.high-contrast .obsidian-canvas,
html.high-contrast .obsidian-canvas * {
  --graph-canvas-bg:          var(--bg-mesh);
  --graph-edge:               rgba(0,0,0,0.45);
  --graph-edge-lit:           #000000;
  --graph-node:               #ffffff;
  --graph-node-stroke:        #000000;
  --graph-node-center:        #000000;
  --graph-node-center-stroke: #000000;
  --graph-node-hovered:       #333333;
  --graph-node-hovered-stroke:#000000;
  --graph-node-nested:        #f0f0f0;
  --graph-node-nested-stroke: #000000;
  --graph-node-glow:          rgba(0,0,0,0.10);
  --graph-label:              #000000;
  --graph-label-center:       #ffffff;
  --graph-label-hovered:      #ffffff;
  --graph-label-nested:       #333333;
  --graph-hint:               #333333;
}

html.dark.high-contrast .obsidian-canvas,
html.dark.high-contrast .obsidian-canvas * {
  --graph-canvas-bg:          #000000;
  --graph-edge:               rgba(255,255,255,0.45);
  --graph-edge-lit:           #ffffff;
  --graph-node:               #1a1a1a;
  --graph-node-stroke:        #ffffff;
  --graph-node-center:        #ffffff;
  --graph-node-center-stroke: #ffffff;
  --graph-node-hovered:       #333333;
  --graph-node-hovered-stroke:#ffffff;
  --graph-node-nested:        #111111;
  --graph-node-nested-stroke: #ffffff;
  --graph-node-glow:          rgba(255,255,255,0.10);
  --graph-label:              #ffffff;
  --graph-label-center:       #000000;
  --graph-label-hovered:      #000000;
  --graph-label-nested:       #cccccc;
  --graph-hint:               #cccccc;
}
`;

function useInjectStyles(css, id) {
  useEffect(() => {
    // Remove any stale version before injecting so theme-token updates land
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
    return () => { document.getElementById(id)?.remove(); };
  // css is a module-level constant — this runs once on mount, which is correct
  // because the style block uses CSS variables that respond to class changes on
  // <html> automatically (no re-injection needed on theme toggle).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/* ─── Main component ─────────────────────────────────────────── */
export default function GraphPage() {
  useInjectStyles(OBSIDIAN_CSS, "obsidian-graph-styles");

  const { keyTerms, summaryVariants, setActiveTab } = useDocument();
  const { reduceMotion } = useTheme();
  const wrapRef  = useRef(null);
  const canvasRef = useRef(null);
  const animRef  = useRef(null);
  const simRef   = useRef({ nodes: [], edges: [], running: false, ticks: 0 });

  const [dims,    setDims]    = useState({ width: 380, height: 540 });
  const [frame,   setFrame]   = useState(0);   // increment to trigger re-render
  const [hovered, setHovered] = useState(null); // node id
  const [popup,   setPopup]   = useState(null); // { label, def, x, y }

  // Pan & zoom state
  const viewRef  = useRef({ x: 0, y: 0, scale: 1 });
  const panRef   = useRef({ panning: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const pinchRef = useRef({ active: false, dist: 0 });

  useEffect(() => { setActiveTab("graph"); }, [setActiveTab]);

  // Container resize
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 10 && height > 10)
        setDims((p) => {
          const w = Math.round(width), h = Math.round(height);
          return p.width === w && p.height === h ? p : { width: w, height: h };
        });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const centerLabel = useMemo(() => {
    const s = summaryVariants?.concise;
    if (!s) return "Key Terms";
    return s.split(/[.!?]/)[0].trim().slice(0, 38) || "Key Terms";
  }, [summaryVariants?.concise]);

  const termDefs = useMemo(() => parseTermDefs(summaryVariants?.terms ?? ""), [summaryVariants?.terms]);

  // Build / rebuild sim when keyTerms or dims change
  const simDataKey = JSON.stringify(keyTerms) + dims.width + dims.height;
  useEffect(() => {
    const { simNodes, simEdges } = buildSimData(keyTerms, centerLabel, dims.width, dims.height);
    simRef.current.nodes   = simNodes;
    simRef.current.edges   = simEdges;
    simRef.current.ticks   = 0;
    viewRef.current        = { x: 0, y: 0, scale: 1 };

    if (reduceMotion) {
      // Run the physics to a settled state synchronously — no animation loop,
      // no setTimeout, no setFrame calls. Just position the nodes and render once.
      const sim = simRef.current;
      for (let t = 0; t < SETTLE_TICKS; t++) {
        const { nodes, edges } = sim;
        const cx = dims.width / 2, cy = dims.height / 2;
        nodes.forEach((n) => { n.fx = 0; n.fy = 0; });
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
            const f = REPULSE_STRENGTH / (dist * dist);
            const nx = dx / dist, ny = dy / dist;
            a.fx -= nx * f; a.fy -= ny * f;
            b.fx += nx * f; b.fy += ny * f;
          }
        }
        edges.forEach(({ source, target, isPeer }) => {
          const a = nodes.find((n) => n.id === source);
          const b = nodes.find((n) => n.id === target);
          if (!a || !b) return;
          const restLen = isPeer ? NESTED_SPRING_LEN : SPRING_LENGTH;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const f = (dist - restLen) * SPRING_STRENGTH;
          const nx = dx / dist, ny = dy / dist;
          a.fx += nx * f; a.fy += ny * f;
          b.fx -= nx * f; b.fy -= ny * f;
        });
        nodes.forEach((n) => {
          if (!n.isCenter) {
            n.fx += (cx - n.x) * CENTER_PULL;
            n.fy += (cy - n.y) * CENTER_PULL;
          } else {
            n.fx += (cx - n.x) * CENTER_ANCHOR;
            n.fy += (cy - n.y) * CENTER_ANCHOR;
          }
          n.vx = (n.vx + n.fx) * DAMPING;
          n.vy = (n.vy + n.fy) * DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        });
      }
      // Single render pass — no animation
      setFrame((f) => f + 1);
    } else {
      startSim();
    }
    return stopSim;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simDataKey, reduceMotion]);

  /* ── Force simulation tick ── */
  function tick() {
    const sim = simRef.current;
    const { nodes, edges } = sim;
    if (!nodes.length) return;

    const cx = dims.width  / 2;
    const cy = dims.height / 2;

    // Reset forces
    nodes.forEach((n) => { n.fx = 0; n.fy = 0; });

    // Node-node repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx   = b.x - a.x;
        const dy   = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const f    = REPULSE_STRENGTH / (dist * dist);
        const nx = dx / dist, ny = dy / dist;
        a.fx -= nx * f;  a.fy -= ny * f;
        b.fx += nx * f;  b.fy += ny * f;
      }
    }

    // Edge springs — peer edges use shorter rest length so nested clusters stay tight
    edges.forEach(({ source, target, isPeer }) => {
      const a = nodes.find((n) => n.id === source);
      const b = nodes.find((n) => n.id === target);
      if (!a || !b) return;
      const restLen = isPeer ? NESTED_SPRING_LEN : SPRING_LENGTH;
      const dx   = b.x - a.x;
      const dy   = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f    = (dist - restLen) * SPRING_STRENGTH;
      const nx = dx / dist, ny = dy / dist;
      a.fx += nx * f;  a.fy += ny * f;
      b.fx -= nx * f;  b.fy -= ny * f;
    });

    // Very weak center gravity — keeps layout from drifting off canvas
    nodes.forEach((n) => {
      if (n.isCenter) return;
      n.fx += (cx - n.x) * CENTER_PULL;
      n.fy += (cy - n.y) * CENTER_PULL;
    });

    // Anchor center node firmly near canvas center
    const centerNode = nodes.find((n) => n.isCenter);
    if (centerNode) {
      centerNode.fx += (cx - centerNode.x) * CENTER_ANCHOR;
      centerNode.fy += (cy - centerNode.y) * CENTER_ANCHOR;
    }

    // Integrate velocities
    let maxSpeed = 0;
    nodes.forEach((n) => {
      n.vx = (n.vx + n.fx) * DAMPING;
      n.vy = (n.vy + n.fy) * DAMPING;
      n.x += n.vx;
      n.y += n.vy;
      const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (spd > maxSpeed) maxSpeed = spd;
    });

    sim.ticks++;
    setFrame((f) => f + 1);

    // Auto-stop when settled
    if (sim.ticks > SETTLE_TICKS || (sim.ticks > 80 && maxSpeed < 0.12)) {
      stopSim();
    }
  }

  function startSim() {
    stopSim();
    simRef.current.running = true;
    simRef.current.ticks   = 0;
    function loop() {
      if (!simRef.current.running) return;
      tick();
      animRef.current = setTimeout(loop, TICK_MS);
    }
    animRef.current = setTimeout(loop, TICK_MS);
  }

  function stopSim() {
    simRef.current.running = false;
    clearTimeout(animRef.current);
  }

  /* ── Node drag ── */
  const dragRef = useRef({ active: false, nodeId: null, startSX: 0, startSY: 0, startNX: 0, startNY: 0 });

  const screenToSim = useCallback((sx, sy) => {
    const v = viewRef.current;
    return { x: (sx - v.x) / v.scale, y: (sy - v.y) / v.scale };
  }, []);

  const startNodeDrag = useCallback((nodeId, sx, sy) => {
    const node = simRef.current.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    dragRef.current = { active: true, nodeId, startSX: sx, startSY: sy, startNX: node.x, startNY: node.y };
    stopSim();
    node.vx = 0; node.vy = 0;
  }, []);

  /* ── Pan ── */
  const startPan = useCallback((sx, sy) => {
    const v = viewRef.current;
    panRef.current = { panning: true, startX: sx, startY: sy, originX: v.x, originY: v.y };
  }, []);

  /* ── Zoom ── */
  const applyZoom = useCallback((delta, pivotSX, pivotSY) => {
    const v = viewRef.current;
    const factor = delta > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.25, Math.min(4, v.scale * factor));
    const ratio    = newScale / v.scale;
    viewRef.current = {
      x:     pivotSX - (pivotSX - v.x) * ratio,
      y:     pivotSY - (pivotSY - v.y) * ratio,
      scale: newScale,
    };
    setFrame((f) => f + 1);
  }, []);

  /* ── Pointer event handlers on the canvas SVG ── */
  const getNodeAtPoint = useCallback((sx, sy) => {
    const sim = screenToSim(sx, sy);
    return simRef.current.nodes.find((n) => {
      const r = n.isCenter ? CENTER_R : n.isNested ? NESTED_R : (NODE_R + Math.min(n.degree - 1, 4));
      const dx = n.x - sim.x, dy = n.y - sim.y;
      return Math.sqrt(dx * dx + dy * dy) <= r + 6; // +6px hit padding
    }) ?? null;
  }, [screenToSim]);

  // Unified pointer down
  const onPointerDown = useCallback((e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const hit = getNodeAtPoint(sx, sy);
    if (hit) {
      startNodeDrag(hit.id, sx, sy);
    } else {
      startPan(sx, sy);
    }
  }, [getNodeAtPoint, startNodeDrag, startPan]);

  const onPointerMove = useCallback((e) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    // Hover detection
    const hit = getNodeAtPoint(sx, sy);
    setHovered(hit ? hit.id : null);
    wrap.style.cursor = hit ? "pointer" : (panRef.current.panning ? "grabbing" : "grab");

    if (dragRef.current.active) {
      const sim = screenToSim(sx, sy);
      const s0  = screenToSim(dragRef.current.startSX, dragRef.current.startSY);
      const node = simRef.current.nodes.find((n) => n.id === dragRef.current.nodeId);
      if (node) {
        node.x = dragRef.current.startNX + (sim.x - s0.x);
        node.y = dragRef.current.startNY + (sim.y - s0.y);
        node.vx = 0; node.vy = 0;
        setFrame((f) => f + 1);
      }
    } else if (panRef.current.panning) {
      const dx = sx - panRef.current.startX;
      const dy = sy - panRef.current.startY;
      viewRef.current = { ...viewRef.current, x: panRef.current.originX + dx, y: panRef.current.originY + dy };
      setFrame((f) => f + 1);
    }
  }, [getNodeAtPoint, screenToSim]);

  const onPointerUp = useCallback((e) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (dragRef.current.active) {
      // Was it a tap vs a drag?
      const moved = Math.hypot(sx - dragRef.current.startSX, sy - dragRef.current.startSY);
      if (moved < 6) {
        // Treat as click → show popup
        const node = simRef.current.nodes.find((n) => n.id === dragRef.current.nodeId);
        if (node) {
          const v = viewRef.current;
          setPopup({
            label:  node.label,
            def:    termDefs[node.label.toLowerCase()] ?? "",
            screenX: node.x * v.scale + v.x,
            screenY: node.y * v.scale + v.y,
          });
        }
      } else {
        // Restart sim after drag release so graph re-settles
        startSim();
      }
      dragRef.current.active = false;
    }
    panRef.current.panning = false;
    wrap.style.cursor = "grab";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termDefs]);

  // Wheel zoom
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    applyZoom(e.deltaY, e.clientX - rect.left, e.clientY - rect.top);
  }, [applyZoom]);

  // Pinch zoom
  const onTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, dist: Math.sqrt(dx * dx + dy * dy) };
    } else if (e.touches.length === 1) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const sx = e.touches[0].clientX - rect.left;
      const sy = e.touches[0].clientY - rect.top;
      const hit = getNodeAtPoint(sx, sy);
      if (hit) startNodeDrag(hit.id, sx, sy);
      else startPan(sx, sy);
    }
  }, [getNodeAtPoint, startNodeDrag, startPan]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current.active) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const cx   = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy_t = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        applyZoom(pinchRef.current.dist > dist ? 1 : -1, cx - rect.left, cy_t - rect.top);
      }
      pinchRef.current.dist = dist;
    } else if (e.touches.length === 1) {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const sx = e.touches[0].clientX - rect.left;
      const sy = e.touches[0].clientY - rect.top;
      if (dragRef.current.active) {
        const sim = screenToSim(sx, sy);
        const s0  = screenToSim(dragRef.current.startSX, dragRef.current.startSY);
        const node = simRef.current.nodes.find((n) => n.id === dragRef.current.nodeId);
        if (node) {
          node.x  = dragRef.current.startNX + (sim.x - s0.x);
          node.y  = dragRef.current.startNY + (sim.y - s0.y);
          node.vx = 0; node.vy = 0;
          setFrame((f) => f + 1);
        }
      } else if (panRef.current.panning) {
        const dx = sx - panRef.current.startX;
        const dy = sy - panRef.current.startY;
        viewRef.current = { ...viewRef.current, x: panRef.current.originX + dx, y: panRef.current.originY + dy };
        setFrame((f) => f + 1);
      }
    }
  }, [applyZoom, screenToSim]);

  const onTouchEnd = useCallback((e) => {
    pinchRef.current.active = false;
    if (dragRef.current.active) {
      const wrap = wrapRef.current;
      if (wrap) {
        const rect = wrap.getBoundingClientRect();
        const t    = e.changedTouches[0];
        const moved = Math.hypot(t.clientX - rect.left - dragRef.current.startSX, t.clientY - rect.top - dragRef.current.startSY);
        if (moved < 6) {
          const node = simRef.current.nodes.find((n) => n.id === dragRef.current.nodeId);
          if (node) {
            const v = viewRef.current;
            setPopup({ label: node.label, def: termDefs[node.label.toLowerCase()] ?? "", screenX: node.x * v.scale + v.x, screenY: node.y * v.scale + v.y });
          }
        } else {
          startSim();
        }
      }
      dragRef.current.active = false;
    }
    panRef.current.panning = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termDefs]);

  // Attach wheel passively — needs { passive: false } to preventDefault
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Close popup on outside click
  useEffect(() => {
    if (!popup) return;
    function close(e) { if (!e.target.closest?.(".graph-popup")) setPopup(null); }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [popup]);

  // Empty state
  const hasNodes = (keyTerms?.nodes?.length ?? 0) > 0;
  if (!hasNodes) {
    return (
      <MobileShell topTabs>
        <div className="graph-page graph-page--empty">
          <p className="graph-empty-hint">Summarize a document to generate your key-term graph.</p>
        </div>
      </MobileShell>
    );
  }

  /* ── Render ── */
  const { nodes, edges } = simRef.current;
  const v = viewRef.current;
  const transform = `translate(${v.x},${v.y}) scale(${v.scale})`;

  // Neighbour set for hover highlighting
  const hovNeighbours = useMemo(() => {
    if (!hovered) return null;
    const set = new Set([hovered]);
    edges.forEach(({ source, target }) => {
      if (source === hovered) set.add(target);
      if (target === hovered) set.add(source);
    });
    return set;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, edges.length]);

  return (
    <MobileShell topTabs>
      <div
        className="graph-page obsidian-canvas"
        ref={wrapRef}
        style={{ position: "relative", cursor: "grab", userSelect: "none", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <svg
          ref={canvasRef}
          className="graph-svg obsidian-svg"
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          width={dims.width}
          height={dims.height}
          aria-label="Key term graph"
        >
          <g transform={transform}>
            {/* Edges */}
            {edges.map((e, i) => {
              const sn = nodes.find((n) => n.id === e.source);
              const tn = nodes.find((n) => n.id === e.target);
              if (!sn || !tn) return null;
              const isLit = hovNeighbours ? (hovNeighbours.has(e.source) && hovNeighbours.has(e.target)) : false;
              return (
                <line
                  key={i}
                  x1={sn.x} y1={sn.y} x2={tn.x} y2={tn.y}
                  className={`obsidian-edge${isLit ? " obsidian-edge--lit" : ""}`}
                  style={hovNeighbours && !isLit ? { opacity: 0.08 } : undefined}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const r        = node.isCenter ? CENTER_R
                             : node.isNested ? NESTED_R
                             : (NODE_R + Math.min(node.degree - 1, 4));
              const isHov    = hovered === node.id;
              const isDimmed = hovNeighbours ? !hovNeighbours.has(node.id) : false;
              const nodeClass = [
                "obsidian-node",
                node.isCenter ? "obsidian-node--center"  : "",
                node.isNested ? "obsidian-node--nested"  : "",
                isHov         ? "obsidian-node--hovered" : "",
              ].filter(Boolean).join(" ");
              const labelClass = [
                "obsidian-label",
                node.isCenter ? "obsidian-label--center" : "",
                node.isNested ? "obsidian-label--nested" : "",
                isHov         ? "obsidian-label--hovered": "",
              ].filter(Boolean).join(" ");
              return (
                <g key={node.id} style={{ opacity: isDimmed ? 0.18 : 1, transition: reduceMotion ? "none" : "opacity 0.15s" }}>
                  {/* Glow ring on hover */}
                  {isHov && (
                    <circle cx={node.x} cy={node.y} r={r + 7} className="obsidian-node-glow" />
                  )}
                  {/* Dashed orbit ring for nested nodes */}
                  {node.isNested && !isHov && (
                    <circle cx={node.x} cy={node.y} r={r + 4}
                      fill="none" stroke="rgba(158,139,178,0.35)" strokeWidth="1" strokeDasharray="2 2" />
                  )}
                  <circle cx={node.x} cy={node.y} r={r} className={nodeClass} />
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + r + LABEL_OFFSET}
                    className={labelClass}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                  >
                    {node.label.length > 20 ? node.label.slice(0, 19) + "…" : node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Popup */}
        {popup && (
          <div
            className="graph-popup"
            style={{
              left: Math.min(Math.max(popup.screenX, 100), dims.width - 100),
              top:  Math.max(popup.screenY - (CENTER_R + 10) * v.scale - 10, 10),
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="graph-popup__term">{popup.label}</p>
            {popup.def
              ? <p className="graph-popup__def">{popup.def}</p>
              : <p className="graph-popup__def graph-popup__def--none">No definition available.</p>
            }
          </div>
        )}

        {/* Zoom hint */}
        <span className="obsidian-hint">Scroll to zoom · Drag to pan · Drag node to move</span>
      </div>
    </MobileShell>
  );
}