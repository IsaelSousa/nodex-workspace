import React from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { NodeIcon } from './NodeIcon';
import { 
  PanelLeft, 
  Star, 
  FileText, 
  LayoutDashboard, 
  Network, 
  Search 
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    activeNodeId, 
    activeView, 
    nodes, 
    toggleSidebar, 
    setActiveView, 
    toggleFavorite,
    setCommandPaletteOpen 
  } = useNodeStore();

  const activeNode = nodes.find(n => n.id === activeNodeId);

  return (
    <header className="h-12 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md px-4 flex items-center justify-between select-none z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
          title="Alternar barra lateral"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {activeNode && (
          <div className="flex items-center gap-2 text-xs">
            <NodeIcon value={activeNode.icon} fallback={activeNode.type === 'board' ? '📋' : '📄'} size={16} className="text-base" />
            <span className="font-semibold text-neutral-200 truncate max-w-[200px] sm:max-w-md">
              {activeNode.title}
            </span>
            <button
              onClick={() => toggleFavorite(activeNode.id)}
              className="p-1 text-neutral-400 hover:text-amber-400 transition-colors"
              title="Favoritar"
            >
              <Star className={`w-3.5 h-3.5 ${activeNode.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
          <button
            onClick={() => setActiveView('doc')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeView === 'doc'
                ? 'bg-indigo-600 text-white font-medium shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Visualização em Documento"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Doc</span>
          </button>

          <button
            onClick={() => setActiveView('board')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeView === 'board'
                ? 'bg-indigo-600 text-white font-medium shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Visualização em Quadro Kanban"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Quadro</span>
          </button>

          <button
            onClick={() => setActiveView('graph')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
              activeView === 'graph'
                ? 'bg-indigo-600 text-white font-medium shadow'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Visualização em Grafo"
          >
            <Network className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Grafo</span>
          </button>
        </div>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Buscar (Ctrl+K)"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
