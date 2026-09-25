import React, { useEffect, useState, useRef } from 'react';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { Play, Pause, Square, X, Clock, ChevronDown } from 'lucide-react';

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const LiveTimerWidget: React.FC = () => {
  const {
    projects,
    activeTimer,
    startTimer,
    pauseTimer,
    resumeTimer,
    tickTimer,
    stopTimer,
    cancelTimer,
    fetchAll,
    isLoaded,
  } = useTimeTrackingStore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [description, setDescription] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded) {
      fetchAll();
    }
  }, [isLoaded, fetchAll]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!activeTimer || !activeTimer.isRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.isRunning, tickTimer]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleStart = () => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    const pId = selectedProjectId || (projects[0]?.id ?? 'default');
    startTimer(pId, description.trim() || undefined);
    setDescription('');
    setIsOpen(false);
  };

  const currentProject = projects.find((p) => p.id === activeTimer?.projectId);

  if (activeTimer) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700/70 shadow-sm text-xs select-none">
        <span
          className={`w-2 h-2 rounded-full ${
            activeTimer.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
          }`}
          style={currentProject ? { backgroundColor: currentProject.color } : undefined}
          title={currentProject?.name || 'Projeto'}
        />

        <div className="flex items-center gap-1.5 font-mono font-medium text-neutral-100">
          <span>{formatTimer(activeTimer.elapsedSeconds)}</span>
        </div>

        {currentProject && (
          <span className="hidden lg:inline text-[11px] text-neutral-400 max-w-[100px] truncate">
            {currentProject.name}
          </span>
        )}

        <div className="flex items-center gap-0.5 ml-1 border-l border-neutral-800 pl-1">
          {activeTimer.isRunning ? (
            <button
              onClick={pauseTimer}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-amber-300 transition-colors"
              title="Pausar cronômetro"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={resumeTimer}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-emerald-400 transition-colors"
              title="Continuar cronômetro"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => stopTimer()}
            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
            title="Concluir e registrar apontamento"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={cancelTimer}
            className="p-1 rounded hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 transition-colors"
            title="Cancelar e descartar timer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-xs text-neutral-300 hover:text-neutral-100 transition-colors"
        title="Iniciar cronômetro de tempo"
      >
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Timer</span>
        <ChevronDown className="w-3 h-3 text-neutral-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl z-50 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Iniciar Apontamento
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
              Projeto
            </label>
            {projects.length > 0 ? (
              <select
                value={selectedProjectId || projects[0]?.id || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[11px] text-neutral-500 italic">
                Nenhum projeto cadastrado.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
              Descrição (opcional)
            </label>
            <input
              type="text"
              placeholder="No que você está trabalhando?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-neutral-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleStart}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Iniciar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
