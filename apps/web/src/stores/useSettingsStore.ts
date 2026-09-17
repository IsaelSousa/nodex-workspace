import { create } from 'zustand';
import { TelegramSettings } from '@nodex/shared';

interface SettingsStore {
  telegram: TelegramSettings;
  isTesting: boolean;
  testResult: { ok: boolean; message: string } | null;
  isSettingsModalOpen: boolean;

  setSettingsModalOpen: (open: boolean) => void;
  fetchSettings: () => Promise<void>;
  saveTelegram: (botToken: string, chatId: string) => Promise<boolean>;
  testTelegram: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  telegram: { botTokenConfigured: false, chatIdConfigured: false },
  isTesting: false,
  testResult: null,
  isSettingsModalOpen: false,

  setSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        set({ telegram: data.telegram });
      }
    } catch (e) {
    }
  },

  saveTelegram: async (botToken, chatId) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId }),
      });
      if (res.ok) {
        const data = await res.json();
        set({ telegram: data.telegram, testResult: null });
        return true;
      }
    } catch (e) {
    }
    return false;
  },

  testTelegram: async () => {
    set({ isTesting: true, testResult: null });
    try {
      const res = await fetch('/api/settings/telegram/test', { method: 'POST' });
      const data = await res.json();
      set({
        isTesting: false,
        testResult: res.ok ? { ok: true, message: 'Mensagem enviada! Confira seu Telegram.' } : { ok: false, message: data.error || 'Falha ao enviar.' },
      });
    } catch (e) {
      set({ isTesting: false, testResult: { ok: false, message: 'Não foi possível contatar o servidor.' } });
    }
  },
}));
