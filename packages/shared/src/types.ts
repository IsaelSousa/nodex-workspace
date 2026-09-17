export type NodeType = 'document' | 'board' | 'card' | 'database';

export type BlockType =
  | 'paragraph'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'bullet_list'
  | 'ordered_list'
  | 'task_item'
  | 'code'
  | 'blockquote'
  | 'callout'
  | 'divider'
  | 'database_view';

export type EdgeType = 'wikilink' | 'board_card' | 'parent_child' | 'relation';

export type PropertyType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'status'
  | 'date'
  | 'checkbox'
  | 'user'
  | 'relation';

export interface PropertyOption {
  id: string;
  label: string;
  color: string;
}

export interface PropertyDefinition {
  id: string;
  workspaceId: string;
  name: string;
  type: PropertyType;
  options?: PropertyOption[];
}

export interface PropertyValue {
  id: string;
  nodeId: string;
  propertyDefId: string;
  value: any;
}

export interface Block {
  id: string;
  nodeId: string;
  parentBlockId?: string | null;
  type: BlockType;
  content: Record<string, any>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  label?: string;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  cardNodeIds: string[];
}

export interface BoardConfig {
  columns: KanbanColumn[];
  groupByPropertyId?: string;
}

export interface NodeEntity {
  id: string;
  workspaceId: string;
  parentNodeId?: string | null;
  type: NodeType;
  title: string;
  icon?: string;
  coverUrl?: string;
  isArchived: boolean;
  isFavorite: boolean;
  contentMarkdown?: string;
  blocks?: Block[];
  properties?: Record<string, any>;
  boardConfig?: BoardConfig;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  reminderMinutesBefore?: number;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramSettings {
  botTokenConfigured: boolean;
  chatIdConfigured: boolean;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  workspaceId: string;
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  durationMinutes: number;
  tags?: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface GraphNode {
  id: string;
  title: string;
  type: NodeType;
  group?: string;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: EdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
