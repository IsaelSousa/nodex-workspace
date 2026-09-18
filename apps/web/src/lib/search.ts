import { NodeEntity } from '@nodex/shared';

export type SearchMatchedField = 'title' | 'tag' | 'content' | 'property';

export interface SearchResult {
  node: NodeEntity;
  score: number;
  matchedField: SearchMatchedField;
  snippet?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildSnippet(haystack: string, query: string, radius = 40): string {
  const idx = haystack.indexOf(query);
  if (idx === -1) return haystack.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(haystack.length, idx + query.length + radius);
  return `${start > 0 ? '…' : ''}${haystack.slice(start, end)}${end < haystack.length ? '…' : ''}`;
}

/**
 * Full-text search across node titles, tags, rendered content, and free-form
 * properties (kanban card fields, database row values). Ranked so title
 * matches surface first, then tags, then body content.
 */
export function searchNodes(nodes: NodeEntity[], query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];

  for (const node of nodes) {
    if (node.isArchived) continue;
    const title = node.title.toLowerCase();

    if (title.includes(q)) {
      results.push({
        node,
        score: title === q ? 100 : title.startsWith(q) ? 90 : 70,
        matchedField: 'title',
      });
      continue;
    }

    const tagMatch = (node.tags || []).find((t) => t.toLowerCase().includes(q));
    if (tagMatch) {
      results.push({ node, score: 60, matchedField: 'tag', snippet: tagMatch });
      continue;
    }

    if (node.contentMarkdown) {
      const content = stripHtml(node.contentMarkdown).toLowerCase();
      if (content.includes(q)) {
        results.push({ node, score: 40, matchedField: 'content', snippet: buildSnippet(content, q) });
        continue;
      }
    }

    if (node.properties) {
      const propsText = Object.values(node.properties)
        .filter((v) => typeof v === 'string' || typeof v === 'number')
        .join(' ')
        .toLowerCase();
      if (propsText.includes(q)) {
        results.push({ node, score: 20, matchedField: 'property', snippet: buildSnippet(propsText, q) });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
