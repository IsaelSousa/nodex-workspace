import React from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { FileText, LayoutDashboard, Network, CalendarDays, Clock, Star, Plus } from 'lucide-react';
import { NodeIcon } from '../components/NodeIcon';

export const HomePage: React.FC = () => {
  const { nodes, createNode, setActiveNodeId, setActiveView } = useNodeStore();

  const favorites = nodes.filter((n) => n.isFavorite && !n.isArchived);

  const goToNewDoc = () => {
    const node = createNode('document');
    setActiveNodeId(node.id);
    setActiveView('doc');
  };

  const goToNewBoard = () => {
    const node = createNode('board');
    setActiveNodeId(node.id);
    setActiveView('board');
  };

  const actions = [
    { icon: FileText, label: 'Nova Nota', color: 'text-indigo-400', onClick: goToNewDoc },
    { icon: LayoutDashboard, label: 'Novo Quadro', color: 'text-emerald-400', onClick: goToNewBoard },
    { icon: Network, label: 'Grafo de Conhecimento', color: 'text-indigo-400', onClick: () => setActiveView('graph') },
    { icon: CalendarDays, label: 'Calendário', color: 'text-emerald-400', onClick: () => setActiveView('calendar') },
    { icon: Clock, label: 'Apontamento de Horas', color: 'text-amber-400', onClick: () => setActiveView('timesheet') },
  ];

  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="h-full flex flex-col items-center px-6 py-16 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-neutral-100 mb-1">{greeting} 👋</h1>
        <p className="text-sm text-neutral-400 mb-8">O que você quer fazer hoje?</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
          {actions.map(({ icon: Icon, label, color, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-start gap-2.5 p-4 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl text-left transition-colors"
            >
              <Icon className={`w-5 h-5 ${color}`} />
              <span className="text-xs font-medium text-neutral-200">{label}</span>
            </button>
          ))}
        </div>

        {favorites.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
              Favoritos
            </div>
            <div className="space-y-1">
              {favorites.map((node) => (
                <button
                  key={node.id}
                  onClick={() => {
                    setActiveNodeId(node.id);
                    setActiveView(node.type === 'board' ? 'board' : 'doc');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-left transition-colors"
                >
                  <NodeIcon value={node.icon} fallback={node.type === 'board' ? '📋' : '📄'} size={14} />
                  <span className="text-xs text-neutral-300 truncate">{node.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {nodes.filter((n) => !n.isArchived).length === 0 && (
          <button
            onClick={goToNewDoc}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Comece criando sua primeira nota
          </button>
        )}
      </div>
    </div>
  );
};
