import { useEffect, useRef, useState, useCallback } from "react";
import MobileShell from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";

/* ─── Layout helpers ─────────────────────────────────────────── */
function radialLayout(nodes, cx, cy, radius) {
  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return {
      ...node,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

function buildGraphLayout(keyTerms, centerLabel, width, height) {
  const cx     = width  / 2;
  const cy     = height / 2;
  const radius = Math.min(width, height) * 0.32;

  const rawNodes = keyTerms?.nodes ?? [];
  const rawEdges = keyTerms?.edges ?? [];
  const center   = centerLabel || "Key Terms";
  const isSample = false;

  const positioned = radialLayout(rawNodes, cx, cy, radius);
  const byId       = Object.fromEntries(positioned.map((n) => [n.id, n]));

  // Edges stored as ID references — never raw coordinates
  const edges = rawEdges
    .filter((e) => byId[e.source] && byId[e.target])
    .map((e, i) => ({ id: `e-${i}`, sourceId: e.source, targetId: e.target }));

  const spokes = positioned.map((n, i) => ({
    id: `spoke-${i}`,
    sourceId: "__center__",
    targetId: n.id,
  }));

  const hasNodes = rawNodes.length > 0;
  return { cx, cy, nodes: positioned, edges: [...spokes, ...edges], center, hasNodes };
}

/* ─── Drag positions state ───────────────────────────────────── */
function useDragPositions(initialNodes) {
  const [positions, setPositions] = useState({});

  // Only reset when node IDs actually change — not on every render
  const nodeKey = initialNodes.map((n) => n.id).join(",");
  useEffect(() => {
    setPositions({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  const getPos = useCallback(
    (node) => positions[node.id] ?? { x: node.x, y: node.y },
    [positions]
  );

  return { positions, setPositions, getPos };
}

/* ─── GraphPage ──────────────────────────────────────────────── */
export default function GraphPage() {
  const { keyTerms, summaryVariants, setActiveTab } = useDocument();
  const svgRef  = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ width: 380, height: 580 });

  useEffect(() => { setActiveTab("graph"); }, [setActiveTab]);

  // Measure container responsively
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDims((prev) => {
          if (prev.width === Math.round(width) && prev.height === Math.round(height)) return prev;
          return { width: Math.round(width), height: Math.round(height) };
        });
      }
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const centerLabel = summaryVariants?.concise
    ? summaryVariants.concise.split(/[.!?]/)[0].trim().slice(0, 24) || "Key"
    : "Key";

  const graph = buildGraphLayout(keyTerms, centerLabel, dims.width, dims.height);
  const { setPositions, getPos } = useDragPositions(graph.nodes);

  // Drag handler — attached via useEffect so we can use { passive: false }
  // JSX onTouchStart is passive by default and cannot call preventDefault
  const nodeGroupRefs = useRef({});

  const startDrag = useCallback((nodeId, clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    function toSVG(cx, cy) {
      pt.x = cx; pt.y = cy;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    const startSVG = toSVG(clientX, clientY);
    const node     = graph.nodes.find((n) => n.id === nodeId);
    const startPos = node
      ? (nodeGroupRefs.current[nodeId]?._pos ?? { x: node.x, y: node.y })
      : { x: 0, y: 0 };

    const offsetX = startSVG.x - startPos.x;
    const offsetY = startSVG.y - startPos.y;

    function onMove(ev) {
      ev.preventDefault();
      const client = ev.touches ? ev.touches[0] : ev;
      const svgPt  = toSVG(client.clientX, client.clientY);
      const newPos = { x: svgPt.x - offsetX, y: svgPt.y - offsetY };
      if (nodeGroupRefs.current[nodeId]) nodeGroupRefs.current[nodeId]._pos = newPos;
      setPositions((prev) => ({ ...prev, [nodeId]: newPos }));
    }

    function onEnd() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onEnd);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend",  onEnd,  { passive: false });
  }, [graph.nodes, setPositions]);

  // Attach non-passive touchstart directly to each node DOM element
  useEffect(() => {
    const listeners = [];
    graph.nodes.forEach((node) => {
      const el = nodeGroupRefs.current[node.id]?._el;
      if (!el) return;
      function handler(e) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrag(node.id, touch.clientX, touch.clientY);
      }
      el.addEventListener("touchstart", handler, { passive: false });
      listeners.push({ el, handler });
    });
    return () => listeners.forEach(({ el, handler }) =>
      el.removeEventListener("touchstart", handler)
    );
  }, [graph.nodes, startDrag]);

  // Live edge resolution using dragged positions
  const liveEdges = graph.edges.map((e) => {
    const srcNode = graph.nodes.find((n) => n.id === e.sourceId);
    const tgtNode = graph.nodes.find((n) => n.id === e.targetId);
    const src = e.sourceId === "__center__" ? { x: graph.cx, y: graph.cy } : getPos(srcNode ?? { id: e.sourceId, x: 0, y: 0 });
    const tgt = e.targetId === "__center__" ? { x: graph.cx, y: graph.cy } : getPos(tgtNode ?? { id: e.targetId, x: 0, y: 0 });
    return { ...e, x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y };
  });

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
      <div className="graph-page" ref={wrapRef}>
        <svg
          ref={svgRef}
          className="graph-svg"
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          width={dims.width}
          height={dims.height}
          aria-label="Key term graph"
        >
          <g className="graph-edges">
            {liveEdges.map((e) => (
              <line key={e.id} className="graph-line"
                x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} />
            ))}
          </g>

          <g className="graph-center-group">
            <circle className="graph-center-circle"
              cx={graph.cx} cy={graph.cy} r={38} />
            <text className="graph-center-label"
              x={graph.cx} y={graph.cy}
              dominantBaseline="middle" textAnchor="middle">
              {graph.center.length > 14 ? graph.center.slice(0, 13) + "…" : graph.center}
            </text>
          </g>

          {graph.nodes.map((node) => {
            const { x, y } = getPos(node);
            const label    = node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label;
            return (
              <g
                key={node.id}
                className="graph-node-group"
                transform={`translate(${x},${y})`}
                ref={(el) => {
                  if (!nodeGroupRefs.current[node.id]) nodeGroupRefs.current[node.id] = {};
                  nodeGroupRefs.current[node.id]._el = el;
                }}
                onMouseDown={(e) => startDrag(node.id, e.clientX, e.clientY)}
                role="button"
                aria-label={node.label}
              >
                <rect className="graph-node-rect"
                  x={-label.length * 3.6} y={-12}
                  width={label.length * 7.2} height={24} rx={12} />
                <text className="graph-node-label"
                  dominantBaseline="middle" textAnchor="middle">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </MobileShell>
  );
}