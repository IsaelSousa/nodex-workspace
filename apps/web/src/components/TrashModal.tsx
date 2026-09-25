import React, { useState } from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { NodeIcon } from './NodeIcon';
import { Trash2, RotateCcw, X, AlertTriangle, AlertCircle } from 'lucide-react';

export const TrashModal: React.FC = () => {
  const {
    archivedNodes,
    isTrashOpen,
    setTrashOpen,
    restoreNode,
    permanentlyDeleteNode,
    emptyTrash,
  } = useNodeStore();

  const [confirmEmpty, setConfirmEmpty] = useState(false);

  if (!isTrashOpen) return null;

  const handleEmpty = async () => {
    await emptyTrash();
    setConfirmEmpty(false);
  };

  const TYPE_NAMES: Record<string, string> = {
    document: 'Documento',
    board: 'Quadro Kanban',
    card: 'Card',
    database: 'Banco de Dados',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => setTrashOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <span>Lixeira</span>
                <span className="text-[11px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded-full">
                  {archivedNodes.length}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Itens excluídos podem ser restaurados a qualquer momento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {archivedNodes.length > 0 && !confirmEmpty && (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
              >
                Esvaziar
              </button>
            )}

            <button
              onClick={() => setTrashOpen(false)}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Confirmation banner */}
        {confirmEmpty && (
          <div className="p-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Deseja apagar definitivamente todos os {archivedNodes.length} itens?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setConfirmEmpty(false)}
                className="px-2 py-1 text-neutral-400 hover:text-neutral-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmpty}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {archivedNodes.length === 0 ? (
            <div className="py-14 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800/60 flex items-center justify-center text-neutral-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-semibold text-neutral-300">A lixeira está vazia</h4>
              <p className="text-[11px] text-neutral-500 max-w-xs mx-auto">
                Quando você excluir notas, quadros ou bancos de dados, eles virão para cá antes de serem apagados.
              </p>
            </div>
          ) : (
            archivedNodes.map((node) => (
              <div
                key={node.id}
                className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-neutral-950/60 hover:bg-neutral-950 border border-neutral-800/80 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <NodeIcon
                    value={node.icon}
                    fallback={node.type === 'board' ? '📋' : node.type === 'database' ? '🗄️' : '📄'}
                    size={16}
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-medium text-neutral-200 truncate">
                      {node.title || 'Sem título'}
                    </h5>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                      <span>{TYPE_NAMES[node.type] || node.type}</span>
                      <span>•</span>
                      <span>
                        {new Date(node.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => restoreNode(node.id)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors"
                    title="Restaurar este item"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar</span>
                  </button>

                  <button
                    onClick={() => permanentlyDeleteNode(node.id)}
                    className="p-1 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
                    title="Excluir permanentemente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
