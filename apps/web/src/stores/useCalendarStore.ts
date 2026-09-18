import { create } from 'zustand';
import { CalendarEvent } from '@nodex/shared';
import { uuid } from '../lib/uuid';

interface CalendarStore {
  events: CalendarEvent[];
  isLoaded: boolean;

  fetchEvents: () => Promise<void>;
  createEvent: (input: Omit<CalendarEvent, 'id' | 'workspaceId' | 'notified' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

async function request(url: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    console.error(`Falha ao sincronizar evento (${method} ${url}):`, res.status, await res.text());
  }
  return res;
}

export const useCalendarStore = create<CalendarStore>()((set, get) => ({
  events: [],
  isLoaded: false,

  fetchEvents: async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        set({ events: data.events || [], isLoaded: true });
        return;
      }
    } catch (e) {
    }
    set({ isLoaded: true });
  },

  createEvent: async (input) => {
    const now = new Date().toISOString();
    const event: CalendarEvent = {
      id: `event-${uuid()}`,
      workspaceId: 'default',
      notified: false,
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    set((state) => ({ events: [...state.events, event] }));
    await request('/api/events', 'POST', event);
  },

  updateEvent: async (id, updates) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e)),
    }));
    await request(`/api/events/${id}`, 'PUT', updates);
  },

  deleteEvent: async (id) => {
    set((state) => ({ events: state.events.filter((e) => e.id !== id) }));
    await request(`/api/events/${id}`, 'DELETE');
  },
}));
