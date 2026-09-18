import React, { useEffect } from 'react';
import { useNodeStore } from './stores/useNodeStore';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { BlockEditor } from './editor/BlockEditor';
import { KanbanBoard } from './kanban/KanbanBoard';
import { GraphView } from './graph/GraphView';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { CalendarView } from './calendar/CalendarView';
import { TimeTrackingView } from './timetracking/TimeTrackingView';
import { HomePage } from './home/HomePage';
import { DatabaseView } from './database/DatabaseView';
import { TagsView } from './tags/TagsView';

export function App() {
  const { activeNodeId, activeView, nodes, fetchNodesFromBackend, undo, redo } = useNodeStore();
  const activeNode = nodes.find((n) => n.id === activeNodeId);

  useEffect(() => {
    fetchNodesFromBackend();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Let native input undo and the block editor's own history (tiptap) handle
      // Ctrl+Z while typing there; this shortcut is for app-level actions like
      // deleting a node, moving a card, or removing a tag.
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isEditable) return;

      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;

      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex h-screen w-screen bg-neutral-950 text-neutral-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-y-auto relative bg-[#0a0a0c]">
          {activeView === 'home' ? (
            <HomePage />
          ) : activeView === 'graph' ? (
            <GraphView />
          ) : activeView === 'calendar' ? (
            <CalendarView />
          ) : activeView === 'timesheet' ? (
            <TimeTrackingView />
          ) : activeView === 'tags' ? (
            <TagsView />
          ) : activeView === 'board' && activeNode ? (
            activeNode.type === 'board' ? (
              <KanbanBoard boardId={activeNode.id} />
            ) : (
              <KanbanBoard boardId={activeNode.parentNodeId || 'board-sprint'} />
            )
          ) : activeView === 'database' && activeNode ? (
            activeNode.type === 'database' ? (
              <DatabaseView databaseId={activeNode.id} />
            ) : (
              <DatabaseView databaseId={activeNode.parentNodeId || activeNode.id} />
            )
          ) : activeNode ? (
            <BlockEditor nodeId={activeNode.id} />
          ) : (
            <HomePage />
          )}
        </main>
      </div>

      <CommandPalette />
      <SettingsModal />
    </div>
  );
}

export default App;
