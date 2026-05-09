export function extractKeyTerms(raw) {
  let parsed;
  try {
    const clean = raw.replace(/```json|```/gi, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    console.warn('keyTermExtractor: Failed to parse model JSON response.', raw);
    return { nodes: [], edges: [] };
  }

  const nodes = (parsed?.nodes ?? [])
    .filter((n) => n?.id && n?.label)
    .map((n, i) => ({
      id: String(n.id),
      data: { label: n.label },
      position: { x: (i % 4) * 180, y: Math.floor(i / 4) * 120 },
      type: 'default',
    }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = (parsed?.edges ?? [])
    .filter((e) => e?.source && e?.target && nodeIds.has(String(e.source)) && nodeIds.has(String(e.target)))
    .map((e, i) => ({
      id: `edge-${i}`,
      source: String(e.source),
      target: String(e.target),
      label: e.label ?? '',
      animated: false,
    }));

  return { nodes, edges };
}