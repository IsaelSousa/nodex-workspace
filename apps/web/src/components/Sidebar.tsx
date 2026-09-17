import React, { useState } from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import {
  FileText,
  LayoutDashboard,
  Network,
  Plus,
  Star,
  Search,
  Trash2,
  ChevronRight,
  CalendarDays,
  Settings,
  Clock,
  Home
} from 'lucide-react';
import { NodeEntity, NodeType } from '@nodex/shared';
import { useSettingsStore } from '../stores/useSettingsStore';

interface DocTreeItemProps {
  node: NodeEntity;
  depth: number;
  allDocs: NodeEntity[];
  isActive: (id: string) => boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const DocTreeItem: React.FC<DocTreeItemProps> = ({ node, depth, allDocs, isActive, onSelect, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const children = allDocs.filter((d) => d.parentNodeId === node.id);
  const hasChildren = children.length > 0;

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        className={`group flex items-center justify-between pr-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
          isActive(node.id)
            ? 'bg-neutral-800 text-neutral-100 font-medium'
            : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
        }`}
      >
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              className="shrink-0 p-0.5 hover:bg-neutral-700/50 rounded"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span>{node.icon || '📄'}</span>
          <span className="truncate">{node.title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(node.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity shrink-0"
          title="Excluir"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {children.map((child) => (
            <DocTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              allDocs={allDocs}
              isActive={isActive}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { 
    nodes, 
    activeNodeId, 
    activeView, 
    isSidebarOpen, 
    setActiveNodeId, 
    setActiveView, 
    createNode, 
    deleteNode,
    setCommandPaletteOpen 
  } = useNodeStore();

  const setSettingsModalOpen = useSettingsStore((s) => s.setSettingsModalOpen);

  if (!isSidebarOpen) return null;

  const docs = nodes.filter(n => n.type === 'document' && !n.isArchived);
  const boards = nodes.filter(n => n.type === 'board' && !n.isArchived);
  const favorites = nodes.filter(n => n.isFavorite && !n.isArchived);

  const handleCreate = (type: NodeType) => {
    const newNode = createNode(type);
    setActiveNodeId(newNode.id);
  };

  return (
    <aside className="w-64 h-screen bg-neutral-900/80 backdrop-blur-md border-r border-neutral-800 flex flex-col select-none z-20">
      <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img 
            src="/logo.svg" 
            alt="NodeX Logo" 
            className="w-7 h-7 rounded-lg object-contain shadow-md shadow-indigo-600/30" 
          />
          <div>
            <h1 className="text-sm font-semibold text-neutral-100">
              NodeX
            </h1>
            <p className="text-[11px] text-neutral-400">Meu Workspace</p>
          </div>
        </div>
      </div>

      <div className="p-2 space-y-1">
        <button 
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md bg-neutral-800/60 hover:bg-neutral-800 text-xs text-neutral-400 hover:text-neutral-200 transition-colors border border-neutral-700/40"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>Buscar rápido...</span>
          </div>
          <kbd className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700 text-neutral-400">
            Ctrl+K
          </kbd>
        </button>

        <button
          onClick={() => setActiveView('home')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeView === 'home'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-neutral-300 hover:bg-neutral-800/60'
          }`}
        >
          <Home className="w-4 h-4 text-indigo-400" />
          <span>Início</span>
        </button>

        <button
          onClick={() => setActiveView('graph')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeView === 'graph'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-neutral-300 hover:bg-neutral-800/60'
          }`}
        >
          <Network className="w-4 h-4 text-indigo-400" />
          <span>Grafo de Conhecimento</span>
        </button>

        <button
          onClick={() => setActiveView('calendar')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeView === 'calendar'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-neutral-300 hover:bg-neutral-800/60'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-emerald-400" />
          <span>Calendário</span>
        </button>

        <button
          onClick={() => setActiveView('timesheet')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeView === 'timesheet'
              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              : 'text-neutral-300 hover:bg-neutral-800/60'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Apontamento de Horas</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {favorites.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" /> Favoritos
              </span>
            </div>
            <div className="space-y-0.5 mt-1">
              {favorites.map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    setActiveNodeId(node.id);
                    setActiveView(node.type === 'board' ? 'board' : 'doc');
                  }}
                  className={`w-full group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                    activeNodeId === node.id && activeView !== 'graph'
                      ? 'bg-neutral-800 text-neutral-100 font-medium'
                      : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{node.icon || (node.type === 'board' ? '📋' : '📄')}</span>
                    <span className="truncate">{node.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-indigo-400" /> Documentos & Notas
            </span>
            <button 
              onClick={() => handleCreate('document')}
              title="Criar novo documento"
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5 mt-1">
            {docs.filter((node) => !node.parentNodeId).map((node) => (
              <DocTreeItem
                key={node.id}
                node={node}
                depth={0}
                allDocs={docs}
                isActive={(id) => activeNodeId === id && activeView === 'doc'}
                onSelect={(id) => {
                  setActiveNodeId(id);
                  setActiveView('doc');
                }}
                onDelete={deleteNode}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <LayoutDashboard className="w-3 h-3 text-emerald-400" /> Quadros Kanban
            </span>
            <button 
              onClick={() => handleCreate('board')}
              title="Criar novo quadro"
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-0.5 mt-1">
            {boards.map((node) => (
              <div
                key={node.id}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  activeNodeId === node.id && activeView === 'board'
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
                }`}
                onClick={() => {
                  setActiveNodeId(node.id);
                  setActiveView('board');
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span>{node.icon || '📋'}</span>
                  <span className="truncate">{node.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                  title="Excluir"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="truncate">Online</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsModalOpen(true)}
            title="Configurações"
            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-neutral-500 font-mono">v0.1.0</span>
        </div>
      </div>
    </aside>
  );
};
