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
  const { activeNodeId, activeView, nodes, fetchNodesFromBackend } = useNodeStore();
  const activeNode = nodes.find((n) => n.id === activeNodeId);

  useEffect(() => {
    fetchNodesFromBackend();
  }, []);

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
