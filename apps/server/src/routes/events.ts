import { FastifyInstance } from 'fastify';
import { CalendarEvent } from '@nodex/shared';
import { getAllEvents, getEventById, upsertEvent, deleteEventInDb } from '../db/sqlite.js';

const eventBodySchema = {
  type: 'object',
  required: ['id', 'title', 'startAt'],
  properties: {
    id: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    startAt: { type: 'string', minLength: 1 },
  },
};

const eventUpdateBodySchema = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 1 },
    startAt: { type: 'string', minLength: 1 },
  },
};

export async function eventRoutes(fastify: FastifyInstance) {
  fastify.get('/api/events', async (request, reply) => {
    try {
      return { events: getAllEvents() };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao consultar eventos', details: err.message });
    }
  });

  fastify.post<{ Body: CalendarEvent }>(
    '/api/events',
    { schema: { body: eventBodySchema } },
    async (request, reply) => {
      const event = request.body;
      try {
        upsertEvent(event);
        return { success: true, event };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao salvar evento', details: err.message });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Partial<CalendarEvent> }>(
    '/api/events/:id',
    { schema: { body: eventUpdateBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;
      const existing = getEventById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Evento não encontrado' });
      }

      const reschedule = updates.startAt !== undefined || updates.reminderMinutesBefore !== undefined;
      const merged: CalendarEvent = {
        ...existing,
        ...updates,
        notified: reschedule ? false : existing.notified,
        updatedAt: new Date().toISOString(),
      };

      try {
        upsertEvent(merged);
        return { success: true, event: merged };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao atualizar evento', details: err.message });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/api/events/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      deleteEventInDb(id);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao excluir evento', details: err.message });
    }
  });
}
