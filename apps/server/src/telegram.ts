import { getSetting, getDueReminders, markEventNotified } from './db/sqlite.js';

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `Telegram respondeu ${res.status}` };
    }
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Falha de rede ao contatar o Telegram' };
  }
}

async function checkDueReminders() {
  const botToken = getSetting('telegram_bot_token');
  const chatId = getSetting('telegram_chat_id');
  if (!botToken || !chatId) return;

  const due = getDueReminders(new Date().toISOString());
  for (const event of due) {
    const when = new Date(event.startAt).toLocaleString('pt-BR');
    const text = `🔔 Lembrete: ${event.title}\n🕒 ${when}${event.description ? `\n${event.description}` : ''}`;
    const result = await sendTelegramMessage(botToken, chatId, text);
    if (result.ok) {
      markEventNotified(event.id);
    } else {
      console.error(`⚠️ Falha ao enviar lembrete do Telegram para "${event.title}":`, result.error);
    }
  }
}

export function startReminderScheduler() {
  setInterval(checkDueReminders, 30 * 1000).unref();
}
