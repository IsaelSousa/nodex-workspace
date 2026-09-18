import React, { useState } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { useNodeStore } from '../stores/useNodeStore';

interface TagEditorProps {
  nodeId: string;
  tags?: string[];
}

export const TagEditor: React.FC<TagEditorProps> = ({ nodeId, tags = [] }) => {
  const { addTag, removeTag, setActiveView, setActiveTagFilter } = useNodeStore();
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (value.trim()) {
      addTag(nodeId, value.trim());
      setValue('');
    }
    setIsAdding(false);
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Tag className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="group flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700/40 text-[11px] cursor-pointer hover:border-indigo-500/40 hover:text-indigo-300 transition-colors"
          onClick={() => {
            setActiveTagFilter(tag);
            setActiveView('tags');
          }}
          title={`Ver todos os itens com a tag "${tag}"`}
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTag(nodeId, tag);
            }}
            className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
            title="Remover tag"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}

      {isAdding ? (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
            if (e.key === 'Escape') {
              setValue('');
              setIsAdding(false);
            }
          }}
          onBlur={handleAdd}
          placeholder="nova tag..."
          className="w-24 bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-700 text-[11px] text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50"
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-neutral-700 text-[11px] text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors"
        >
          <Plus className="w-2.5 h-2.5" />
          <span>tag</span>
        </button>
      )}
    </div>
  );
};
