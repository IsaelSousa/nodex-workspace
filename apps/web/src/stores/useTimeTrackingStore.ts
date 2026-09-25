import { create } from 'zustand';
import { Project, TimeEntry } from '@nodex/shared';
import { uuid } from '../lib/uuid';

export interface ActiveTimer {
  projectId: string;
  description?: string;
  cardId?: string;
  startTime: string;
  elapsedSeconds: number;
  isRunning: boolean;
  lastTickTimestamp: number;
}

interface TimeTrackingStore {
  projects: Project[];
  timeEntries: TimeEntry[];
  isLoaded: boolean;
  activeTimer: ActiveTimer | null;

  fetchAll: () => Promise<void>;

  createProject: (name: string, color: string) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createTimeEntry: (input: Omit<TimeEntry, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;

  startTimer: (projectId: string, description?: string, cardId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tickTimer: () => void;
  stopTimer: () => Promise<void>;
  cancelTimer: () => void;
}

async function request(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`Falha ao sincronizar (${method} ${url}):`, res.status, await res.text());
  }
  return res;
}

const TIMER_STORAGE_KEY = 'nodex_live_timer';

function loadStoredTimer(): ActiveTimer | null {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.elapsedSeconds === 'number') {
      if (parsed.isRunning && parsed.lastTickTimestamp) {
        const delta = Math.floor((Date.now() - parsed.lastTickTimestamp) / 1000);
        parsed.elapsedSeconds += Math.max(0, delta);
        parsed.lastTickTimestamp = Date.now();
      }
      return parsed;
    }
  } catch (e) {}
  return null;
}

function saveStoredTimer(timer: ActiveTimer | null) {
  try {
    if (!timer) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } else {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
    }
  } catch (e) {}
}

export const useTimeTrackingStore = create<TimeTrackingStore>()((set, get) => ({
  projects: [],
  timeEntries: [],
  isLoaded: false,
  activeTimer: loadStoredTimer(),

  fetchAll: async () => {
    try {
      const [projectsRes, entriesRes] = await Promise.all([fetch('/api/projects'), fetch('/api/time-entries')]);
      const projects = projectsRes.ok ? (await projectsRes.json()).projects : [];
      const timeEntries = entriesRes.ok ? (await entriesRes.json()).timeEntries : [];
      set({ projects, timeEntries, isLoaded: true });
      return;
    } catch (e) {
    }
    set({ isLoaded: true });
  },

  createProject: async (name, color) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: `project-${uuid()}`,
      workspaceId: 'default',
      name,
      color,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ projects: [...state.projects, project] }));
    await request('/api/projects', 'POST', project);
  },

  updateProject: async (id, updates) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)),
    }));
    await request(`/api/projects/${id}`, 'PUT', updates);
  },

  deleteProject: async (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      timeEntries: state.timeEntries.filter((e) => e.projectId !== id),
    }));
    await request(`/api/projects/${id}`, 'DELETE');
  },

  createTimeEntry: async (input) => {
    const now = new Date().toISOString();
    const entry: TimeEntry = {
      id: `entry-${uuid()}`,
      workspaceId: 'default',
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    set((state) => ({ timeEntries: [...state.timeEntries, entry] }));
    await request('/api/time-entries', 'POST', entry);
  },

  updateTimeEntry: async (id, updates) => {
    set((state) => ({
      timeEntries: state.timeEntries.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
    await request(`/api/time-entries/${id}`, 'PUT', updates);
  },

  deleteTimeEntry: async (id) => {
    set((state) => ({ timeEntries: state.timeEntries.filter((e) => e.id !== id) }));
    await request(`/api/time-entries/${id}`, 'DELETE');
  },

  startTimer: (projectId, description, cardId) => {
    const now = new Date().toISOString();
    const timer: ActiveTimer = {
      projectId,
      description,
      cardId,
      startTime: now,
      elapsedSeconds: 0,
      isRunning: true,
      lastTickTimestamp: Date.now(),
    };
    saveStoredTimer(timer);
    set({ activeTimer: timer });
  },

  pauseTimer: () => {
    set((state) => {
      if (!state.activeTimer || !state.activeTimer.isRunning) return state;
      const now = Date.now();
      const delta = Math.floor((now - state.activeTimer.lastTickTimestamp) / 1000);
      const updated: ActiveTimer = {
        ...state.activeTimer,
        elapsedSeconds: state.activeTimer.elapsedSeconds + Math.max(0, delta),
        isRunning: false,
        lastTickTimestamp: now,
      };
      saveStoredTimer(updated);
      return { activeTimer: updated };
    });
  },

  resumeTimer: () => {
    set((state) => {
      if (!state.activeTimer || state.activeTimer.isRunning) return state;
      const updated: ActiveTimer = {
        ...state.activeTimer,
        isRunning: true,
        lastTickTimestamp: Date.now(),
      };
      saveStoredTimer(updated);
      return { activeTimer: updated };
    });
  },

  tickTimer: () => {
    set((state) => {
      if (!state.activeTimer || !state.activeTimer.isRunning) return state;
      const now = Date.now();
      const delta = Math.floor((now - state.activeTimer.lastTickTimestamp) / 1000);
      if (delta < 1) return state;
      const updated: ActiveTimer = {
        ...state.activeTimer,
        elapsedSeconds: state.activeTimer.elapsedSeconds + delta,
        lastTickTimestamp: now,
      };
      saveStoredTimer(updated);
      return { activeTimer: updated };
    });
  },

  stopTimer: async () => {
    const current = get().activeTimer;
    if (!current) return;
    const now = Date.now();
    const delta = current.isRunning ? Math.floor((now - current.lastTickTimestamp) / 1000) : 0;
    const totalSeconds = current.elapsedSeconds + Math.max(0, delta);
    const durationMinutes = Math.max(1, Math.round(totalSeconds / 60));

    const startDate = new Date(current.startTime);
    const endDate = new Date();

    const toTimeString = (d: Date) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const toDateString = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const entryData = {
      projectId: current.projectId,
      date: toDateString(startDate),
      startTime: toTimeString(startDate),
      endTime: toTimeString(endDate),
      durationMinutes,
      description: current.description || 'Apontamento via cronômetro ao vivo',
      reported: false,
    };

    saveStoredTimer(null);
    set({ activeTimer: null });

    await get().createTimeEntry(entryData);
  },

  cancelTimer: () => {
    saveStoredTimer(null);
    set({ activeTimer: null });
  },
}));
