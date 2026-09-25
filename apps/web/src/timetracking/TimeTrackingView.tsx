import React, { useMemo, useState, useEffect } from 'react';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { TimeEntry } from '@nodex/shared';
import { ChevronLeft, ChevronRight, X, Trash2, Plus, Settings, LayoutGrid, CalendarDays, BarChart3, Flag, Clock } from 'lucide-react';
import { QuickAddTimeModal } from './QuickAddTimeModal';

const PROJECT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#8b5cf6', '#ec4899', '#64748b'];
const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const TIMELINE_WINDOW_DAYS = 15;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDays(anchor: Date): Date[] {
  const date = new Date(anchor);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function buildMonthGrid(monthDate: Date): Date[] {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function parseDurationInput(input: string): number | null {
  const s = input.trim().toLowerCase().replace(',', '.');
  if (!s) return null;

  let m = s.match(/^(\d+)\s*:\s*(\d{1,2})$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);

  m = s.match(/^(\d+)\s*h\s*(\d{1,2})?\s*m?$/);
  if (m) return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);

  m = s.match(/^(\d+)\s*m$/);
  if (m) return parseInt(m[1], 10);

  m = s.match(/^(\d*\.?\d+)$/);
  if (m) return Math.round(parseFloat(m[1]) * 60);

  return null;
}

function formatDurationInput(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

function formatDurationDisplay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}


export const TimeTrackingView: React.FC = () => {
  const {
    projects,
    timeEntries,
    fetchAll,
    createProject,
    deleteProject,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  } = useTimeTrackingStore();

  const [view, setView] = useState<'grid' | 'calendar' | 'timeline'>('grid');
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [timelineEnd, setTimelineEnd] = useState(new Date());
  const [monthDate, setMonthDate] = useState(new Date());
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ projectId?: string; date?: string } | null>(null);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const activeProjects = useMemo(() => projects.filter((p) => !p.isArchived), [projects]);
  const weekDays = useMemo(() => getWeekDays(weekAnchor), [weekAnchor]);
  const weekDayKeys = useMemo(() => weekDays.map(toDateKey), [weekDays]);

  const timelineDays = useMemo(() => {
    const end = new Date(timelineEnd);
    end.setHours(0, 0, 0, 0);
    return Array.from({ length: TIMELINE_WINDOW_DAYS }, (_, i) => {
      const d = new Date(end);
      d.setDate(end.getDate() - (TIMELINE_WINDOW_DAYS - 1 - i));
      return d;
    });
  }, [timelineEnd]);

  const monthDays = useMemo(() => buildMonthGrid(monthDate), [monthDate]);

  const entriesByCell = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    timeEntries.forEach((e) => {
      const key = `${e.projectId}__${e.date}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [timeEntries]);

  const cellEntries = (projectId: string, dateKey: string) => entriesByCell.get(`${projectId}__${dateKey}`) || [];
  const cellMinutes = (projectId: string, dateKey: string) =>
    cellEntries(projectId, dateKey).reduce((sum, e) => sum + e.durationMinutes, 0);
  const isCellReported = (projectId: string, dateKey: string) => {
    const entries = cellEntries(projectId, dateKey);
    return entries.length > 0 && entries.every((e) => e.reported);
  };
  const rowTotal = (projectId: string) => weekDayKeys.reduce((sum, dk) => sum + cellMinutes(projectId, dk), 0);
  const colTotal = (dateKey: string) => activeProjects.reduce((sum, p) => sum + cellMinutes(p.id, dateKey), 0);
  const grandTotal = weekDayKeys.reduce((sum, dk) => sum + colTotal(dk), 0);

  const weekLabel = `${weekDays[0].getDate()} – ${weekDays[6].getDate()} de ${weekDays[6].toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;

  const timelineLabel = `${timelineDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${timelineDays[timelineDays.length - 1].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
  const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const openCell = (projectId: string, date: string) => {
    setSelectedCell({ projectId, date });
    setQuickAddModalOpen(true);
  };

  const openQuickAdd = () => {
    setSelectedCell({ projectId: activeProjects[0]?.id, date: toDateKey(new Date()) });
    setQuickAddModalOpen(true);
  };

  const handleLogEntries = async (
    entries: Array<{
      projectId: string;
      date: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      description?: string;
      reported?: boolean;
      tags?: string[];
    }>
  ) => {
    for (const entry of entries) {
      await createTimeEntry(entry);
    }
  };

  const handleDeleteExistingEntry = async (id: string) => {
    await deleteTimeEntry(id);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await createProject(newProjectName.trim(), newProjectColor);
    setNewProjectName('');
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden select-none">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-neutral-100">Apontamento de Horas</h2>

          <div className="flex items-center gap-0.5 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                view === 'grid' ? 'bg-indigo-600/20 text-indigo-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grade
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                view === 'calendar' ? 'bg-indigo-600/20 text-indigo-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendário
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                view === 'timeline' ? 'bg-indigo-600/20 text-indigo-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Linha do Tempo
            </button>
          </div>

          {view === 'grid' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWeekAnchor(new Date(weekDays[0].getTime() - 3 * 24 * 60 * 60 * 1000))}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-300 font-medium w-52 text-center capitalize">{weekLabel}</span>
              <button
                onClick={() => setWeekAnchor(new Date(weekDays[6].getTime() + 3 * 24 * 60 * 60 * 1000))}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWeekAnchor(new Date())}
                className="px-2 py-1 text-[11px] hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                Esta semana
              </button>
            </div>
          ) : view === 'timeline' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTimelineEnd(new Date(timelineDays[0].getTime() - 24 * 60 * 60 * 1000))}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
                title="15 dias anteriores"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-300 font-medium w-40 text-center">{timelineLabel}</span>
              <button
                onClick={() => setTimelineEnd(new Date(timelineDays[timelineDays.length - 1].getTime() + TIMELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000))}
                disabled={toDateKey(timelineEnd) >= toDateKey(new Date())}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Próximos 15 dias"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTimelineEnd(new Date())}
                className="px-2 py-1 text-[11px] hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                Período mais recente
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-neutral-300 font-medium w-40 text-center capitalize">{monthLabel}</span>
              <button
                onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMonthDate(new Date())}
                className="px-2 py-1 text-[11px] hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-100 transition-colors"
              >
                Este mês
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProjectsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs font-medium text-neutral-300 hover:text-white transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Gerenciar Projetos</span>
          </button>
          <button
            onClick={openQuickAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>+ Apontar Horas</span>
          </button>
        </div>
      </div>

      {view === 'grid' && (activeProjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
          Nenhum projeto ainda.{' '}
          <button onClick={() => setProjectsModalOpen(true)} className="text-indigo-400 hover:underline ml-1">
            Crie um projeto
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-2xl border border-neutral-800">
          <div className="min-w-[820px]" style={{ display: 'grid', gridTemplateColumns: '160px repeat(7, 1fr) 84px' }}>
            <div className="sticky top-0 z-10 bg-neutral-900 border-b border-r border-neutral-800 px-3 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Projeto
            </div>
            {weekDays.map((d, i) => (
              <div
                key={toDateKey(d)}
                className={`sticky top-0 z-10 border-b border-r border-neutral-800 px-2 py-2 text-center ${
                  toDateKey(d) === toDateKey(new Date()) ? 'bg-indigo-600/10' : 'bg-neutral-900'
                }`}
              >
                <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">{WEEKDAY_LABELS[i]}</div>
                <div className="text-xs text-neutral-300 font-medium">{d.getDate()}</div>
              </div>
            ))}
            <div className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800 px-2 py-2 text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Total
            </div>

            {activeProjects.map((project) => (
              <React.Fragment key={project.id}>
                <div className="flex items-center gap-2 border-b border-r border-neutral-800 px-3 py-2 bg-neutral-900/40 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <span className="text-xs font-medium text-neutral-200 truncate">{project.name}</span>
                </div>
                {weekDayKeys.map((dk) => {
                  const minutes = cellMinutes(project.id, dk);
                  const entries = cellEntries(project.id, dk);
                  const reported = isCellReported(project.id, dk);
                  return (
                    <button
                      key={dk}
                      onClick={() => openCell(project.id, dk)}
                      className={`border-b border-r border-neutral-800 px-2 py-2 text-center hover:bg-neutral-800/60 transition-colors ${
                        minutes > 0 ? (reported ? 'text-emerald-400 font-medium' : 'text-indigo-300 font-medium') : 'text-neutral-700'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1 text-xs">
                        {reported && <Flag className="w-2.5 h-2.5 fill-current" />}
                        {minutes > 0 ? formatDurationInput(minutes) : '–'}
                      </span>
                      {entries.some((e) => e.tags && e.tags.length > 0) && (
                        <span className="block w-1 h-1 rounded-full bg-amber-400 mx-auto mt-0.5" />
                      )}
                    </button>
                  );
                })}
                <div className="border-b border-neutral-800 px-2 py-2 text-center text-xs font-semibold text-neutral-300 bg-neutral-900/40">
                  {rowTotal(project.id) > 0 ? formatDurationInput(rowTotal(project.id)) : '–'}
                </div>
              </React.Fragment>
            ))}

            <div className="px-3 py-2 text-[11px] font-semibold text-neutral-400 bg-neutral-900 border-r border-neutral-800">
              Total
            </div>
            {weekDayKeys.map((dk) => (
              <div key={dk} className="px-2 py-2 text-center text-[11px] font-semibold text-neutral-400 bg-neutral-900 border-r border-neutral-800">
                {colTotal(dk) > 0 ? formatDurationInput(colTotal(dk)) : '–'}
              </div>
            ))}
            <div className="px-2 py-2 text-center text-[11px] font-bold text-indigo-400 bg-neutral-900">
              {formatDurationInput(grandTotal)}
            </div>
          </div>
        </div>
      ))}

      {view === 'calendar' && (activeProjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
          Nenhum projeto ainda.{' '}
          <button onClick={() => setProjectsModalOpen(true)} className="text-indigo-400 hover:underline ml-1">
            Crie um projeto
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-neutral-800 overflow-hidden">
          <div className="grid grid-cols-7 bg-neutral-900 border-b border-neutral-800">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-2 py-2 text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {label}
              </div>
            ))}
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 overflow-auto">
            {monthDays.map((d) => {
              const dk = toDateKey(d);
              const inMonth = d.getMonth() === monthDate.getMonth();
              const isToday = dk === toDateKey(new Date());
              const total = colTotal(dk);
              const logged = activeProjects.filter((p) => cellMinutes(p.id, dk) > 0);
              return (
                <div
                  key={dk}
                  onClick={() => {
                    setSelectedCell({ projectId: activeProjects[0]?.id, date: dk });
                    setQuickAddModalOpen(true);
                  }}
                  className={`group min-h-[84px] border-b border-r border-neutral-800 p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-neutral-800/40 transition-colors ${
                    inMonth ? '' : 'bg-neutral-950/40'
                  } ${isToday ? 'bg-indigo-600/10' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-medium ${
                        isToday ? 'text-indigo-400' : inMonth ? 'text-neutral-300' : 'text-neutral-600'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    {total > 0 ? (
                      <span className={`text-[10px] font-semibold ${inMonth ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {formatDurationInput(total)}
                      </span>
                    ) : (
                      <Plus className="w-3 h-3 text-neutral-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <div className={`flex flex-col gap-0.5 min-w-0 ${inMonth ? '' : 'opacity-50'}`}>
                    {logged.map((p) => {
                      const reported = isCellReported(p.id, dk);
                      return (
                        <button
                          key={p.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openCell(p.id, dk);
                          }}
                          title={`${p.name}: ${formatDurationDisplay(cellMinutes(p.id, dk))}`}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] text-left min-w-0 hover:brightness-125 transition"
                          style={{ backgroundColor: `${p.color}26`, color: p.color }}
                        >
                          {reported && <Flag className="w-2 h-2 fill-current shrink-0" />}
                          <span className="truncate flex-1">{p.name}</span>
                          <span className="shrink-0 font-medium">{formatDurationInput(cellMinutes(p.id, dk))}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {view === 'timeline' && (activeProjects.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500 text-xs">
          Nenhum projeto ainda.{' '}
          <button onClick={() => setProjectsModalOpen(true)} className="text-indigo-400 hover:underline ml-1">
            Crie um projeto
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-2xl border border-neutral-800 p-5 flex flex-col">
          {(() => {
            const dayTotals = timelineDays.map((d) => colTotal(toDateKey(d)));
            const maxMinutes = Math.max(...dayTotals, 60);
            const hourLines = 4;

            return (
              <>
                <div className="flex-1 flex items-stretch gap-2 min-h-[220px]">
                  <div className="flex flex-col justify-between text-[10px] text-neutral-500 pr-1 pb-6">
                    {Array.from({ length: hourLines + 1 }, (_, i) => {
                      const minutes = Math.round((maxMinutes * (hourLines - i)) / hourLines);
                      return <span key={i}>{formatDurationInput(minutes)}</span>;
                    })}
                  </div>

                  <div className="flex-1 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${TIMELINE_WINDOW_DAYS}, 1fr)` }}>
                    {timelineDays.map((d) => {
                      const dk = toDateKey(d);
                      const total = colTotal(dk);
                      const isToday = dk === toDateKey(new Date());
                      return (
                        <div key={dk} className="flex flex-col items-center justify-end h-full">
                          <div
                            className="w-full flex-1 flex flex-col-reverse justify-start rounded-t-md overflow-hidden bg-neutral-800/30"
                            style={{ maxHeight: '100%' }}
                          >
                            {activeProjects.map((p) => {
                              const minutes = cellMinutes(p.id, dk);
                              if (minutes <= 0) return null;
                              return (
                                <div
                                  key={p.id}
                                  title={`${p.name}: ${formatDurationDisplay(minutes)}`}
                                  style={{ height: `${(minutes / maxMinutes) * 100}%`, backgroundColor: p.color }}
                                  className="w-full first:rounded-t-md"
                                />
                              );
                            })}
                          </div>
                          <span className={`text-[9px] mt-1 ${isToday ? 'text-indigo-400 font-semibold' : 'text-neutral-600'}`}>
                            {d.getDate()}/{d.getMonth() + 1}
                          </span>
                          <span className="text-[9px] text-neutral-500">{total > 0 ? formatDurationInput(total) : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-3 pt-4 mt-4 border-t border-neutral-800">
                  {activeProjects.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      ))}

      {pickerDate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setPickerDate(null)}>
          <div className="w-full max-w-xs bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200 capitalize">
                {new Date(`${pickerDate}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}
              </h3>
              <button onClick={() => setPickerDate(null)} className="p-1 text-neutral-400 hover:text-neutral-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {activeProjects.map((p) => {
                const minutes = cellMinutes(p.id, pickerDate);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      openCell(p.id, pickerDate);
                      setPickerDate(null);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800/60 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-xs text-neutral-200 truncate">{p.name}</span>
                    </span>
                    <span className="text-[11px] text-neutral-500">{minutes > 0 ? formatDurationInput(minutes) : '–'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <QuickAddTimeModal
        isOpen={quickAddModalOpen}
        onClose={() => {
          setQuickAddModalOpen(false);
          setSelectedCell(null);
        }}
        projects={activeProjects}
        initialProjectId={selectedCell?.projectId}
        initialDate={selectedCell?.date}
        existingEntries={
          selectedCell?.projectId && selectedCell?.date
            ? cellEntries(selectedCell.projectId, selectedCell.date)
            : []
        }
        onLogEntries={handleLogEntries}
        onDeleteExistingEntry={handleDeleteExistingEntry}
      />

      {projectsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => setProjectsModalOpen(false)}>
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-200">Gerenciar Projetos</h3>
              <button onClick={() => setProjectsModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto">
              {activeProjects.length === 0 ? (
                <p className="text-[11px] text-neutral-500">Nenhum projeto ainda. Crie um abaixo.</p>
              ) : (
                activeProjects.map((p) => (
                  <div key={p.id} className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-neutral-800/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-xs text-neutral-200 truncate">{p.name}</span>
                    </div>
                    <button
                      onClick={() => deleteProject(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-neutral-500 transition-opacity"
                      title="Excluir projeto (e seus apontamentos)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-neutral-800 space-y-2">
              <input
                type="text"
                placeholder="Nome do novo projeto..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {PROJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewProjectColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform ${newProjectColor === c ? 'ring-2 ring-offset-2 ring-offset-neutral-900 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-3 py-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium rounded-lg shadow transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
