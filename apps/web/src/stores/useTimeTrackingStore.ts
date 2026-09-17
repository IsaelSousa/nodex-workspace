import { create } from 'zustand';
import { Project, TimeEntry } from '@nodex/shared';

interface TimeTrackingStore {
  projects: Project[];
  timeEntries: TimeEntry[];
  isLoaded: boolean;

  fetchAll: () => Promise<void>;

  createProject: (name: string, color: string) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  createTimeEntry: (input: Omit<TimeEntry, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>;
  deleteTimeEntry: (id: string) => Promise<void>;
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

export const useTimeTrackingStore = create<TimeTrackingStore>()((set) => ({
  projects: [],
  timeEntries: [],
  isLoaded: false,

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
      id: `project-${crypto.randomUUID()}`,
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
      id: `entry-${crypto.randomUUID()}`,
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
}));
