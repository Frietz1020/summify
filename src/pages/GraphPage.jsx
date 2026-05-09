import { useEffect, useRef, useState, useCallback } from "react";
import MobileShell from "../components/layout/MobileShell";
import { useDocument } from "../context/DocumentContext";

/* ─── Sample data — shown when no real summary exists ────────── */
const SAMPLE = {
  centerLabel: "Key",
  nodes: [
    { id: "n1", label: "Machine Learning" },
    { id: "n2", label: "Neural Networks" },
    { id: "n3", label: "Deep Learning" },
    { id: "n4", label: "NLP" },
    { id: "n5", label: "Computer Vision" },
    { id: "n6", label: "Data Science" },
    { id: "n7", label: "Knowledge Graph" },
    { id: "n8", label: "Summarization" },
  ],
  edges: [
    { source: "n1", target: "n2" },
    { source: "n3", target: "n1" },
    { source: "n4", target: "n2" },
    { source: "n5", target: "n3" },
    { source: "n6", target: "n1" },
    { source: "n7", target: "n8" },
  ],
};

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
  const cx = width  / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;

  const rawNodes  = keyTerms?.nodes?.length ? keyTerms.nodes : SAMPLE.nodes;
  const rawEdges  = keyTerms?.edges?.length ? keyTerms.edges : SAMPLE.edges;
  const center    = centerLabel || SAMPLE.centerLabel;
  const isSample  = !keyTerms?.nodes?.length;

  const positioned = radialLayout(rawNodes, cx, cy, radius);
  const byId = Object.fromEntries(positioned.map((n) => [n.id, n]));

  const edges = rawEdges
    .filter((e) => byId[e.source] && byId[e.target])
    .map((e, i) => ({
      id: `e-${i}`,
      x1: byId[e.source].x,
      y1: byId[e.source].y,
      x2: byId[e.target].x,
      y2: byId[e.target].y,
    }));

  // Spoke edges: center → every node
  const spokes = positioned.map((n, i) => ({
    id: `spoke-${i}`,
    x1: cx, y1: cy,
    x2: n.x, y2: n.y,
  }));

  return { cx, cy, nodes: positioned, edges: [...spokes, ...edges], center, isSample };
}

/* ─── Draggable SVG node ─────────────────────────────────────── */
function useDraggableNodes(initialNodes) {
  const [positions, setPositions] = useState({});

  // Reset when nodes change (new summary)
  useEffect(() => {
    setPositions({});
  }, [initialNodes]);

  const getPos = (node) =>
    positions[node.id] ?? { x: node.x, y: node.y };

  const onDragStart = useCallback((e, nodeId, svgRef) => {
    e.preventDefault();
    const svg    = svgRef.current;
    const pt     = svg.createSVGPoint();

    function toSVG(clientX, clientY) {
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    const startClient = e.touches ? e.touches[0] : e;
    const startSVG    = toSVG(startClient.clientX, startClient.clientY);
    const startPos    = positions[nodeId] ??
      { x: initialNodes.find((n) => n.id === nodeId)?.x ?? 0,
        y: initialNodes.find((n) => n.id === nodeId)?.y ?? 0 };

    const offsetX = startSVG.x - startPos.x;
    const offsetY = startSVG.y - startPos.y;

    function onMove(ev) {
      const client = ev.touches ? ev.touches[0] : ev;
      const svgPt  = toSVG(client.clientX, client.clientY);
      setPositions((prev) => ({
        ...prev,
        [nodeId]: { x: svgPt.x - offsetX, y: svgPt.y - offsetY },
      }));
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
    window.addEventListener("touchend",  onEnd);
  }, [initialNodes, positions]);

  return { getPos, onDragStart };
}

/* ─── GraphPage ──────────────────────────────────────────────── */
export default function GraphPage() {
  const { keyTerms, summaryVariants, setActiveTab } = useDocument();
  const svgRef     = useRef(null);
  const wrapRef    = useRef(null);
  const [dims, setDims] = useState({ width: 380, height: 580 });

  useEffect(() => { setActiveTab("graph"); }, [setActiveTab]);

  // Measure container and update SVG dimensions responsively
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDims({ width, height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Derive center label from the concise summary first sentence
  const centerLabel = summaryVariants?.concise
    ? summaryVariants.concise.split(/[.!?]/)[0].trim().slice(0, 24) || "Key"
    : "Key";

  const graph = buildGraphLayout(keyTerms, centerLabel, dims.width, dims.height);
  const { getPos, onDragStart } = useDraggableNodes(graph.nodes);

  // Build dynamic edges using live dragged positions
  const liveEdges = graph.edges.map((e) => {
    // Find which node this edge connects to/from
    const srcNode = graph.nodes.find(
      (n) => Math.round(n.x) === Math.round(e.x2) && Math.round(n.y) === Math.round(e.y2)
    );
    const tgtNode = graph.nodes.find(
      (n) => Math.round(n.x) === Math.round(e.x1) && Math.round(n.y) === Math.round(e.y1)
    );
    const src = srcNode ? getPos(srcNode) : { x: e.x1, y: e.y1 };
    const tgt = tgtNode ? getPos(tgtNode) : { x: e.x2, y: e.y2 };
    return { ...e, x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y };
  });

  return (
    <MobileShell topTabs>
      <div className="graph-page" ref={wrapRef}>

        {/* Sample badge */}
        {graph.isSample && (
          <div className="graph-sample-badge">
            Sample graph — summarize a document to generate yours
          </div>
        )}

        <svg
          ref={svgRef}
          className="graph-svg"
          viewBox={`0 0 ${dims.width} ${dims.height}`}
          width={dims.width}
          height={dims.height}
          aria-label="Key term graph"
        >
          {/* Edges */}
          <g className="graph-edges">
            {liveEdges.map((e) => (
              <line
                key={e.id}
                className="graph-line"
                x1={e.x1} y1={e.y1}
                x2={e.x2} y2={e.y2}
              />
            ))}
          </g>

          {/* Center node */}
          <g className="graph-center-group">
            <circle
              className="graph-center-circle"
              cx={graph.cx}
              cy={graph.cy}
              r={38}
            />
            <text
              className="graph-center-label"
              x={graph.cx}
              y={graph.cy}
              dominantBaseline="middle"
              textAnchor="middle"
            >
              {graph.center.length > 14
                ? graph.center.slice(0, 13) + "…"
                : graph.center}
            </text>
          </g>

          {graph.nodes.map((node) => {
            const { x, y } = getPos(node);
            const label = node.label.length > 16
              ? node.label.slice(0, 15) + "…"
              : node.label;

            return (
              <g
                key={node.id}
                className="graph-node-group"
                transform={`translate(${x},${y})`}
                onMouseDown={(e) => onDragStart(e, node.id, svgRef)}
                onTouchStart={(e) => onDragStart(e, node.id, svgRef)}
                role="button"
                aria-label={node.label}
              >
                <rect
                  className="graph-node-rect"
                  x={-label.length * 3.6}
                  y={-12}
                  width={label.length * 7.2}
                  height={24}
                  rx={12}
                />
                <text
                  className="graph-node-label"
                  dominantBaseline="middle"
                  textAnchor="middle"
                >
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