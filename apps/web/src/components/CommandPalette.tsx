import React, { useState, useEffect } from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { Search, FileText, LayoutDashboard, CornerDownLeft, X, Tag } from 'lucide-react';
import { searchNodes } from '../lib/search';
import { NodeIcon } from './NodeIcon';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    nodes, 
    setActiveNodeId, 
    setActiveView 
  } = useNodeStore();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const results = query.trim()
    ? searchNodes(nodes, query)
    : nodes.filter((n) => !n.isArchived && !n.isTemplate).map((n) => ({ node: n, score: 0, matchedField: 'title' as const, snippet: undefined }));

  const handleSelect = (nodeId: string, type: string) => {
    setActiveNodeId(nodeId);
    setActiveView(type === 'board' ? 'board' : type === 'database' ? 'database' : 'doc');
    setCommandPaletteOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-24 px-4">
      <div 
        className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-neutral-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar páginas, quadros, tarefas ou conteúdo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 text-neutral-400 hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Nenhum resultado encontrado para "{query}"
            </div>
          ) : (
            results.map(({ node, matchedField, snippet }) => (
              <button
                key={node.id}
                onClick={() => handleSelect(node.id, node.type)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-neutral-800 text-left transition-colors group"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <NodeIcon
                    value={node.icon}
                    fallback={node.type === 'board' ? '📋' : node.type === 'database' ? '🗄️' : '📄'}
                    size={16}
                    className="text-base"
                  />
                  <div className="truncate">
                    <div className="text-xs font-medium text-neutral-200 group-hover:text-white flex items-center gap-1.5">
                      {node.title}
                      {matchedField === 'tag' && snippet && (
                        <span className="flex items-center gap-0.5 text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                          <Tag className="w-2.5 h-2.5" />{snippet}
                        </span>
                      )}
                    </div>
                    {snippet && (matchedField === 'content' || matchedField === 'property') && (
                      <div className="text-[11px] text-neutral-500 truncate max-w-md">
                        {snippet}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  <span>{node.type}</span>
                  <CornerDownLeft className="w-2.5 h-2.5" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="p-2 border-t border-neutral-800/80 bg-neutral-950/50 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Pressione <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-400">ESC</kbd> para fechar</span>
          <span>{results.length} itens</span>
        </div>
      </div>
    </div>
  );
};
