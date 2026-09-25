import React, { useState, useEffect, useMemo } from 'react';
import { Project, TimeEntry } from '@nodex/shared';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  Unlock,
  Info,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface QuickAddTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  initialProjectId?: string;
  initialDate?: string;
  existingEntries?: TimeEntry[];
  onLogEntries: (
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
  ) => Promise<void>;
  onDeleteExistingEntry?: (id: string) => Promise<void>;
}

interface StagedEntry {
  tempId: string;
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  minutes: number;
  durationMinutes: number;
  description: string;
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const wrapped = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTotalDisplay(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 minutos';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} minuto${m !== 1 ? 's' : ''}`;
  if (m === 0) return `${h} hora${h !== 1 ? 's' : ''}`;
  return `${h} hora${h !== 1 ? 's' : ''} e ${m} minuto${m !== 1 ? 's' : ''}`;
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const QuickAddTimeModal: React.FC<QuickAddTimeModalProps> = ({
  isOpen,
  onClose,
  projects,
  initialProjectId,
  initialDate,
  existingEntries = [],
  onLogEntries,
  onDeleteExistingEntry,
}) => {
  const activeProjects = useMemo(() => projects.filter((p) => !p.isArchived), [projects]);

  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayString());
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('16:00');
  const [hours, setHours] = useState<number>(8);
  const [minutes, setMinutes] = useState<number>(0);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('');
  const [stagedEntries, setStagedEntries] = useState<StagedEntry[]>([]);
  const [showInfoTooltip, setShowInfoTooltip] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or update fields when modal opens
  useEffect(() => {
    if (isOpen) {
      const selectedProj =
        initialProjectId && activeProjects.some((p) => p.id === initialProjectId)
          ? initialProjectId
          : activeProjects[0]?.id || '';
      setProjectId(selectedProj);
      setDate(initialDate || getTodayString());
      setStartTime('08:00');
      setEndTime('16:00');
      setHours(8);
      setMinutes(0);
      setIsLocked(true);
      setDescription('');
      setStagedEntries([]);
      setErrorMessage(null);
    }
  }, [isOpen, initialProjectId, initialDate, activeProjects]);

  if (!isOpen) return null;

  // Handlers for time calculations
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (isLocked) {
      let diff = timeToMinutes(endTime) - timeToMinutes(newStart);
      if (diff < 0) diff += 1440;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setHours(h);
      setMinutes(m);
    }
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (isLocked) {
      let diff = timeToMinutes(newEnd) - timeToMinutes(startTime);
      if (diff < 0) diff += 1440;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      setHours(h);
      setMinutes(m);
    }
  };

  const handleHoursChange = (val: number) => {
    const h = Math.max(0, val);
    setHours(h);
    if (isLocked) {
      const totalDur = h * 60 + (minutes || 0);
      const startMins = timeToMinutes(startTime);
      setEndTime(minutesToTime(startMins + totalDur));
    }
  };

  const handleMinutesChange = (val: number) => {
    const m = Math.max(0, Math.min(59, val));
    setMinutes(m);
    if (isLocked) {
      const totalDur = (hours || 0) * 60 + m;
      const startMins = timeToMinutes(startTime);
      setEndTime(minutesToTime(startMins + totalDur));
    }
  };

  const handleLockToggle = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    if (nextLocked) {
      // Re-synchronize end time based on current hours & minutes
      const totalDur = (hours || 0) * 60 + (minutes || 0);
      const startMins = timeToMinutes(startTime);
      setEndTime(minutesToTime(startMins + totalDur));
    }
  };

  // Add to staged entries
  const handleAdd = () => {
    setErrorMessage(null);
    if (!projectId) {
      setErrorMessage('Por favor, selecione um projeto.');
      return;
    }

    const durationMinutes = (hours || 0) * 60 + (minutes || 0);
    if (durationMinutes <= 0) {
      setErrorMessage('O tempo apontado deve ser maior que 0 minutos.');
      return;
    }

    const newEntry: StagedEntry = {
      tempId: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId,
      date,
      startTime,
      endTime,
      hours: hours || 0,
      minutes: minutes || 0,
      durationMinutes,
      description: description.trim(),
    };

    setStagedEntries((prev) => [...prev, newEntry]);

    // Advance for next convenient entry
    setDescription('');
    setStartTime(endTime);
    // Keep end time = start time + same duration
    const nextEnd = minutesToTime(timeToMinutes(endTime) + durationMinutes);
    setEndTime(nextEnd);
  };

  const handleRemoveStaged = (tempId: string) => {
    setStagedEntries((prev) => prev.filter((e) => e.tempId !== tempId));
  };

  // Submit all entries
  const handleLogEntries = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const entriesToLog = [...stagedEntries];

      // If no entries are staged yet, but the user filled out the form and clicked "Registrar Apontamentos",
      // automatically include the current valid entry!
      const currentDuration = (hours || 0) * 60 + (minutes || 0);
      if (entriesToLog.length === 0) {
        if (!projectId) {
          setErrorMessage('Por favor, selecione um projeto.');
          setIsSubmitting(false);
          return;
        }
        if (currentDuration <= 0) {
          setErrorMessage('Informe a duração do apontamento antes de salvar.');
          setIsSubmitting(false);
          return;
        }
        entriesToLog.push({
          tempId: 'current',
          projectId,
          date,
          startTime,
          endTime,
          hours: hours || 0,
          minutes: minutes || 0,
          durationMinutes: currentDuration,
          description: description.trim(),
        });
      }

      await onLogEntries(
        entriesToLog.map((e) => ({
          projectId: e.projectId,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          durationMinutes: e.durationMinutes,
          description: e.description || undefined,
          reported: true,
        }))
      );

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao registrar apontamentos');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total minutes for the staged entries
  const totalStagedMinutes = stagedEntries.reduce((sum, e) => sum + e.durationMinutes, 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-neutral-100 tracking-tight">
              Apontar Horas nos Projetos
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-medium">
              Apontamento Rápido
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-white hover:text-neutral-300 hover:bg-neutral-800 rounded-md transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Row 1: Projeto, Data, Hora Inicial, Hora Final, Tempo Gasto */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
            {/* Projeto Dropdown */}
            <div className="col-span-12 md:col-span-4">
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Projeto
              </label>
              {activeProjects.length > 0 ? (
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-8 rounded-lg text-xs font-medium bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  >
                    {activeProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                    <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="text-xs p-2 rounded-lg border border-dashed border-neutral-800 text-neutral-500 bg-neutral-950">
                  Nenhum projeto ativo
                </div>
              )}
            </div>

            {/* Data Input */}
            <div className="col-span-6 md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Data
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 rounded-lg text-xs font-medium bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none focus:border-indigo-500/60 transition-colors [color-scheme:dark]"
                />
                <CalendarIcon className="w-3.5 h-3.5 text-white absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Hora Inicial */}
            <div className="col-span-6 md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Hora Inicial
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 rounded-lg text-xs font-medium bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none focus:border-indigo-500/60 transition-colors [color-scheme:dark]"
                />
                <Clock className="w-3.5 h-3.5 text-white absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Hora Final */}
            <div className="col-span-6 md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Hora Final
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-2 rounded-lg text-xs font-medium bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none focus:border-indigo-500/60 transition-colors [color-scheme:dark]"
                />
                <Clock className="w-3.5 h-3.5 text-white absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Tempo Gasto (Horas + Minutos + Trava) */}
            <div className="col-span-6 md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Tempo Gasto
              </label>
              <div className="flex items-center gap-1.5">
                {/* Horas */}
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    value={hours === 0 ? '0' : hours || ''}
                    onChange={(e) => handleHoursChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-center py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  />
                  <span className="block text-[10px] text-center mt-0.5 text-neutral-400">
                    horas
                  </span>
                </div>

                {/* Minutos */}
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes === 0 ? '0' : minutes || ''}
                    onChange={(e) => handleMinutesChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-center py-1.5 rounded-lg text-xs font-semibold bg-neutral-950 text-neutral-100 border border-neutral-800 focus:outline-none focus:border-indigo-500/60 transition-colors"
                  />
                  <span className="block text-[10px] text-center mt-0.5 text-neutral-400">
                    minutos
                  </span>
                </div>

                {/* Botão de Trava/Cadeado */}
                <button
                  type="button"
                  onClick={handleLockToggle}
                  className="p-1.5 mb-3.5 rounded-md text-white hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                  title={
                    isLocked
                      ? 'Duração sincronizada com os horários (clique para destravar)'
                      : 'Duração independente (clique para sincronizar)'
                  }
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5 text-white" /> : <Unlock className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            </div>
          </div>

          {/* Form Row 2: Descrição e Botão Adicionar */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 relative">
              <label className="text-xs font-medium text-neutral-300">
                Descrição
              </label>
              <div
                className="relative inline-block"
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
              >
                <button
                  type="button"
                  className="p-0.5 text-white hover:text-neutral-300 transition-colors"
                  aria-label="Info"
                >
                  <Info className="w-3.5 h-3.5 text-white" />
                </button>
                {showInfoTooltip && (
                  <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 p-2 rounded-lg text-[11px] shadow-xl border bg-neutral-800 text-neutral-200 border-neutral-700 pointer-events-none transition-opacity">
                    Descreva resumidamente as tarefas executadas neste intervalo de horas.
                  </div>
                )}
              </div>
            </div>

            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a atividade..."
              className="w-full px-3 py-2 rounded-lg text-xs font-normal bg-neutral-950 text-neutral-100 border border-neutral-800 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/60 transition-colors resize-y"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAdd}
                className="px-5 py-1.5 rounded-full text-xs font-medium border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500 transition-colors shadow-sm"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Apontamentos em Fila (Staged) */}
          {stagedEntries.length > 0 && (
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Apontamentos prontos para registrar ({stagedEntries.length})
                </span>
                <span className="text-xs font-medium text-indigo-400">
                  Total da lista: {formatTotalDisplay(totalStagedMinutes)}
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {stagedEntries.map((item) => {
                  const proj = activeProjects.find((p) => p.id === item.projectId);
                  return (
                    <div
                      key={item.tempId}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-neutral-900 border-neutral-800/80 hover:border-neutral-700 text-xs text-neutral-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: proj?.color || '#6366f1' }}
                        />
                        <span className="font-medium text-neutral-200 truncate max-w-[140px]">
                          {proj?.name || 'Projeto'}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {item.date}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {item.startTime} - {item.endTime} ({formatTotalDisplay(item.durationMinutes)})
                        </span>
                        {item.description && (
                          <span
                            className="truncate text-[11px] italic text-neutral-400 max-w-xs"
                            title={item.description}
                          >
                            "{item.description}"
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStaged(item.tempId)}
                        className="p-1.5 rounded-md text-white hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="Remover da lista"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Apontamentos já salvos neste dia */}
          {existingEntries.length > 0 && (
            <div className="p-3 rounded-lg border border-neutral-800/80 bg-neutral-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Apontamentos já salvos neste dia ({existingEntries.length})
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {existingEntries.map((e) => {
                  const proj = activeProjects.find((p) => p.id === e.projectId);
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg border bg-neutral-900/60 border-neutral-800 text-xs text-neutral-300"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: proj?.color || '#6366f1' }}
                        />
                        <span className="font-medium truncate max-w-[120px]">{proj?.name}</span>
                        <span className="text-[11px] text-neutral-400">
                          {formatTotalDisplay(e.durationMinutes)}
                        </span>
                        {e.description && (
                          <span className="truncate text-[11px] text-neutral-400 max-w-sm italic">
                            "{e.description}"
                          </span>
                        )}
                      </div>

                      {onDeleteExistingEntry && (
                        <button
                          type="button"
                          onClick={() => onDeleteExistingEntry(e.id)}
                          className="p-1 text-white hover:text-rose-400 transition-colors"
                          title="Excluir este apontamento"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            Fechar
          </button>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-neutral-400">
              {formatTotalDisplay(totalStagedMinutes)}
            </span>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleLogEntries}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Registrar Apontamentos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
