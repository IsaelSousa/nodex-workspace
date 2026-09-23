import { FastifyInstance } from 'fastify';
import { TimeEntry } from '@nodex/shared';
import { getAllTimeEntries, getTimeEntryById, upsertTimeEntry, deleteTimeEntryInDb } from '../db/sqlite.js';

const entryBodySchema = {
  type: 'object',
  required: ['id', 'projectId', 'date', 'startTime', 'endTime', 'durationMinutes'],
  properties: {
    id: { type: 'string', minLength: 1 },
    projectId: { type: 'string', minLength: 1 },
    date: { type: 'string', minLength: 1 },
    startTime: { type: 'string', minLength: 1 },
    endTime: { type: 'string', minLength: 1 },
    durationMinutes: { type: 'number' },
    reported: { type: 'boolean' },
  },
};

const entryUpdateBodySchema = {
  type: 'object',
  properties: {
    projectId: { type: 'string', minLength: 1 },
    date: { type: 'string', minLength: 1 },
    startTime: { type: 'string', minLength: 1 },
    endTime: { type: 'string', minLength: 1 },
    durationMinutes: { type: 'number' },
    reported: { type: 'boolean' },
  },
};

export async function timeEntryRoutes(fastify: FastifyInstance) {
  fastify.get('/api/time-entries', async (request, reply) => {
    try {
      return { timeEntries: getAllTimeEntries() };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao consultar apontamentos', details: err.message });
    }
  });

  fastify.post<{ Body: TimeEntry }>(
    '/api/time-entries',
    { schema: { body: entryBodySchema } },
    async (request, reply) => {
      const entry = request.body;
      try {
        upsertTimeEntry(entry);
        return { success: true, timeEntry: entry };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao salvar apontamento', details: err.message });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Partial<TimeEntry> }>(
    '/api/time-entries/:id',
    { schema: { body: entryUpdateBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;
      const existing = getTimeEntryById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Apontamento não encontrado' });
      }

      const merged: TimeEntry = { ...existing, ...updates, updatedAt: new Date().toISOString() };

      try {
        upsertTimeEntry(merged);
        return { success: true, timeEntry: merged };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao atualizar apontamento', details: err.message });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/api/time-entries/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      deleteTimeEntryInDb(id);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao excluir apontamento', details: err.message });
    }
  });
}
