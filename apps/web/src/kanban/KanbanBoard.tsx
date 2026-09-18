import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNodeStore } from '../stores/useNodeStore';
import { NodeEntity, KanbanColumn } from '@nodex/shared';
import { Plus, MoreHorizontal, CheckSquare, MessageSquare, Tag, AlertCircle, Trash2 } from 'lucide-react';
import { EmojiPicker } from '../components/EmojiPicker';
import { TagEditor } from '../components/TagEditor';

interface KanbanBoardProps {
  boardId: string;
}

interface CardItemProps {
  card: NodeEntity;
  onClick: () => void;
  onDelete: () => void;
}

const SortableCard: React.FC<CardItemProps> = ({ card, onClick, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const priorityColor =
    card.properties?.priority === 'Alta'
      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      : card.properties?.priority === 'Média'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group bg-neutral-900/90 hover:bg-neutral-850 p-3.5 rounded-xl border border-neutral-800 hover:border-neutral-700/80 shadow-sm cursor-grab active:cursor-grabbing transition-all space-y-2.5 select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span>{card.icon || '📌'}</span>
          <h4 className="text-xs font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
            {card.title}
          </h4>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-all"
          title="Excluir card"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {card.contentMarkdown && (
        <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
          {card.contentMarkdown.replace(/#|\*|\[|\]/g, '').slice(0, 90)}
        </p>
      )}

      <div className="flex items-center justify-between pt-1 text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {card.properties?.priority && (
            <span className={`px-2 py-0.5 rounded-md border font-medium ${priorityColor}`}>
              {card.properties.priority}
            </span>
          )}
          {card.properties?.tag && (
            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 border border-neutral-700/40">
              {card.properties.tag}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface DroppableColumnAreaProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumnArea: React.FC<DroppableColumnAreaProps> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto space-y-2.5 min-h-[50px] pr-1">
      {children}
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ boardId }) => {
  const { 
    nodes,
    moveCard,
    addCardToColumn,
    addColumnToBoard,
    updateNode,
    deleteNode,
    deleteColumn,
    setActiveNodeId,
    setActiveView
  } = useNodeStore();

  const board = nodes.find((n) => n.id === boardId);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>({});
  const [addingCardColId, setAddingCardColId] = useState<string | null>(null);
  const [newColTitle, setNewColTitle] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  if (!board || !board.boardConfig) return null;

  const columns = board.boardConfig.columns;
  const cardsMap = new Map(nodes.filter((n) => n.parentNodeId === boardId || n.type === 'card').map((n) => [n.id, n]));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceCol = columns.find((col) => col.cardNodeIds.includes(activeId));
    if (!sourceCol) return;

    let targetCol = columns.find((col) => col.id === overId);
    let newIndex = 0;

    if (targetCol) {
      newIndex = targetCol.cardNodeIds.length;
    } else {
      targetCol = columns.find((col) => col.cardNodeIds.includes(overId));
      if (!targetCol) return;
      newIndex = targetCol.cardNodeIds.indexOf(overId);
    }

    moveCard(activeId, sourceCol.id, targetCol.id, newIndex);
  };

  const handleAddCard = (columnId: string) => {
    const title = newCardTitles[columnId]?.trim();
    if (!title) return;
    addCardToColumn(boardId, columnId, title);
    setNewCardTitles({ ...newCardTitles, [columnId]: '' });
    setAddingCardColId(null);
  };

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    addColumnToBoard(boardId, newColTitle.trim());
    setNewColTitle('');
    setIsAddingCol(false);
  };

  const activeCard = activeCardId ? cardsMap.get(activeCardId) : null;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden select-none">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EmojiPicker
            value={board.icon || '📋'}
            onChange={(emoji) => updateNode(boardId, { icon: emoji })}
            triggerClassName="w-10 h-10 text-2xl text-center bg-transparent hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors focus:outline-none"
          />
          <div>
            <input
              type="text"
              value={board.title}
              onChange={(e) => updateNode(boardId, { title: e.target.value })}
              className="text-2xl font-bold bg-transparent text-neutral-100 placeholder-neutral-600 focus:outline-none tracking-tight"
            />
            <div className="mt-1">
              <TagEditor nodeId={boardId} tags={board.tags} />
            </div>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
          {columns.map((col) => {
            const columnCards = col.cardNodeIds
              .map((id) => cardsMap.get(id))
              .filter((c): c is NodeEntity => Boolean(c));

            return (
              <div
                key={col.id}
                className="group/col w-72 shrink-0 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 flex flex-col max-h-full"
              >
                <div className="flex items-center justify-between px-1 py-1 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: col.color || '#6366f1' }}
                    />
                    <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wide truncate">
                      {col.title}
                    </h3>
                    <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-800 px-1.5 py-0.2 rounded-full shrink-0">
                      {columnCards.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => setAddingCardColId(col.id)}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-100 transition-colors"
                      title="Adicionar card"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteColumn(boardId, col.id)}
                      className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-rose-400 opacity-0 group-hover/col:opacity-100 transition-all"
                      title="Excluir coluna"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <SortableContext
                  items={col.cardNodeIds}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumnArea id={col.id}>
                    {columnCards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        onClick={() => {
                          setActiveNodeId(card.id);
                          setActiveView('doc');
                        }}
                        onDelete={() => deleteNode(card.id)}
                      />
                    ))}
                  </DroppableColumnArea>
                </SortableContext>

                {addingCardColId === col.id ? (
                  <div className="mt-3 p-2 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                    <input
                      type="text"
                      placeholder="Título do card..."
                      value={newCardTitles[col.id] || ''}
                      onChange={(e) =>
                        setNewCardTitles({ ...newCardTitles, [col.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                      autoFocus
                      className="w-full bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setAddingCardColId(null)}
                        className="px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleAddCard(col.id)}
                        className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCardColId(col.id)}
                    className="mt-3 w-full py-2 flex items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 rounded-xl border border-dashed border-neutral-800 hover:border-neutral-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar card</span>
                  </button>
                )}
              </div>
            );
          })}

          <div className="w-72 shrink-0">
            {isAddingCol ? (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-3 space-y-2">
                <input
                  type="text"
                  placeholder="Nome da coluna..."
                  value={newColTitle}
                  onChange={(e) => setNewColTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                  autoFocus
                  className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
                />
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => setIsAddingCol(false)}
                    className="px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAddColumn}
                    className="px-2.5 py-1 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-md shadow"
                  >
                    Criar Coluna
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingCol(true)}
                className="w-full h-12 flex items-center justify-center gap-2 bg-neutral-900/40 hover:bg-neutral-900/80 border border-dashed border-neutral-800 hover:border-neutral-700 text-xs text-neutral-400 hover:text-neutral-200 rounded-2xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar outra coluna</span>
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="bg-neutral-900 p-3.5 rounded-xl border border-indigo-500/50 shadow-2xl space-y-2 opacity-90 scale-105">
              <div className="flex items-center gap-2">
                <span>{activeCard.icon || '📌'}</span>
                <h4 className="text-xs font-semibold text-neutral-100">{activeCard.title}</h4>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
