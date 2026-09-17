import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { NodeEntity, Edge, CalendarEvent, Project, TimeEntry } from '@nodex/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = process.env.DATA_DIR || path.resolve(__dirname, '../../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'nodex.sqlite');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      parent_node_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      icon TEXT,
      is_archived INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      content_markdown TEXT,
      board_config TEXT,
      properties TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS edges (
      id TEXT PRIMARY KEY,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      start_at TEXT NOT NULL,
      end_at TEXT,
      reminder_minutes_before INTEGER,
      notified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      is_archived INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      duration_minutes INTEGER NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_node_id);
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_node_id);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_node_id);
    CREATE INDEX IF NOT EXISTS idx_events_start ON calendar_events(start_at);
    CREATE INDEX IF NOT EXISTS idx_entries_project ON time_entries(project_id);
    CREATE INDEX IF NOT EXISTS idx_entries_date ON time_entries(date);
  `);

  try {
    db.exec('ALTER TABLE time_entries ADD COLUMN break_minutes INTEGER DEFAULT 0');
  } catch (e) {
  }

  try {
    db.exec('ALTER TABLE time_entries ADD COLUMN tags TEXT');
  } catch (e) {
  }

  console.log(`📦 SQLite inicializado em: ${dbPath}`);
  seedInitialDataIfEmpty();

  setInterval(() => {
    db.pragma('wal_checkpoint(PASSIVE)');
  }, 5 * 60 * 1000).unref();
}

export function getAllNodes(): NodeEntity[] {
  const rows = db.prepare('SELECT * FROM nodes WHERE is_archived = 0 ORDER BY updated_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    workspaceId: r.workspace_id,
    parentNodeId: r.parent_node_id,
    type: r.type,
    title: r.title,
    icon: r.icon,
    isArchived: Boolean(r.is_archived),
    isFavorite: Boolean(r.is_favorite),
    contentMarkdown: r.content_markdown || '',
    boardConfig: r.board_config ? JSON.parse(r.board_config) : undefined,
    properties: r.properties ? JSON.parse(r.properties) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export function getNodeById(id: string): NodeEntity | undefined {
  const r = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id) as any;
  if (!r) return undefined;
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    parentNodeId: r.parent_node_id,
    type: r.type,
    title: r.title,
    icon: r.icon,
    isArchived: Boolean(r.is_archived),
    isFavorite: Boolean(r.is_favorite),
    contentMarkdown: r.content_markdown || '',
    boardConfig: r.board_config ? JSON.parse(r.board_config) : undefined,
    properties: r.properties ? JSON.parse(r.properties) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function upsertNode(node: NodeEntity): void {
  const stmt = db.prepare(`
    INSERT INTO nodes (
      id, workspace_id, parent_node_id, type, title, icon, 
      is_archived, is_favorite, content_markdown, board_config, 
      properties, created_at, updated_at
    ) VALUES (
      @id, @workspaceId, @parentNodeId, @type, @title, @icon,
      @isArchived, @isFavorite, @contentMarkdown, @boardConfig,
      @properties, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      parent_node_id = excluded.parent_node_id,
      type = excluded.type,
      title = excluded.title,
      icon = excluded.icon,
      is_archived = excluded.is_archived,
      is_favorite = excluded.is_favorite,
      content_markdown = excluded.content_markdown,
      board_config = excluded.board_config,
      properties = excluded.properties,
      updated_at = excluded.updated_at
  `);

  stmt.run({
    id: node.id,
    workspaceId: node.workspaceId || 'default',
    parentNodeId: node.parentNodeId || null,
    type: node.type,
    title: node.title,
    icon: node.icon || null,
    isArchived: node.isArchived ? 1 : 0,
    isFavorite: node.isFavorite ? 1 : 0,
    contentMarkdown: node.contentMarkdown || '',
    boardConfig: node.boardConfig ? JSON.stringify(node.boardConfig) : null,
    properties: node.properties ? JSON.stringify(node.properties) : null,
    createdAt: node.createdAt || new Date().toISOString(),
    updatedAt: node.updatedAt || new Date().toISOString(),
  });
}

export function deleteNodeInDb(id: string): void {
  const tx = db.transaction(() => {
    const descendantRows = db.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT id FROM nodes WHERE id = ?
        UNION ALL
        SELECT n.id FROM nodes n JOIN descendants d ON n.parent_node_id = d.id
      )
      SELECT id FROM descendants
    `).all(id) as { id: string }[];
    const ids = descendantRows.map((r) => r.id);
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`DELETE FROM nodes WHERE id IN (${placeholders})`).run(...ids);
    db.prepare(
      `DELETE FROM edges WHERE source_node_id IN (${placeholders}) OR target_node_id IN (${placeholders})`
    ).run(...ids, ...ids);

    const deletedIds = new Set(ids);
    const boards = db.prepare('SELECT id, board_config FROM nodes WHERE type = ?').all('board') as any[];
    for (const b of boards) {
      if (b.board_config) {
        try {
          const config = JSON.parse(b.board_config);
          if (config.columns) {
            let modified = false;
            config.columns = config.columns.map((col: any) => {
              if (col.cardNodeIds && col.cardNodeIds.some((cid: string) => deletedIds.has(cid))) {
                modified = true;
                return { ...col, cardNodeIds: col.cardNodeIds.filter((cid: string) => !deletedIds.has(cid)) };
              }
              return col;
            });
            if (modified) {
              db.prepare('UPDATE nodes SET board_config = ?, updated_at = ? WHERE id = ?')
                .run(JSON.stringify(config), new Date().toISOString(), b.id);
            }
          }
        } catch (e) {}
      }
    }
  });
  tx();
}

export function getAllEdges(): Edge[] {
  const rows = db.prepare('SELECT * FROM edges').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    sourceNodeId: r.source_node_id,
    targetNodeId: r.target_node_id,
    edgeType: r.edge_type,
    label: r.label,
    createdAt: r.created_at,
  }));
}

export function getAllEvents(): CalendarEvent[] {
  const rows = db.prepare('SELECT * FROM calendar_events ORDER BY start_at ASC').all() as any[];
  return rows.map(mapEventRow);
}

export function getEventById(id: string): CalendarEvent | undefined {
  const r = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as any;
  return r ? mapEventRow(r) : undefined;
}

export function upsertEvent(event: CalendarEvent): void {
  const stmt = db.prepare(`
    INSERT INTO calendar_events (
      id, workspace_id, title, description, start_at, end_at,
      reminder_minutes_before, notified, created_at, updated_at
    ) VALUES (
      @id, @workspaceId, @title, @description, @startAt, @endAt,
      @reminderMinutesBefore, @notified, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      description = excluded.description,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      reminder_minutes_before = excluded.reminder_minutes_before,
      notified = excluded.notified,
      updated_at = excluded.updated_at
  `);

  stmt.run({
    id: event.id,
    workspaceId: event.workspaceId || 'default',
    title: event.title,
    description: event.description || null,
    startAt: event.startAt,
    endAt: event.endAt || null,
    reminderMinutesBefore: event.reminderMinutesBefore ?? null,
    notified: event.notified ? 1 : 0,
    createdAt: event.createdAt || new Date().toISOString(),
    updatedAt: event.updatedAt || new Date().toISOString(),
  });
}

export function deleteEventInDb(id: string): void {
  db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
}

export function getDueReminders(nowIso: string): CalendarEvent[] {
  const rows = db.prepare(`
    SELECT * FROM calendar_events
    WHERE notified = 0
      AND reminder_minutes_before IS NOT NULL
      AND datetime(start_at, '-' || reminder_minutes_before || ' minutes') <= datetime(?)
  `).all(nowIso) as any[];
  return rows.map(mapEventRow);
}

export function markEventNotified(id: string): void {
  db.prepare('UPDATE calendar_events SET notified = 1, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), id);
}

function mapEventRow(r: any): CalendarEvent {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    title: r.title,
    description: r.description || undefined,
    startAt: r.start_at,
    endAt: r.end_at || undefined,
    reminderMinutesBefore: r.reminder_minutes_before ?? undefined,
    notified: Boolean(r.notified),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getAllProjects(): Project[] {
  const rows = db.prepare('SELECT * FROM projects ORDER BY name ASC').all() as any[];
  return rows.map(mapProjectRow);
}

export function getProjectById(id: string): Project | undefined {
  const r = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
  return r ? mapProjectRow(r) : undefined;
}

export function upsertProject(project: Project): void {
  const stmt = db.prepare(`
    INSERT INTO projects (id, workspace_id, name, color, is_archived, created_at, updated_at)
    VALUES (@id, @workspaceId, @name, @color, @isArchived, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      color = excluded.color,
      is_archived = excluded.is_archived,
      updated_at = excluded.updated_at
  `);
  stmt.run({
    id: project.id,
    workspaceId: project.workspaceId || 'default',
    name: project.name,
    color: project.color,
    isArchived: project.isArchived ? 1 : 0,
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: project.updatedAt || new Date().toISOString(),
  });
}

export function deleteProjectInDb(id: string): void {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM time_entries WHERE project_id = ?').run(id);
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  });
  tx();
}

function mapProjectRow(r: any): Project {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    name: r.name,
    color: r.color,
    isArchived: Boolean(r.is_archived),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getAllTimeEntries(): TimeEntry[] {
  const rows = db.prepare('SELECT * FROM time_entries ORDER BY date DESC, start_time DESC').all() as any[];
  return rows.map(mapTimeEntryRow);
}

export function getTimeEntryById(id: string): TimeEntry | undefined {
  const r = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(id) as any;
  return r ? mapTimeEntryRow(r) : undefined;
}

export function upsertTimeEntry(entry: TimeEntry): void {
  const stmt = db.prepare(`
    INSERT INTO time_entries (
      id, workspace_id, project_id, date, start_time, end_time,
      break_minutes, duration_minutes, tags, description, created_at, updated_at
    ) VALUES (
      @id, @workspaceId, @projectId, @date, @startTime, @endTime,
      @breakMinutes, @durationMinutes, @tags, @description, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      date = excluded.date,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      break_minutes = excluded.break_minutes,
      duration_minutes = excluded.duration_minutes,
      tags = excluded.tags,
      description = excluded.description,
      updated_at = excluded.updated_at
  `);
  stmt.run({
    id: entry.id,
    workspaceId: entry.workspaceId || 'default',
    projectId: entry.projectId,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    breakMinutes: entry.breakMinutes || 0,
    durationMinutes: entry.durationMinutes,
    tags: entry.tags && entry.tags.length > 0 ? JSON.stringify(entry.tags) : null,
    description: entry.description || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
  });
}

export function deleteTimeEntryInDb(id: string): void {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(id);
}

function mapTimeEntryRow(r: any): TimeEntry {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    projectId: r.project_id,
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    breakMinutes: r.break_minutes || undefined,
    durationMinutes: r.duration_minutes,
    tags: r.tags ? JSON.parse(r.tags) : undefined,
    description: r.description || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getSetting(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as any;
  return row?.value;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value);
}

function seedInitialDataIfEmpty() {
  const meta = db.prepare('SELECT value FROM meta WHERE key = ?').get('is_seeded') as any;
  if (meta && meta.value === 'true') {
    return;
  }

  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('is_seeded', 'true');

  console.log('🌱 Criando dados iniciais no SQLite (apenas na 1ª inicialização)...');
  
  const initialDoc: NodeEntity = {
    id: 'doc-overview',
    workspaceId: 'default',
    type: 'document',
    title: 'Visão Geral do Projeto NodeX',
    icon: '🚀',
    isArchived: false,
    isFavorite: true,
    contentMarkdown: `## Bem-vindo ao NodeX

O NodeX é uma plataforma moderna para gestão de conhecimento e execução de tarefas:

- **Editor em Blocos**: Edição fluida, comandos \`/\` e listas de tarefas.
- **Quadros Kanban**: Gestão visual de fluxo de trabalho no [[Quadro de Tarefas do Sprint]].
- **Grafo & Backlinks**: Conexões bidirecionais automáticas com \`[[WikiLinks]]\` e visualização interativa em grafo.

### Objetivos do Ciclo
1. [x] Definir arquitetura de software e stack tecnológica
2. [ ] Consolidar o [[Design System & UI Tokens]]
3. [ ] Implementar persistência em banco de dados SQLite

> Experimente clicar em qualquer link azul \`[[...]]\` para navegar diretamente ou abra a visualização de Grafo no topo!`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialBoard: NodeEntity = {
    id: 'board-sprint',
    workspaceId: 'default',
    type: 'board',
    title: 'Quadro de Tarefas do Sprint',
    icon: '📋',
    isArchived: false,
    isFavorite: true,
    boardConfig: {
      columns: [
        {
          id: 'col-todo',
          title: 'A Fazer',
          color: '#6366f1',
          cardNodeIds: ['card-1', 'card-2'],
        },
        {
          id: 'col-in-progress',
          title: 'Em Andamento',
          color: '#f59e0b',
          cardNodeIds: ['card-3'],
        },
        {
          id: 'col-done',
          title: 'Concluído',
          color: '#10b981',
          cardNodeIds: ['card-4'],
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const card1: NodeEntity = {
    id: 'card-1',
    workspaceId: 'default',
    parentNodeId: 'board-sprint',
    type: 'card',
    title: 'Desenhar componentes do Design System',
    icon: '🎨',
    isArchived: false,
    isFavorite: false,
    properties: { priority: 'Alta', tag: 'UI/UX' },
    contentMarkdown: `Detalhes da tarefa:\nAlinhar cores, tipografia e botões com base no [[Design System & UI Tokens]].`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const card2: NodeEntity = {
    id: 'card-2',
    workspaceId: 'default',
    parentNodeId: 'board-sprint',
    type: 'card',
    title: 'Configurar Docker Compose',
    icon: '🐳',
    isArchived: false,
    isFavorite: false,
    properties: { priority: 'Média', tag: 'DevOps' },
    contentMarkdown: `Criar arquivo docker-compose.yml pronto para rodar com 1 comando.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const card3: NodeEntity = {
    id: 'card-3',
    workspaceId: 'default',
    parentNodeId: 'board-sprint',
    type: 'card',
    title: 'Desenvolver motor de Grafo em WebGL',
    icon: '🕸️',
    isArchived: false,
    isFavorite: false,
    properties: { priority: 'Alta', tag: 'Frontend' },
    contentMarkdown: `Renderização de nós e arestas com força gravitacional em 60fps conectada ao [[Visão Geral do Projeto NodeX]].`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const card4: NodeEntity = {
    id: 'card-4',
    workspaceId: 'default',
    parentNodeId: 'board-sprint',
    type: 'card',
    title: 'Especificar Modelo de Dados Unificado',
    icon: '📐',
    isArchived: false,
    isFavorite: false,
    properties: { priority: 'Baixa', tag: 'Arquitetura' },
    contentMarkdown: `Estrutura baseada em nós com suporte a documentos, boards e cards.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const docDesign: NodeEntity = {
    id: 'doc-design',
    workspaceId: 'default',
    type: 'document',
    title: 'Design System & UI Tokens',
    icon: '✨',
    isArchived: false,
    isFavorite: false,
    contentMarkdown: `## Diretrizes Visuais\n\n- Cores: Indigo (#6366f1)\n- Tipografia: Inter & JetBrains Mono\n\nReferenciado em tarefas como [[Desenhar componentes do Design System]].`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  [initialDoc, initialBoard, card1, card2, card3, card4, docDesign].forEach((n) => upsertNode(n));
}
