import { FastifyInstance } from 'fastify';
import { exportAllData, importAllData, BackupData } from '../db/sqlite.js';

export async function backupRoutes(fastify: FastifyInstance) {
  fastify.get('/api/backup/export', async (request, reply) => {
    try {
      const data = exportAllData();
      const filename = `nodex-backup-${new Date().toISOString().slice(0, 10)}.json`;
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      return data;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao exportar dados', details: err.message });
    }
  });

  fastify.post<{ Body: BackupData }>('/api/backup/import', async (request, reply) => {
    const data = request.body;
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray(data.nodes) ||
      !Array.isArray(data.edges) ||
      !Array.isArray(data.calendarEvents) ||
      !Array.isArray(data.projects) ||
      !Array.isArray(data.timeEntries)
    ) {
      return reply.status(400).send({ error: 'Arquivo de backup inválido' });
    }

    try {
      importAllData(data);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Erro ao importar dados', details: err.message });
    }
  });
}
