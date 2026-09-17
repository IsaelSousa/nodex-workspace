export * from './types.js';

export function extractWikiLinks(text: string): string[] {
  if (!text) return [];
  const regex = /\[\[(.*?)\]\]/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const linkTarget = match[1].trim();
    if (linkTarget && !matches.includes(linkTarget)) {
      matches.push(linkTarget);
    }
  }
  return matches;
}

export function buildGraphData(nodes: import('./types.js').NodeEntity[], edges: import('./types.js').Edge[]): import('./types.js').GraphData {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const graphNodes: import('./types.js').GraphNode[] = nodes
    .filter(n => !n.isArchived)
    .map(n => ({
      id: n.id,
      title: n.title || 'Sem título',
      type: n.type,
      val: n.type === 'board' ? 8 : n.type === 'database' ? 7 : 5,
    }));

  const graphLinks: import('./types.js').GraphLink[] = edges
    .filter(e => nodeMap.has(e.sourceNodeId) && nodeMap.has(e.targetNodeId))
    .map(e => ({
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: e.edgeType,
    }));

  return {
    nodes: graphNodes,
    links: graphLinks,
  };
}
