import React from 'react';
import { Node, mergeAttributes } from '@tiptap/react';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  FileSpreadsheet, 
  Film, 
  Archive, 
  Paperclip, 
  Download, 
  ExternalLink, 
  Trash2 
} from 'lucide-react';

export const FileAttachmentNode = Node.create({
  name: 'fileAttachment',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      fileName: {
        default: 'Arquivo anexado',
      },
      fileSize: {
        default: '0 KB',
      },
      fileType: {
        default: 'application/octet-stream',
      },
      fileUrl: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'file-attachment' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentComponent);
  },
});

function getFileIcon(fileName: string, fileType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-indigo-400" />;
  }
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
  }
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'rs'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-amber-400" />;
  }
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return <Film className="w-5 h-5 text-rose-400" />;
  }
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
    return <Archive className="w-5 h-5 text-violet-400" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText className="w-5 h-5 text-sky-400" />;
  }
  return <Paperclip className="w-5 h-5 text-neutral-400" />;
}

export const FileAttachmentComponent: React.FC<any> = ({ node, deleteNode }) => {
  const { fileName, fileSize, fileType, fileUrl } = node.attrs;
  const isImage = fileType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(fileName);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  return (
    <NodeViewWrapper className="my-3 select-none">
      <div className="group relative flex items-center justify-between p-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 transition-all shadow-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={handleOpen}>
          <div className="w-10 h-10 rounded-lg bg-neutral-950 flex items-center justify-center border border-neutral-800 shrink-0">
            {getFileIcon(fileName, fileType)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors truncate">
              {fileName}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span>{fileSize}</span>
              <span>•</span>
              <span className="uppercase text-[10px] bg-neutral-800/80 px-1.5 py-0.2 rounded border border-neutral-700/50">
                {fileName.split('.').pop() || 'ARQUIVO'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {fileUrl && (
            <button
              onClick={handleOpen}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {fileUrl && (
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
              title="Baixar arquivo"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteNode();
            }}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-neutral-500 hover:text-rose-400 transition-colors"
            title="Remover anexo"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isImage && fileUrl && (
        <div className="mt-2 rounded-xl overflow-hidden border border-neutral-800/60 max-h-80 bg-neutral-950 flex items-center justify-center">
          <img 
            src={fileUrl} 
            alt={fileName} 
            className="max-h-80 object-contain rounded-lg" 
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};
