import { FastifyInstance } from 'fastify';
import { NodeEntity } from '@nodex/shared';
import {
  getAllNodes,
  getArchivedNodes,
  getNodeById,
  upsertNode,
  deleteNodeInDb,
  archiveNodeInDb,
  restoreNodeInDb,
  emptyTrashInDb,
  getAllEdges,
} from '../db/sqlite.js';

const nodeBodySchema = {
  type: 'object',
  required: ['id', 'type', 'title'],
  properties: {
    id: { type: 'string', minLength: 1 },
    type: { type: 'string', enum: ['document', 'board', 'card', 'database'] },
    title: { type: 'string', minLength: 1 },
  },
};

const nodeUpdateBodySchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['document', 'board', 'card', 'database'] },
    title: { type: 'string', minLength: 1 },
  },
};

export async function nodeRoutes(fastify: FastifyInstance) {
  fastify.get('/api/nodes', async (request, reply) => {
    try {
      const nodes = getAllNodes();
      const edges = getAllEdges();
      return { nodes, edges };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao consultar SQLite', details: err.message });
    }
  });

  fastify.get('/api/nodes/archived', async (request, reply) => {
    try {
      const nodes = getArchivedNodes();
      return { nodes };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao consultar nós arquivados', details: err.message });
    }
  });

  fastify.post('/api/nodes/empty-trash', async (request, reply) => {
    try {
      emptyTrashInDb();
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao esvaziar lixeira', details: err.message });
    }
  });

  fastify.post<{ Params: { id: string } }>('/api/nodes/:id/archive', async (request, reply) => {
    const { id } = request.params;
    try {
      archiveNodeInDb(id);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao arquivar nó no SQLite', details: err.message });
    }
  });

  fastify.post<{ Params: { id: string } }>('/api/nodes/:id/restore', async (request, reply) => {
    const { id } = request.params;
    try {
      restoreNodeInDb(id);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao restaurar nó no SQLite', details: err.message });
    }
  });

  fastify.get<{ Params: { id: string } }>('/api/nodes/:id', async (request, reply) => {
    const { id } = request.params;
    const node = getNodeById(id);
    if (!node) {
      return reply.status(404).send({ error: 'Nó não encontrado' });
    }
    return { node };
  });

  fastify.post<{ Body: NodeEntity }>(
    '/api/nodes',
    { schema: { body: nodeBodySchema } },
    async (request, reply) => {
      const node = request.body;
      try {
        upsertNode(node);
        return { success: true, node };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao salvar nó no SQLite', details: err.message });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Partial<NodeEntity> }>(
    '/api/nodes/:id',
    { schema: { body: nodeUpdateBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;
      const existing = getNodeById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Nó não encontrado' });
      }

      const merged: NodeEntity = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      try {
        upsertNode(merged);
        return { success: true, node: merged };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao atualizar nó no SQLite', details: err.message });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/api/nodes/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      deleteNodeInDb(id);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao excluir nó no SQLite', details: err.message });
    }
  });

  fastify.get('/api/health', async () => {
    return { status: 'healthy', database: 'sqlite', uptime: process.uptime(), version: '0.1.0' };
  });
}
