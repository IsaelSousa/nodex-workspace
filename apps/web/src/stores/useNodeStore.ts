import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NodeEntity, Edge, NodeType, KanbanColumn, DatabaseColumn, DatabaseColumnType, extractWikiLinks } from '@nodex/shared';
import { uuid } from '../lib/uuid';

type ViewType = 'home' | 'doc' | 'board' | 'database' | 'graph' | 'split' | 'calendar' | 'timesheet' | 'tags';

interface NodeStore {
  nodes: NodeEntity[];
  edges: Edge[];
  activeNodeId: string | null;
  activeView: ViewType;
  searchQuery: string;
  isSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  isInitialized: boolean;
  activeTagFilter: string | null;
  canUndo: boolean;
  canRedo: boolean;

  undo: () => void;
  redo: () => void;

  fetchNodesFromBackend: () => Promise<void>;
  setActiveNodeId: (id: string | null) => void;
  setActiveView: (view: ViewType) => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveTagFilter: (tag: string | null) => void;

  archivedNodes: NodeEntity[];
  isTrashOpen: boolean;
  setTrashOpen: (open: boolean) => void;
  fetchArchivedNodes: () => Promise<void>;
  archiveNode: (id: string) => Promise<void>;
  restoreNode: (id: string) => Promise<void>;
  permanentlyDeleteNode: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;

  createNode: (type: NodeType, title?: string, parentNodeId?: string | null, navigate?: boolean) => NodeEntity;
  updateNode: (id: string, updates: Partial<NodeEntity>) => void;
  deleteNode: (id: string) => void;
  toggleFavorite: (id: string) => void;

  moveCard: (cardId: string, sourceColId: string, destColId: string, newIndex: number) => void;
  addCardToColumn: (boardId: string, columnId: string, cardTitle: string) => void;
  addColumnToBoard: (boardId: string, columnTitle: string) => void;
  deleteColumn: (boardId: string, columnId: string) => void;

  addDatabaseColumn: (databaseId: string, name: string, type: DatabaseColumnType) => void;
  updateDatabaseColumn: (databaseId: string, columnId: string, updates: Partial<DatabaseColumn>) => void;
  deleteDatabaseColumn: (databaseId: string, columnId: string) => void;
  addDatabaseRow: (databaseId: string, title?: string) => NodeEntity;
  updateRowValue: (databaseId: string, rowId: string, columnId: string, value: any) => void;
  deleteDatabaseRow: (databaseId: string, rowId: string) => void;

  addTag: (nodeId: string, tag: string) => void;
  removeTag: (nodeId: string, tag: string) => void;
  getAllTags: () => { tag: string; count: number }[];

  saveAsTemplate: (nodeId: string) => NodeEntity;
  createFromTemplate: (templateId: string, navigate?: boolean) => NodeEntity;

  recalculateEdges: () => void;
  getNodeById: (id: string) => NodeEntity | undefined;
  getNodeByTitle: (title: string) => NodeEntity | undefined;
  getBacklinksForNode: (nodeId: string) => { sourceNodes: NodeEntity[]; targetNodes: NodeEntity[] };
}

const DEFAULT_WELCOME_NODES: NodeEntity[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

function generateEdges(nodes: NodeEntity[]): Edge[] {
  const edges: Edge[] = [];
  const titleToNodeMap = new Map<string, NodeEntity>();

  nodes.forEach(n => {
    titleToNodeMap.set(n.title.toLowerCase().trim(), n);
  });

  nodes.forEach(source => {
    if (source.parentNodeId) {
      edges.push({
        id: `edge-${source.parentNodeId}-${source.id}`,
        sourceNodeId: source.parentNodeId,
        targetNodeId: source.id,
        edgeType: 'board_card',
        createdAt: new Date().toISOString(),
      });
    }

    if (source.contentMarkdown) {
      const links = extractWikiLinks(source.contentMarkdown);
      links.forEach(linkTitle => {
        const target = titleToNodeMap.get(linkTitle.toLowerCase().trim());
        if (target && target.id !== source.id) {
          const edgeId = `edge-${source.id}-${target.id}`;
          if (!edges.some(e => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              sourceNodeId: source.id,
              targetNodeId: target.id,
              edgeType: 'wikilink',
              label: 'menciona',
              createdAt: new Date().toISOString(),
            });
          }
        }
      });
    }
  });

  return edges;
}

function deduplicateNodes(nodes: NodeEntity[]): NodeEntity[] {
  const map = new Map<string, NodeEntity>();
  nodes.forEach((n) => {
    map.set(n.id, n);
  });
  return Array.from(map.values());
}

function collectDescendantIds(nodes: NodeEntity[], id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentNodeId && ids.has(n.parentNodeId) && !ids.has(n.id)) {
        ids.add(n.id);
        grew = true;
      }
    }
  }
  return ids;
}

async function syncNodeToBackend(node: NodeEntity, method: 'POST' | 'PUT' | 'DELETE' = 'POST') {
  try {
    const url = method === 'DELETE' || method === 'PUT' ? `/api/nodes/${node.id}` : '/api/nodes';
    const res = await fetch(url, {
      method,
      headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(node),
    });
    if (!res.ok) {
      console.error(`Falha ao sincronizar nó (${method} ${url}):`, res.status, await res.text());
    }
  } catch (err) {
  }
}

// Undo/redo history. Kept outside the persisted zustand state on purpose: it only
// makes sense for the current session, and stashing full node snapshots in
// localStorage on every keystroke would be wasteful.
const MAX_HISTORY = 50;
const BATCH_WINDOW_MS = 1500;

let pastStack: NodeEntity[][] = [];
let futureStack: NodeEntity[][] = [];
let lastBatchKey: string | null = null;
let lastBatchAt = 0;

type SetState = (partial: Partial<NodeStore>) => void;
type GetState = () => NodeStore;

// Call at the start of a mutating action, before its own `set(...)`. Passing a
// `batchKey` coalesces rapid repeated calls (e.g. keystrokes updating the same
// node) into a single undo step instead of one step per keystroke.
function pushHistory(set: SetState, get: GetState, batchKey?: string) {
  const now = Date.now();
  if (batchKey && batchKey === lastBatchKey && now - lastBatchAt < BATCH_WINDOW_MS) {
    lastBatchAt = now;
    return;
  }
  pastStack.push(get().nodes);
  if (pastStack.length > MAX_HISTORY) pastStack.shift();
  futureStack = [];
  lastBatchKey = batchKey ?? null;
  lastBatchAt = now;
  set({ canUndo: true, canRedo: false });
}

function resetHistoryBatch() {
  lastBatchKey = null;
  lastBatchAt = 0;
}

// Reconciles the backend with an undo/redo jump between two node-array snapshots.
function syncNodesDiff(from: NodeEntity[], to: NodeEntity[]) {
  const fromMap = new Map(from.map((n) => [n.id, n]));
  const toMap = new Map(to.map((n) => [n.id, n]));

  fromMap.forEach((node, id) => {
    if (!toMap.has(id)) syncNodeToBackend(node, 'DELETE');
  });
  toMap.forEach((node, id) => {
    const prev = fromMap.get(id);
    if (!prev) {
      syncNodeToBackend(node, 'POST');
    } else if (prev !== node) {
      syncNodeToBackend(node, 'PUT');
    }
  });
}

export const useNodeStore = create<NodeStore>()(
  persist(
    (set, get) => ({
      nodes: DEFAULT_WELCOME_NODES,
      edges: generateEdges(DEFAULT_WELCOME_NODES),
      activeNodeId: 'doc-overview',
      activeView: 'doc',
      searchQuery: '',
      isSidebarOpen: true,
      isCommandPaletteOpen: false,
      isInitialized: false,
      activeTagFilter: null,
      archivedNodes: [],
      isTrashOpen: false,
      setTrashOpen: (open) => set({ isTrashOpen: open }),
      canUndo: false,
      canRedo: false,

      undo: () => {
        if (pastStack.length === 0) return;
        const prevNodes = pastStack.pop()!;
        resetHistoryBatch();
        set((state) => {
          futureStack.push(state.nodes);
          syncNodesDiff(state.nodes, prevNodes);
          return {
            nodes: prevNodes,
            edges: generateEdges(prevNodes),
            canUndo: pastStack.length > 0,
            canRedo: true,
          };
        });
      },

      redo: () => {
        if (futureStack.length === 0) return;
        const nextNodes = futureStack.pop()!;
        resetHistoryBatch();
        set((state) => {
          pastStack.push(state.nodes);
          syncNodesDiff(state.nodes, nextNodes);
          return {
            nodes: nextNodes,
            edges: generateEdges(nextNodes),
            canUndo: true,
            canRedo: futureStack.length > 0,
          };
        });
      },

      fetchArchivedNodes: async () => {
        try {
          const res = await fetch('/api/nodes/archived');
          if (res.ok) {
            const data = await res.json();
            if (data.nodes && Array.isArray(data.nodes)) {
              set({ archivedNodes: deduplicateNodes(data.nodes) });
            }
          }
        } catch (e) {}
      },

      fetchNodesFromBackend: async () => {
        get().fetchArchivedNodes();
        try {
          const res = await fetch('/api/nodes');
          if (res.ok) {
            const data = await res.json();
            if (data.nodes && Array.isArray(data.nodes)) {
              const unique = deduplicateNodes(data.nodes);
              set({
                nodes: unique,
                edges: generateEdges(unique),
                isInitialized: true,
                activeNodeId: get().activeNodeId && unique.some(n => n.id === get().activeNodeId)
                  ? get().activeNodeId
                  : unique[0]?.id || null,
              });
              return;
            }
          }
        } catch (e) {
        }
        set({ isInitialized: true });
      },

      setActiveNodeId: (id) => {
        const node = id ? get().getNodeById(id) : undefined;
        if (node) {
          const nextView = node.type === 'board' ? 'board' : node.type === 'database' ? 'database' : 'doc';
          set({ activeNodeId: id, activeView: nextView });
        } else {
          set({ activeNodeId: id });
        }
      },

      setActiveView: (view) => set({ activeView: view }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      setActiveTagFilter: (tag) => set({ activeTagFilter: tag }),

      createNode: (type, title, parentNodeId = null, navigate = true) => {
        const defaultTitle = title || (type === 'board' ? 'Novo Quadro' : type === 'card' ? 'Novo Card' : type === 'database' ? 'Novo Banco de Dados' : 'Nova Página');
        const defaultIcon = type === 'board' ? '📋' : type === 'card' ? '📌' : type === 'database' ? '🗄️' : '📄';

        const newNode: NodeEntity = {
          id: `node-${uuid()}`,
          workspaceId: 'default',
          parentNodeId,
          type,
          title: defaultTitle,
          icon: defaultIcon,
          isArchived: false,
          isFavorite: false,
          contentMarkdown: '',
          boardConfig: type === 'board' ? {
            columns: [
              { id: `col-${uuid()}`, title: 'A Fazer', color: '#6366f1', cardNodeIds: [] },
              { id: `col-${uuid()}`, title: 'Em Andamento', color: '#f59e0b', cardNodeIds: [] },
              { id: `col-${uuid()}`, title: 'Concluído', color: '#10b981', cardNodeIds: [] },
            ]
          } : undefined,
          databaseConfig: type === 'database' ? {
            columns: [
              { id: `dbcol-${uuid()}`, name: 'Status', type: 'select', options: [
                { id: `opt-${uuid()}`, label: 'A Fazer', color: '#6366f1' },
                { id: `opt-${uuid()}`, label: 'Concluído', color: '#10b981' },
              ] },
            ],
            rowNodeIds: [],
          } : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pushHistory(set, get);
        set((state) => {
          const nextNodes = deduplicateNodes([...state.nodes, newNode]);
          return {
            nodes: nextNodes,
            ...(navigate
              ? { activeNodeId: newNode.id, activeView: (type === 'board' ? 'board' : type === 'database' ? 'database' : 'doc') as ViewType }
              : {}),
            edges: generateEdges(nextNodes),
          };
        });

        syncNodeToBackend(newNode, 'POST');
        return newNode;
      },

      updateNode: (id, updates) => {
        pushHistory(set, get, `update:${id}`);
        set((state) => {
          let updatedNode: NodeEntity | null = null;
          const nextNodes = state.nodes.map((n) => {
            if (n.id === id) {
              updatedNode = { ...n, ...updates, updatedAt: new Date().toISOString() };
              return updatedNode;
            }
            return n;
          });

          if (updatedNode) {
            syncNodeToBackend(updatedNode, 'PUT');
          }

          return {
            nodes: nextNodes,
            edges: generateEdges(nextNodes),
          };
        });
      },

      archiveNode: async (id: string) => {
        try {
          await fetch(`/api/nodes/${id}/archive`, { method: 'POST' });
        } catch (e) {}

        pushHistory(set, get);
        set((state) => {
          const toRemove = collectDescendantIds(state.nodes, id);
          const nodesToArchive = state.nodes
            .filter((n) => toRemove.has(n.id))
            .map((n) => ({ ...n, isArchived: true }));
          const nextNodes = state.nodes.filter((n) => !toRemove.has(n.id));
          const nextArchived = deduplicateNodes([...state.archivedNodes, ...nodesToArchive]);

          const cleanedNodes = nextNodes.map((n) => {
            if (n.type === 'board' && n.boardConfig) {
              const hasRemovedCard = n.boardConfig.columns.some((col) =>
                col.cardNodeIds.some((cid) => toRemove.has(cid))
              );
              if (!hasRemovedCard) return n;

              const columns = n.boardConfig.columns.map((col) => ({
                ...col,
                cardNodeIds: col.cardNodeIds.filter((cid) => !toRemove.has(cid)),
              }));
              const updatedBoard = { ...n, boardConfig: { ...n.boardConfig, columns } };
              syncNodeToBackend(updatedBoard, 'PUT');
              return updatedBoard;
            }
            if (n.type === 'database' && n.databaseConfig) {
              const hasRemovedRow = n.databaseConfig.rowNodeIds.some((rid) => toRemove.has(rid));
              if (!hasRemovedRow) return n;

              const updatedDatabase = {
                ...n,
                databaseConfig: {
                  ...n.databaseConfig,
                  rowNodeIds: n.databaseConfig.rowNodeIds.filter((rid) => !toRemove.has(rid)),
                },
              };
              syncNodeToBackend(updatedDatabase, 'PUT');
              return updatedDatabase;
            }
            return n;
          });

          const unique = deduplicateNodes(cleanedNodes);
          const wasActiveDeleted = !!state.activeNodeId && toRemove.has(state.activeNodeId);

          return {
            nodes: unique,
            archivedNodes: nextArchived,
            activeNodeId: wasActiveDeleted ? null : state.activeNodeId,
            activeView: wasActiveDeleted ? 'home' : state.activeView,
            edges: generateEdges(unique),
          };
        });
      },

      deleteNode: (id) => {
        get().archiveNode(id);
      },

      restoreNode: async (id: string) => {
        try {
          await fetch(`/api/nodes/${id}/restore`, { method: 'POST' });
        } catch (e) {}

        const toRestore = collectDescendantIds(get().archivedNodes, id);
        const restoredNodes = get().archivedNodes
          .filter((n) => toRestore.has(n.id))
          .map((n) => ({ ...n, isArchived: false }));

        pushHistory(set, get);
        set((state) => {
          const nextArchived = state.archivedNodes.filter((n) => !toRestore.has(n.id));
          const nextNodes = deduplicateNodes([...state.nodes, ...restoredNodes]);

          return {
            nodes: nextNodes,
            archivedNodes: nextArchived,
            edges: generateEdges(nextNodes),
          };
        });
      },

      permanentlyDeleteNode: async (id: string) => {
        try {
          await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
        } catch (e) {}

        set((state) => {
          const toRemove = collectDescendantIds(state.archivedNodes, id);
          return {
            archivedNodes: state.archivedNodes.filter((n) => !toRemove.has(n.id)),
          };
        });
      },

      emptyTrash: async () => {
        try {
          await fetch('/api/nodes/empty-trash', { method: 'POST' });
        } catch (e) {}

        set({ archivedNodes: [] });
      },

      toggleFavorite: (id) => {
        pushHistory(set, get);
        set((state) => {
          const node = state.nodes.find(n => n.id === id);
          if (node) {
            const updated = { ...node, isFavorite: !node.isFavorite };
            syncNodeToBackend(updated, 'PUT');
          }
          return {
            nodes: state.nodes.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n)),
          };
        });
      },

      moveCard: (cardId, sourceColId, destColId, newIndex) => {
        pushHistory(set, get);
        set((state) => {
          const currentBoard = state.nodes.find(
            (n) => n.type === 'board' && n.boardConfig?.columns.some((c) => c.id === sourceColId)
          );
          if (!currentBoard || !currentBoard.boardConfig) return state;

          const columns = currentBoard.boardConfig.columns.map((col) => {
            if (col.id === sourceColId && sourceColId === destColId) {
              const nextCards = [...col.cardNodeIds.filter((id) => id !== cardId)];
              nextCards.splice(newIndex, 0, cardId);
              return { ...col, cardNodeIds: nextCards };
            } else if (col.id === sourceColId) {
              return { ...col, cardNodeIds: col.cardNodeIds.filter((id) => id !== cardId) };
            } else if (col.id === destColId) {
              const nextCards = [...col.cardNodeIds.filter((id) => id !== cardId)];
              nextCards.splice(newIndex, 0, cardId);
              return { ...col, cardNodeIds: nextCards };
            }
            return col;
          });

          const updatedBoard: NodeEntity = {
            ...currentBoard,
            boardConfig: { ...currentBoard.boardConfig, columns },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedBoard, 'PUT');

          return {
            nodes: state.nodes.map((n) => (n.id === currentBoard.id ? updatedBoard : n)),
          };
        });
      },

      addCardToColumn: (boardId, columnId, cardTitle) => {
        const card = get().createNode('card', cardTitle, boardId, false);
        set((state) => {
          const board = state.nodes.find((n) => n.id === boardId);
          if (!board || !board.boardConfig) return state;

          const columns = board.boardConfig.columns.map((col) => {
            if (col.id === columnId) {
              const existingIds = col.cardNodeIds.filter(id => id !== card.id);
              return { ...col, cardNodeIds: [...existingIds, card.id] };
            }
            return col;
          });

          const updatedBoard: NodeEntity = {
            ...board,
            boardConfig: { ...board.boardConfig!, columns },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedBoard, 'PUT');

          return {
            nodes: state.nodes.map((n) => (n.id === boardId ? updatedBoard : n)),
          };
        });
      },

      addColumnToBoard: (boardId, columnTitle) => {
        pushHistory(set, get);
        set((state) => {
          const board = state.nodes.find((n) => n.id === boardId);
          if (!board || !board.boardConfig) return state;

          const newColumn: KanbanColumn = {
            id: `col-${uuid()}`,
            title: columnTitle,
            color: '#6366f1',
            cardNodeIds: [],
          };

          const updatedBoard: NodeEntity = {
            ...board,
            boardConfig: {
              ...board.boardConfig!,
              columns: [...board.boardConfig!.columns, newColumn],
            },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedBoard, 'PUT');

          return {
            nodes: state.nodes.map((n) => (n.id === boardId ? updatedBoard : n)),
          };
        });
      },

      deleteColumn: (boardId, columnId) => {
        const board = get().nodes.find((n) => n.id === boardId);
        if (!board || !board.boardConfig) return;
        const column = board.boardConfig.columns.find((c) => c.id === columnId);
        if (!column) return;

        column.cardNodeIds.forEach((cardId) => get().deleteNode(cardId));

        pushHistory(set, get);
        set((state) => {
          const b = state.nodes.find((n) => n.id === boardId);
          if (!b || !b.boardConfig) return state;

          const updatedBoard: NodeEntity = {
            ...b,
            boardConfig: {
              ...b.boardConfig,
              columns: b.boardConfig.columns.filter((c) => c.id !== columnId),
            },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedBoard, 'PUT');

          return {
            nodes: state.nodes.map((n) => (n.id === boardId ? updatedBoard : n)),
          };
        });
      },

      addDatabaseColumn: (databaseId, name, type) => {
        pushHistory(set, get);
        set((state) => {
          const db = state.nodes.find((n) => n.id === databaseId);
          if (!db || !db.databaseConfig) return state;

          const newColumn: DatabaseColumn = {
            id: `dbcol-${uuid()}`,
            name,
            type,
            options: type === 'select' ? [] : undefined,
          };

          const updatedDb: NodeEntity = {
            ...db,
            databaseConfig: { ...db.databaseConfig, columns: [...db.databaseConfig.columns, newColumn] },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedDb, 'PUT');
          return { nodes: state.nodes.map((n) => (n.id === databaseId ? updatedDb : n)) };
        });
      },

      updateDatabaseColumn: (databaseId, columnId, updates) => {
        pushHistory(set, get, `update-dbcol:${databaseId}:${columnId}`);
        set((state) => {
          const db = state.nodes.find((n) => n.id === databaseId);
          if (!db || !db.databaseConfig) return state;

          const updatedDb: NodeEntity = {
            ...db,
            databaseConfig: {
              ...db.databaseConfig,
              columns: db.databaseConfig.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c)),
            },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedDb, 'PUT');
          return { nodes: state.nodes.map((n) => (n.id === databaseId ? updatedDb : n)) };
        });
      },

      deleteDatabaseColumn: (databaseId, columnId) => {
        pushHistory(set, get);
        set((state) => {
          const db = state.nodes.find((n) => n.id === databaseId);
          if (!db || !db.databaseConfig) return state;

          const updatedDb: NodeEntity = {
            ...db,
            databaseConfig: {
              ...db.databaseConfig,
              columns: db.databaseConfig.columns.filter((c) => c.id !== columnId),
            },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedDb, 'PUT');
          return { nodes: state.nodes.map((n) => (n.id === databaseId ? updatedDb : n)) };
        });
      },

      addDatabaseRow: (databaseId, title) => {
        const row = get().createNode('card', title || 'Novo Registro', databaseId, false);
        set((state) => {
          const db = state.nodes.find((n) => n.id === databaseId);
          if (!db || !db.databaseConfig) return state;

          const updatedDb: NodeEntity = {
            ...db,
            databaseConfig: { ...db.databaseConfig, rowNodeIds: [...db.databaseConfig.rowNodeIds, row.id] },
            updatedAt: new Date().toISOString(),
          };

          syncNodeToBackend(updatedDb, 'PUT');
          return { nodes: state.nodes.map((n) => (n.id === databaseId ? updatedDb : n)) };
        });
        return row;
      },

      updateRowValue: (databaseId, rowId, columnId, value) => {
        const row = get().nodes.find((n) => n.id === rowId);
        if (!row) return;
        get().updateNode(rowId, { properties: { ...row.properties, [columnId]: value } });
      },

      deleteDatabaseRow: (databaseId, rowId) => {
        get().deleteNode(rowId);
      },

      addTag: (nodeId, tag) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const existing = node.tags || [];
        if (existing.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
        get().updateNode(nodeId, { tags: [...existing, trimmed] });
      },

      removeTag: (nodeId, tag) => {
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node || !node.tags) return;
        get().updateNode(nodeId, { tags: node.tags.filter((t) => t !== tag) });
      },

      getAllTags: () => {
        const counts = new Map<string, number>();
        get().nodes.forEach((n) => {
          if (n.isArchived) return;
          (n.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
        });
        return Array.from(counts.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
      },

      saveAsTemplate: (nodeId) => {
        const source = get().nodes.find((n) => n.id === nodeId);
        if (!source) throw new Error('Nó não encontrado');

        const template: NodeEntity = {
          id: `node-${uuid()}`,
          workspaceId: 'default',
          parentNodeId: null,
          type: source.type,
          title: `Modelo: ${source.title}`,
          icon: source.icon,
          isArchived: false,
          isFavorite: false,
          isTemplate: true,
          contentMarkdown: source.contentMarkdown || '',
          boardConfig: source.boardConfig ? {
            columns: source.boardConfig.columns.map((c) => ({ ...c, cardNodeIds: [] })),
          } : undefined,
          databaseConfig: source.databaseConfig ? {
            columns: source.databaseConfig.columns.map((c) => ({ ...c })),
            rowNodeIds: [],
          } : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pushHistory(set, get);
        set((state) => {
          const nextNodes = deduplicateNodes([...state.nodes, template]);
          return { nodes: nextNodes, edges: generateEdges(nextNodes) };
        });

        syncNodeToBackend(template, 'POST');
        return template;
      },

      createFromTemplate: (templateId, navigate = true) => {
        const template = get().nodes.find((n) => n.id === templateId);
        if (!template) throw new Error('Modelo não encontrado');

        const newNode: NodeEntity = {
          id: `node-${uuid()}`,
          workspaceId: 'default',
          parentNodeId: null,
          type: template.type,
          title: template.title.replace(/^Modelo:\s*/, ''),
          icon: template.icon,
          isArchived: false,
          isFavorite: false,
          isTemplate: false,
          contentMarkdown: template.contentMarkdown || '',
          boardConfig: template.boardConfig ? {
            columns: template.boardConfig.columns.map((c) => ({ ...c, id: `col-${uuid()}`, cardNodeIds: [] })),
          } : undefined,
          databaseConfig: template.databaseConfig ? {
            columns: template.databaseConfig.columns.map((c) => ({ ...c, id: `dbcol-${uuid()}` })),
            rowNodeIds: [],
          } : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pushHistory(set, get);
        set((state) => {
          const nextNodes = deduplicateNodes([...state.nodes, newNode]);
          return {
            nodes: nextNodes,
            ...(navigate
              ? { activeNodeId: newNode.id, activeView: (newNode.type === 'board' ? 'board' : newNode.type === 'database' ? 'database' : 'doc') as ViewType }
              : {}),
            edges: generateEdges(nextNodes),
          };
        });

        syncNodeToBackend(newNode, 'POST');
        return newNode;
      },

      recalculateEdges: () => {
        set((state) => ({ edges: generateEdges(state.nodes) }));
      },

      getNodeById: (id) => get().nodes.find((n) => n.id === id),
      getNodeByTitle: (title) => get().nodes.find((n) => n.title.toLowerCase().trim() === title.toLowerCase().trim()),

      getBacklinksForNode: (nodeId) => {
        const edges = get().edges;
        const nodes = get().nodes;
        const incomingEdges = edges.filter((e) => e.targetNodeId === nodeId);
        const outgoingEdges = edges.filter((e) => e.sourceNodeId === nodeId);

        const sourceNodes = incomingEdges
          .map((e) => nodes.find((n) => n.id === e.sourceNodeId))
          .filter((n): n is NodeEntity => Boolean(n));

        const targetNodes = outgoingEdges
          .map((e) => nodes.find((n) => n.id === e.targetNodeId))
          .filter((n): n is NodeEntity => Boolean(n));

        return { sourceNodes, targetNodes };
      },
    }),
    {
      name: 'nodex-workspace-data-v2',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.nodes) {
          state.nodes = deduplicateNodes(state.nodes);
          state.edges = generateEdges(state.nodes);
        }
        // The undo/redo stacks live outside persisted state and are empty on load.
        if (state) {
          state.canUndo = false;
          state.canRedo = false;
        }
      },
    }
  )
);
