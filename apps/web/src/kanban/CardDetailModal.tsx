import React, { useState } from 'react';
import { useNodeStore } from '../stores/useNodeStore';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { CardSubtask } from '@nodex/shared';
import { uuid } from '../lib/uuid';
import { EmojiPicker } from '../components/EmojiPicker';
import { TagEditor } from '../components/TagEditor';
import {
  X,
  Calendar,
  AlertCircle,
  CheckSquare,
  Plus,
  Trash2,
  Clock,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface CardDetailModalProps {
  cardId: string;
  boardId: string;
  onClose: () => void;
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({ cardId, boardId, onClose }) => {
  const { nodes, updateNode, deleteNode, setActiveNodeId, setActiveView } = useNodeStore();
  const { projects, startTimer } = useTimeTrackingStore();

  const card = nodes.find((n) => n.id === cardId);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  if (!card) return null;

  const properties = card.properties || {};
  const subtasks: CardSubtask[] = properties.subtasks || [];
  const priority = properties.priority || '';
  const dueDate = properties.dueDate || '';

  const updateProperties = (updates: Record<string, any>) => {
    updateNode(cardId, {
      properties: {
        ...properties,
        ...updates,
      },
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newTask: CardSubtask = {
      id: `task-${uuid()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    updateProperties({ subtasks: [...subtasks, newTask] });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (taskId: string) => {
    const next = subtasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    updateProperties({ subtasks: next });
  };

  const handleDeleteSubtask = (taskId: string) => {
    const next = subtasks.filter((t) => t.id !== taskId);
    updateProperties({ subtasks: next });
  };

  const completedSubtasks = subtasks.filter((t) => t.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  const handleStartTimer = () => {
    const defaultProject = projects[0]?.id || 'default';
    startTimer(defaultProject, `Card: ${card.title}`, card.id);
    onClose();
  };

  const handleOpenAsDoc = () => {
    setActiveNodeId(card.id);
    setActiveView('doc');
    onClose();
  };

  const handleDelete = () => {
    deleteNode(card.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/80">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <EmojiPicker
              value={card.icon || '📌'}
              onChange={(emoji) => updateNode(cardId, { icon: emoji })}
              triggerClassName="w-8 h-8 text-xl flex items-center justify-center rounded-lg hover:bg-neutral-800 transition-colors"
            />
            <input
              type="text"
              value={card.title}
              onChange={(e) => updateNode(cardId, { title: e.target.value })}
              placeholder="Título do card..."
              className="font-semibold text-base text-neutral-100 bg-transparent focus:outline-none flex-1 min-w-0"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleOpenAsDoc}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Abrir como página completa"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir nota</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
            <div>
              <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" /> Prioridade
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => updateProperties({ priority: e.target.value || undefined })}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="">Sem prioridade</option>
                  <option value="Baixa">🟢 Baixa</option>
                  <option value="Média">🟡 Média</option>
                  <option value="Alta">🔴 Alta</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-neutral-400 flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Prazo (Exibido no Calendário)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => updateProperties({ dueDate: e.target.value || undefined })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-400 block mb-1.5">
              Tags & Categorias
            </label>
            <TagEditor nodeId={cardId} tags={card.tags} />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wide">
                  Subtarefas
                </h4>
                {subtasks.length > 0 && (
                  <span className="text-[11px] text-neutral-500 font-mono">
                    ({completedSubtasks}/{subtasks.length})
                  </span>
                )}
              </div>
              {subtasks.length > 0 && (
                <span className="text-[11px] font-medium text-neutral-400">
                  {progressPercent}%
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              {subtasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700/80 transition-colors"
                >
                  <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleSubtask(task.id)}
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-indigo-600 focus:ring-0 accent-indigo-500 cursor-pointer"
                    />
                    <span
                      className={`text-xs transition-colors truncate ${
                        task.completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                      }`}
                    >
                      {task.title}
                    </span>
                  </label>

                  <button
                    onClick={() => handleDeleteSubtask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 transition-opacity"
                    title="Excluir subtarefa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Adicionar subtarefa..."
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                className="flex-1 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none"
              />
              <button
                onClick={handleAddSubtask}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3 text-xs">
          <button
            onClick={handleStartTimer}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-medium transition-colors"
            title="Iniciar contagem de tempo para esta tarefa"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Iniciar Timer</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 text-neutral-400 hover:text-rose-400 transition-colors"
              title="Excluir este card"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              Concluído
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
