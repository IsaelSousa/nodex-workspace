import React from 'react';
import { Tag, X } from 'lucide-react';
import { useNodeStore } from '../stores/useNodeStore';

export const TagsView: React.FC = () => {
  const { nodes, getAllTags, activeTagFilter, setActiveTagFilter, setActiveNodeId } = useNodeStore();
  const allTags = getAllTags();

  const filteredNodes = activeTagFilter
    ? nodes.filter((n) => !n.isArchived && (n.tags || []).includes(activeTagFilter))
    : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-400" />
          Tags
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Navegue por todo o conteúdo através das tags aplicadas.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-8">
        {allTags.length === 0 ? (
          <p className="text-xs text-neutral-500">Nenhuma tag criada ainda. Adicione tags em documentos, quadros ou bancos de dados.</p>
        ) : (
          allTags.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => setActiveTagFilter(tag === activeTagFilter ? null : tag)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeTagFilter === tag
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>{tag}</span>
              <span className="text-[10px] text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded-full">{count}</span>
            </button>
          ))
        )}
      </div>

      {activeTagFilter && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              {filteredNodes.length} {filteredNodes.length === 1 ? 'item com' : 'itens com'} "{activeTagFilter}"
            </h2>
            <button
              onClick={() => setActiveTagFilter(null)}
              className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3 h-3" /> Limpar
            </button>
          </div>

          <div className="space-y-1.5">
            {filteredNodes.map((node) => (
              <button
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span>{node.icon || '📄'}</span>
                  <span className="text-sm text-neutral-200 truncate">{node.title}</span>
                </div>
                <span className="text-[10px] text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 shrink-0">
                  {node.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
