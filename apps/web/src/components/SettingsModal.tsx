import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { X, Send, CheckCircle2, XCircle } from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const { telegram, isTesting, testResult, fetchSettings, saveTelegram, testTelegram, isSettingsModalOpen, setSettingsModalOpen } = useSettingsStore();
  const onClose = () => setSettingsModalOpen(false);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isSettingsModalOpen) fetchSettings();
  }, [isSettingsModalOpen, fetchSettings]);

  if (!isSettingsModalOpen) return null;

  const handleSave = async () => {
    if (!botToken.trim() && !chatId.trim()) return;
    const ok = await saveTelegram(botToken.trim(), chatId.trim());
    setSaved(ok);
    setBotToken('');
    setChatId('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-neutral-200">Configurações — Notificações Telegram</h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Crie um bot em{' '}
            <span className="text-indigo-400">@BotFather</span> no Telegram para obter o
            token, e envie qualquer mensagem para{' '}
            <span className="text-indigo-400">@userinfobot</span> para descobrir seu Chat ID.
          </p>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-neutral-500">Bot Token:</span>
            <span className={telegram.botTokenConfigured ? 'text-emerald-400' : 'text-neutral-600'}>
              {telegram.botTokenConfigured ? 'Configurado' : 'Não configurado'}
            </span>
            <span className="text-neutral-700">•</span>
            <span className="text-neutral-500">Chat ID:</span>
            <span className={telegram.chatIdConfigured ? 'text-emerald-400' : 'text-neutral-600'}>
              {telegram.chatIdConfigured ? 'Configurado' : 'Não configurado'}
            </span>
          </div>

          <input
            type="password"
            placeholder="Bot Token (ex: 123456:ABC-DEF...)"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
          />
          <input
            type="text"
            placeholder="Chat ID (ex: 123456789)"
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            className="w-full bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
          />

          {saved && <p className="text-[11px] text-emerald-400">Configurações salvas.</p>}

          {testResult && (
            <div className={`flex items-center gap-1.5 text-[11px] ${testResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
              {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {testResult.message}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={testTelegram}
            disabled={isTesting || (!telegram.botTokenConfigured && !botToken)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-neutral-300 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            {isTesting ? 'Enviando...' : 'Testar'}
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
