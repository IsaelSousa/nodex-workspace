import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { WikiLinkExtension } from './extensions/WikiLinkExtension';
import { FileAttachmentNode } from './extensions/FileAttachmentNode';
import { useNodeStore } from '../stores/useNodeStore';
import { BacklinksPanel } from '../components/BacklinksPanel';
import { EmojiPicker } from '../components/EmojiPicker';
import { exportNodeToPdf } from '../lib/exportPdf';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Paperclip,
  Image as ImageIcon,
  Upload,
  FilePlus2,
  FileDown
} from 'lucide-react';

interface BlockEditorProps {
  nodeId: string;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ nodeId }) => {
  const { 
    nodes, 
    updateNode, 
    setActiveNodeId, 
    setActiveView, 
    getNodeByTitle,
    createNode 
  } = useNodeStore();
  const node = nodes.find((n) => n.id === nodeId);

  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastLoadedNodeId = useRef<string | null>(null);

  const handleExportPdf = async () => {
    if (!node || isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportNodeToPdf(node);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleWikiLinkClick = (linkTitle: string) => {
    let targetNode = getNodeByTitle(linkTitle);
    if (!targetNode) {
      targetNode = createNode('document', linkTitle);
    }
    setActiveNodeId(targetNode.id);
    setActiveView(targetNode.type === 'board' ? 'board' : 'doc');
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Pressione "/" para comandos, [[link]] para conectar ou arraste arquivos aqui...',
      }),
      WikiLinkExtension.configure({
        onWikiLinkClick: handleWikiLinkClick,
      }),
      FileAttachmentNode,
    ],
    content: node?.contentMarkdown || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      updateNode(nodeId, { contentMarkdown: html });
    },
  });

  useEffect(() => {
    if (editor && node) {
      if (lastLoadedNodeId.current !== nodeId) {
        lastLoadedNodeId.current = nodeId;
        editor.commands.setContent(node.contentMarkdown || '', false);
      }
    }
  }, [nodeId, editor, node?.contentMarkdown]);

  useEffect(() => {
    if (!editor) return;

    const handleKeyUp = () => {
      const { selection } = editor.state;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, selection.from - 1),
        selection.from,
        '\n'
      );

      if (textBefore === '/') {
        const coords = editor.view.coordsAtPos(selection.from);
        if (editorRef.current) {
          const rect = editorRef.current.getBoundingClientRect();
          setSlashMenuPos({
            top: coords.bottom - rect.top + 8,
            left: coords.left - rect.left,
          });
        }
        setSlashMenuOpen(true);
      } else if (!textBefore.startsWith('/')) {
        setSlashMenuOpen(false);
      }
    };

    editor.on('transaction', handleKeyUp);
    return () => {
      editor.off('transaction', handleKeyUp);
    };
  }, [editor]);

  const insertCommand = (action: () => void) => {
    if (!editor) return;
    const { selection } = editor.state;
    editor.commands.deleteRange({ from: selection.from - 1, to: selection.from });
    action();
    setSlashMenuOpen(false);
    editor.commands.focus();
  };

  const handleFileUpload = (file: File) => {
    if (!editor) return;

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'fileAttachment',
            attrs: {
              fileName: file.name,
              fileSize: formatSize(file.size),
              fileType: file.type || 'application/octet-stream',
              fileUrl: dataUrl,
            },
          },
          { type: 'paragraph' },
        ])
        .run();
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(handleFileUpload);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      e.preventDefault();
      Array.from(files).forEach(handleFileUpload);
    }
  };

  if (!node) return null;

  return (
    <div 
      ref={editorRef} 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative max-w-4xl mx-auto px-6 py-10 min-h-screen text-neutral-100"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <EmojiPicker value={node.icon || '📄'} onChange={(emoji) => updateNode(nodeId, { icon: emoji })} />

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs font-medium text-neutral-300 hover:text-white disabled:opacity-50 transition-all shadow-sm"
              title="Exportar esta nota como PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-400" />
              <span>{isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-lg text-xs font-medium text-neutral-300 hover:text-white transition-all shadow-sm"
            >
              <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
              <span>Vincular Arquivo</span>
            </button>
          </div>
        </div>

        <input
          type="text"
          value={node.title}
          onChange={(e) => updateNode(nodeId, { title: e.target.value })}
          placeholder="Título da página..."
          className="w-full text-3xl md:text-4xl font-bold bg-transparent text-neutral-100 placeholder-neutral-600 focus:outline-none tracking-tight"
        />

        <div className="text-[11px] text-neutral-500 flex items-center gap-2 flex-wrap">
          <span>💡 Digite <code className="text-indigo-400 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">[[Nome da Nota]]</code> para conectar, <code className="text-indigo-400 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">/arquivo</code> para anexar, ou arraste arquivos diretamente para cá.</span>
        </div>
      </div>

      {slashMenuOpen && (
        <div
          style={{ top: `${slashMenuPos.top}px`, left: `${slashMenuPos.left}px` }}
          className="absolute z-30 w-72 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl p-1.5 space-y-1 backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            Comandos Rápidos & Mídias
          </div>

          <button
            onClick={() => insertCommand(() => {
              const subPage = createNode('document', undefined, nodeId, true);
              setActiveNodeId(subPage.id);
              setActiveView('doc');
            })}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <FilePlus2 className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-medium">Sub-página</div>
              <div className="text-[10px] text-neutral-500">Criar uma nota aninhada dentro desta</div>
            </div>
          </button>

          <div className="border-t border-neutral-800 my-1" />

          <button
            onClick={() => insertCommand(() => fileInputRef.current?.click())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Paperclip className="w-4 h-4 text-indigo-400" />
            <div>
              <div className="font-medium">Anexar Arquivo (PDF, Planilha, Zip...)</div>
              <div className="text-[10px] text-neutral-500">Vincular arquivo para download ou leitura</div>
            </div>
          </button>

          <button
            onClick={() => insertCommand(() => fileInputRef.current?.click())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-medium">Imagem</div>
              <div className="text-[10px] text-neutral-500">Incorporar imagem na página</div>
            </div>
          </button>

          <div className="border-t border-neutral-800 my-1" />

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleHeading({ level: 1 }).run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Heading1 className="w-4 h-4 text-indigo-400" />
            <span>Título 1 (H1)</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Heading2 className="w-4 h-4 text-indigo-400" />
            <span>Título 2 (H2)</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Heading3 className="w-4 h-4 text-indigo-400" />
            <span>Título 3 (H3)</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleTaskList().run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Lista de Tarefas (Checklist)</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleBulletList().run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <List className="w-4 h-4 text-amber-400" />
            <span>Lista com Marcadores</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleCodeBlock().run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Code className="w-4 h-4 text-sky-400" />
            <span>Bloco de Código</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().toggleBlockquote().run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Quote className="w-4 h-4 text-violet-400" />
            <span>Citação (Quote)</span>
          </button>

          <button
            onClick={() => insertCommand(() => editor?.chain().focus().setHorizontalRule().run())}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800 text-xs text-neutral-200 text-left transition-colors"
          >
            <Minus className="w-4 h-4 text-neutral-400" />
            <span>Divisor Horizontal</span>
          </button>
        </div>
      )}

      <div className="min-h-[350px]">
        <EditorContent editor={editor} className="text-neutral-200 leading-relaxed text-sm md:text-base cursor-text" />
      </div>

      <BacklinksPanel nodeId={nodeId} />
    </div>
  );
};
