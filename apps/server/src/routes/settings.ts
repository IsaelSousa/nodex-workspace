import { FastifyInstance } from 'fastify';
import { getSetting, setSetting } from '../db/sqlite.js';
import { sendTelegramMessage } from '../telegram.js';

interface TelegramSettingsBody {
  botToken?: string;
  chatId?: string;
}

export async function settingsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/settings', async () => {
    return {
      telegram: {
        botTokenConfigured: Boolean(getSetting('telegram_bot_token')),
        chatIdConfigured: Boolean(getSetting('telegram_chat_id')),
      },
    };
  });

  fastify.put<{ Body: TelegramSettingsBody }>('/api/settings', async (request, reply) => {
    const { botToken, chatId } = request.body || {};
    try {
      if (botToken) setSetting('telegram_bot_token', botToken);
      if (chatId) setSetting('telegram_chat_id', chatId);
      return {
        telegram: {
          botTokenConfigured: Boolean(getSetting('telegram_bot_token')),
          chatIdConfigured: Boolean(getSetting('telegram_chat_id')),
        },
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao salvar configurações', details: err.message });
    }
  });

  fastify.post('/api/settings/telegram/test', async (request, reply) => {
    const botToken = getSetting('telegram_bot_token');
    const chatId = getSetting('telegram_chat_id');
    if (!botToken || !chatId) {
      return reply.status(400).send({ ok: false, error: 'Configure o Bot Token e o Chat ID primeiro.' });
    }

    const result = await sendTelegramMessage(
      botToken,
      chatId,
      '✅ NodeX conectado! Você receberá lembretes de compromissos por aqui.'
    );

    if (!result.ok) {
      return reply.status(502).send({ ok: false, error: result.error });
    }
    return { ok: true };
  });
}
