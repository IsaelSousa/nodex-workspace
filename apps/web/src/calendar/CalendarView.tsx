import React, { useEffect, useMemo, useState } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';
import { useNodeStore } from '../stores/useNodeStore';
import { CalendarEvent, NodeEntity } from '@nodex/shared';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Bell, BellOff, CheckSquare } from 'lucide-react';
import { openPicker } from '../lib/openPicker';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const REMINDER_OPTIONS: { label: string; value: number | '' }[] = [
  { label: 'Sem lembrete', value: '' },
  { label: '5 minutos antes', value: 5 },
  { label: '15 minutos antes', value: 15 },
  { label: '30 minutos antes', value: 30 },
  { label: '1 hora antes', value: 60 },
  { label: '1 dia antes', value: 1440 },
];

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInputValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function buildMonthGrid(monthDate: Date): Date[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

interface EventFormState {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  reminder: number | '';
  description: string;
}

function emptyForm(date: Date): EventFormState {
  return {
    title: '',
    date: toDateInputValue(date),
    startTime: '09:00',
    endTime: '',
    reminder: 15,
    description: '',
  };
}

function eventToForm(event: CalendarEvent): EventFormState {
  const start = new Date(event.startAt);
  return {
    id: event.id,
    title: event.title,
    date: toDateInputValue(start),
    startTime: toTimeInputValue(start),
    endTime: event.endAt ? toTimeInputValue(new Date(event.endAt)) : '',
    reminder: event.reminderMinutesBefore ?? '',
    description: event.description || '',
  };
}

export const CalendarView: React.FC = () => {
  const { events, fetchEvents, createEvent, updateEvent, deleteEvent } = useCalendarStore();
  const { nodes, setActiveNodeId, setActiveView } = useNodeStore();
  const [monthDate, setMonthDate] = useState(new Date());
  const [form, setForm] = useState<EventFormState | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const today = new Date();
  const todayKey = toDateInputValue(today);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = toDateInputValue(new Date(e.startAt));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    map.forEach((list) => list.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    return map;
  }, [events]);

  const cardsByDay = useMemo(() => {
    const map = new Map<string, NodeEntity[]>();
    nodes.forEach((n) => {
      if (!n.isArchived && n.properties?.dueDate) {
        const key = n.properties.dueDate;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(n);
      }
    });
    return map;
  }, [nodes]);

  const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const handleSubmit = async () => {
    if (!form || !form.title.trim()) return;
    const startAt = new Date(`${form.date}T${form.startTime || '00:00'}:00`).toISOString();
    const endAt = form.endTime ? new Date(`${form.date}T${form.endTime}:00`).toISOString() : undefined;
    const reminderMinutesBefore = form.reminder === '' ? undefined : Number(form.reminder);

    if (form.id) {
      await updateEvent(form.id, {
        title: form.title.trim(),
        startAt,
        endAt,
        reminderMinutesBefore,
        description: form.description.trim() || undefined,
      });
    } else {
      await createEvent({
        title: form.title.trim(),
        startAt,
        endAt,
        reminderMinutesBefore,
        description: form.description.trim() || undefined,
      });
    }
    setForm(null);
  };

  const handleDelete = async () => {
    if (!form?.id) return;
    await deleteEvent(form.id);
    setForm(null);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden select-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-neutral-100 capitalize">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMonthDate(new Date())}
              className="px-2 py-1 text-[11px] hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
              className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 pl-3 text-[11px] text-neutral-400 border-l border-neutral-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Agenda
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Prazos Kanban
            </span>
          </div>
        </div>
        <button
          onClick={() => setForm(emptyForm(new Date()))}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-medium text-white shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Compromisso</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-2 overflow-hidden">
        {days.map((day) => {
          const key = toDateInputValue(day);
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const isToday = key === todayKey;
          const dayEvents = eventsByDay.get(key) || [];
          const dayCards = cardsByDay.get(key) || [];

          return (
            <div
              key={key}
              onClick={() => setForm(emptyForm(day))}
              className={`rounded-xl border p-1.5 flex flex-col gap-1 overflow-hidden cursor-pointer transition-colors ${
                isCurrentMonth ? 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700' : 'bg-neutral-950/40 border-neutral-900 hover:border-neutral-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-indigo-600 text-white' : isCurrentMonth ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  {day.getDate()}
                </span>
                {dayCards.length > 0 && (
                  <span className="text-[9px] px-1 py-0.2 bg-amber-500/20 text-amber-300 rounded font-medium">
                    {dayCards.length} {dayCards.length === 1 ? 'tarefa' : 'tarefas'}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayCards.map((card) => {
                  const priority = card.properties?.priority;
                  const priorityStyle =
                    priority === 'Alta'
                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                      : priority === 'Média'
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25';

                  return (
                    <button
                      key={card.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveNodeId(card.id);
                        if (card.parentNodeId) {
                          setActiveView('board');
                        } else {
                          setActiveView('doc');
                        }
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded-md border text-[10px] truncate flex items-center gap-1 transition-all ${priorityStyle}`}
                      title={`Tarefa Kanban: ${card.title}`}
                    >
                      <span className="text-[10px] shrink-0">{card.icon || '📌'}</span>
                      <span className="truncate font-medium">{card.title}</span>
                    </button>
                  );
                })}

                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm(eventToForm(event));
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded-md bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/20 text-[10px] text-indigo-300 truncate flex items-center gap-1"
                  >
                    {event.reminderMinutesBefore !== undefined ? (
                      <Bell className="w-2.5 h-2.5 shrink-0" />
                    ) : (
                      <BellOff className="w-2.5 h-2.5 shrink-0 opacity-40" />
                    )}
                    <span className="truncate">{toTimeInputValue(new Date(event.startAt))} {event.title}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {form && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setForm(null)}
        >
          <div
            className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200">
                {form.id ? 'Editar Compromisso' : 'Novo Compromisso'}
              </h3>
              <button onClick={() => setForm(null)} className="p-1 text-neutral-400 hover:text-neutral-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              <input
                type="text"
                placeholder="Título do compromisso..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                autoFocus
                className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={form.date}
                  onClick={openPicker}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="col-span-1 bg-neutral-950 px-2 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-100 focus:outline-none focus:border-indigo-500/50"
                />
                <input
                  type="time"
                  value={form.startTime}
                  onClick={openPicker}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="bg-neutral-950 px-2 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-100 focus:outline-none focus:border-indigo-500/50"
                />
                <input
                  type="time"
                  value={form.endTime}
                  placeholder="Fim"
                  onClick={openPicker}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="bg-neutral-950 px-2 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-100 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <select
                value={form.reminder}
                onChange={(e) => setForm({ ...form, reminder: e.target.value === '' ? '' : Number(e.target.value) })}
                className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-100 focus:outline-none focus:border-indigo-500/50"
              >
                {REMINDER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <textarea
                placeholder="Descrição (opcional)..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50 resize-none"
              />
            </div>

            <div className="p-3 border-t border-neutral-800 flex items-center justify-between">
              {form.id ? (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim()}
                className="px-3 py-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium rounded-lg shadow transition-colors"
              >
                {form.id ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
