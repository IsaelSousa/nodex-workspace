import { create } from 'zustand';
import { TelegramSettings } from '@nodex/shared';

interface SettingsStore {
  telegram: TelegramSettings;
  isTesting: boolean;
  testResult: { ok: boolean; message: string } | null;
  isSettingsModalOpen: boolean;
  isExporting: boolean;
  isImporting: boolean;
  backupResult: { ok: boolean; message: string } | null;

  setSettingsModalOpen: (open: boolean) => void;
  fetchSettings: () => Promise<void>;
  saveTelegram: (botToken: string, chatId: string) => Promise<boolean>;
  testTelegram: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<boolean>;
}

export const useSettingsStore = create<SettingsStore>()((set) => ({
  telegram: { botTokenConfigured: false, chatIdConfigured: false },
  isTesting: false,
  testResult: null,
  isSettingsModalOpen: false,
  isExporting: false,
  isImporting: false,
  backupResult: null,

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

  exportBackup: async () => {
    set({ isExporting: true, backupResult: null });
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error('Falha ao exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nodex-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      set({ isExporting: false, backupResult: { ok: true, message: 'Backup exportado com sucesso.' } });
    } catch (e) {
      set({ isExporting: false, backupResult: { ok: false, message: 'Não foi possível exportar o backup.' } });
    }
  },

  importBackup: async (file) => {
    set({ isImporting: true, backupResult: null });
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao importar');
      }
      set({ isImporting: false, backupResult: { ok: true, message: 'Backup importado com sucesso. Recarregue a página.' } });
      return true;
    } catch (e) {
      set({ isImporting: false, backupResult: { ok: false, message: 'Arquivo de backup inválido ou falha ao importar.' } });
      return false;
    }
  },
}));
