import React, { useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNodeStore } from '../stores/useNodeStore';
import { buildGraphData } from '@nodex/shared';
import { ZoomIn, ZoomOut, Maximize2, Filter, Layers, Info } from 'lucide-react';

export const GraphView: React.FC = () => {
  const { nodes, edges, setActiveNodeId, setActiveView } = useNodeStore();
  const fgRef = useRef<any>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [highlightNodes, setHighlightNodes] = useState(new Set<string>());
  const [highlightLinks, setHighlightLinks] = useState(new Set<any>());
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  const graphData = useMemo(() => {
    const rawData = buildGraphData(nodes, edges);
    if (filterType === 'all') return rawData;
    return {
      nodes: rawData.nodes.filter((n) => n.type === filterType),
      links: rawData.links.filter((l) => {
        const src = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tgt = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return (
          rawData.nodes.some((n) => n.id === src && (filterType === 'all' || n.type === filterType)) &&
          rawData.nodes.some((n) => n.id === tgt && (filterType === 'all' || n.type === filterType))
        );
      }),
    };
  }, [nodes, edges, filterType]);

  const handleNodeClick = (node: any) => {
    setActiveNodeId(node.id);
    setActiveView(node.type === 'board' ? 'board' : 'doc');
  };

  const handleNodeHover = (node: any) => {
    const nextHighlightNodes = new Set<string>();
    const nextHighlightLinks = new Set<any>();

    if (node) {
      nextHighlightNodes.add(node.id);
      graphData.links.forEach((link: any) => {
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        if (srcId === node.id || tgtId === node.id) {
          nextHighlightLinks.add(link);
          nextHighlightNodes.add(srcId);
          nextHighlightNodes.add(tgtId);
        }
      });
    }

    setHoverNode(node ? node.id : null);
    setHighlightNodes(nextHighlightNodes);
    setHighlightLinks(nextHighlightLinks);
  };

  return (
    <div className="relative w-full h-full bg-neutral-950 flex flex-col overflow-hidden select-none">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md p-1.5 rounded-xl border border-neutral-800 shadow-lg">
        <span className="text-xs font-semibold text-neutral-300 px-2 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Filtro:
        </span>
        <button
          onClick={() => setFilterType('all')}
          className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
            filterType === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Todos ({nodes.length})
        </button>
        <button
          onClick={() => setFilterType('document')}
          className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
            filterType === 'document' ? 'bg-indigo-600 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Documentos
        </button>
        <button
          onClick={() => setFilterType('board')}
          className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
            filterType === 'board' ? 'bg-indigo-600 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Quadros
        </button>
        <button
          onClick={() => setFilterType('card')}
          className={`px-2.5 py-1 text-[11px] rounded-lg transition-all ${
            filterType === 'card' ? 'bg-indigo-600 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Cards
        </button>
      </div>

      <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-1.5 bg-neutral-900/80 backdrop-blur-md p-1 rounded-xl border border-neutral-800 shadow-lg">
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.3, 400)}
          className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Aumentar zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.3, 400)}
          className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Diminuir zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => fgRef.current?.zoomToFit(400, 50)}
          className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Ajustar à tela"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-6 left-6 z-10 bg-neutral-900/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-800 text-[11px] flex items-center gap-4 text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span>
          <span>Documento</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
          <span>Quadro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
          <span>Card</span>
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(node: any) => `${node.title} (${node.type})`}
        nodeColor={(node: any) => {
          if (hoverNode && !highlightNodes.has(node.id)) return 'rgba(100, 100, 100, 0.2)';
          if (node.type === 'board') return '#10b981';
          if (node.type === 'card') return '#f59e0b';
          return '#6366f1';
        }}
        nodeRelSize={6}
        linkColor={(link: any) => {
          if (hoverNode && !highlightLinks.has(link)) return 'rgba(80, 80, 80, 0.1)';
          return 'rgba(99, 102, 241, 0.4)';
        }}
        linkWidth={(link: any) => (highlightLinks.has(link) ? 2.5 : 1.2)}
        linkDirectionalParticles={(link: any) => (highlightLinks.has(link) ? 4 : 2)}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleWidth={2}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        backgroundColor="#0a0a0c"
        cooldownTicks={100}
      />
    </div>
  );
};
