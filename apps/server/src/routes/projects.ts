import { FastifyInstance } from 'fastify';
import { Project } from '@nodex/shared';
import { getAllProjects, getProjectById, upsertProject, deleteProjectInDb } from '../db/sqlite.js';

const projectBodySchema = {
  type: 'object',
  required: ['id', 'name', 'color'],
  properties: {
    id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    color: { type: 'string', minLength: 1 },
  },
};

const projectUpdateBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    color: { type: 'string', minLength: 1 },
  },
};

export async function projectRoutes(fastify: FastifyInstance) {
  fastify.get('/api/projects', async (request, reply) => {
    try {
      return { projects: getAllProjects() };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao consultar projetos', details: err.message });
    }
  });

  fastify.post<{ Body: Project }>(
    '/api/projects',
    { schema: { body: projectBodySchema } },
    async (request, reply) => {
      const project = request.body;
      try {
        upsertProject(project);
        return { success: true, project };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao salvar projeto', details: err.message });
      }
    }
  );

  fastify.put<{ Params: { id: string }; Body: Partial<Project> }>(
    '/api/projects/:id',
    { schema: { body: projectUpdateBodySchema } },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;
      const existing = getProjectById(id);
      if (!existing) {
        return reply.status(404).send({ error: 'Projeto não encontrado' });
      }

      const merged: Project = { ...existing, ...updates, updatedAt: new Date().toISOString() };

      try {
        upsertProject(merged);
        return { success: true, project: merged };
      } catch (err: any) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Erro ao atualizar projeto', details: err.message });
      }
    }
  );

  fastify.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const { id } = request.params;
    try {
      deleteProjectInDb(id);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao excluir projeto', details: err.message });
    }
  });
}
