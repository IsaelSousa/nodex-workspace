import React from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { ArrowDownLeft, ArrowUpRight, Link2 } from 'lucide-react';
import { NodeIcon } from './NodeIcon';

interface BacklinksPanelProps {
  nodeId: string;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ nodeId }) => {
  const { getBacklinksForNode, setActiveNodeId, setActiveView } = useNodeStore();
  const { sourceNodes, targetNodes } = getBacklinksForNode(nodeId);

  if (sourceNodes.length === 0 && targetNodes.length === 0) {
    return null;
  }

  const handleNavigate = (targetId: string, type: string) => {
    setActiveNodeId(targetId);
    setActiveView(type === 'board' ? 'board' : 'doc');
  };

  return (
    <div className="mt-12 pt-6 border-t border-neutral-800 space-y-6 select-none">
      <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        <Link2 className="w-4 h-4 text-indigo-400" />
        <span>Conexões de Conhecimento (Backlinks)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mencionado por ({sourceNodes.length})</span>
          </div>

          {sourceNodes.length === 0 ? (
            <p className="text-[11px] text-neutral-500 italic">Nenhum documento menciona esta página ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {sourceNodes.map((src) => (
                <button
                  key={src.id}
                  onClick={() => handleNavigate(src.id, src.type)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 hover:bg-neutral-800/80 text-left transition-colors border border-neutral-800/40 group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <NodeIcon value={src.icon} fallback={src.type === 'board' ? '📋' : '📄'} size={14} />
                    <span className="text-xs text-neutral-200 group-hover:text-indigo-400 font-medium truncate">
                      {src.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 uppercase">{src.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Menciona ({targetNodes.length})</span>
          </div>

          {targetNodes.length === 0 ? (
            <p className="text-[11px] text-neutral-500 italic">Esta página não menciona outras notas.</p>
          ) : (
            <div className="space-y-1.5">
              {targetNodes.map((tgt) => (
                <button
                  key={tgt.id}
                  onClick={() => handleNavigate(tgt.id, tgt.type)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 hover:bg-neutral-800/80 text-left transition-colors border border-neutral-800/40 group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <NodeIcon value={tgt.icon} fallback={tgt.type === 'board' ? '📋' : '📄'} size={14} />
                    <span className="text-xs text-neutral-200 group-hover:text-indigo-400 font-medium truncate">
                      {tgt.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 uppercase">{tgt.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
