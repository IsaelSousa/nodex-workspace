import React, { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { NodeIcon, isImageIconValue } from './NodeIcon';

interface EmojiGroup {
  label: string;
  emojis: string[];
}

const EMOJI_GROUPS: EmojiGroup[] = [
  {
    label: 'Sorrisos & Pessoas',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
      '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
      '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '🙁', '😢',
      '😭', '😤', '😠', '😡', '🤬', '😱', '😨', '😰', '😥', '🥺', '🤝', '👍', '👎', '👏', '🙌', '🙏',
      '💪', '🧠', '👀', '🗣️', '👤',
    ],
  },
  {
    label: 'Natureza & Animais',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
      '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
      '🐢', '🐍', '🦎', '🐙', '🦀', '🐠', '🐬', '🐳', '🌵', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀',
      '🌸', '🌼', '🌻', '🌞', '🌝', '🌙', '⭐', '🌟', '🔥', '💧', '🌈', '☀️', '⛅', '☁️', '⛄', '❄️',
    ],
  },
  {
    label: 'Comida & Bebida',
    emojis: [
      '🍏', '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝',
      '🍅', '🍆', '🥑', '🥦', '🥬', '🌽', '🥕', '🧄', '🧅', '🥐', '🍞', '🥖', '🧀', '🍗', '🍖', '🥩',
      '🍔', '🍟', '🍕', '🌭', '🌮', '🌯', '🥗', '🍜', '🍝', '🍣', '🍱', '🍩', '🍪', '🎂', '🍰', '🧁',
      '🍫', '🍬', '🍭', '🍦', '☕', '🍵', '🧃', '🥤', '🍺', '🍷', '🥂', '🍾',
    ],
  },
  {
    label: 'Atividades',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '⛳', '🏹', '🎣', '🥊', '🥋',
      '🎽', '🛹', '🛼', '🎿', '🏆', '🥇', '🥈', '🥉', '🎮', '🎲', '🧩', '🎯', '🎳', '🎨', '🎭', '🎤',
      '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎬', '📸',
    ],
  },
  {
    label: 'Viagem & Lugares',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚓', '🚑', '🚒', '🚲', '🛴', '🛵', '✈️', '🚀', '🛸', '🚢', '⛵', '🏝️',
      '🏔️', '🗻', '🏕️', '🏠', '🏢', '🏫', '🏰', '🗽', '🗼', '🌉', '🌇', '🌆', '🌃', '🌌', '🎡', '🎢',
      '🎠', '🧳', '🗺️', '🧭',
    ],
  },
  {
    label: 'Objetos',
    emojis: [
      '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📷', '📹', '🎥', '📞', '☎️', '📺', '📻',
      '🔋', '🔌', '💡', '🔦', '🕯️', '📔', '📕', '📗', '📘', '📙', '📓', '📒', '📃', '📜', '📄', '📰',
      '📑', '🔖', '🏷️', '💰', '💳', '✉️', '📦', '📫', '✏️', '🖋️', '🖌️', '📝', '💼', '📁', '📂', '🗂️',
      '📅', '📆', '🔒', '🔑', '🔨', '🛠️', '⚙️', '🧰', '🔭', '🔬', '💊', '🩹', '🚪', '🛏️', '🚽', '🧭',
    ],
  },
  {
    label: 'Símbolos',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💯', '✅', '❌', '⚠️', '❗', '❓', '💬',
      '💭', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚪', '⚫', '🔺', '🔻', '⭐', '✨', '🎯', '🚩', '🏁',
      '🔔', '🔕', '♻️', '🔁', '🔀',
    ],
  },
];

const DEFAULT_ICONS = ['📄', '📋', '📌', '🚀', '✨', '📝', '💡', '🎯'];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  triggerClassName?: string;
  title?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ value, onChange, triggerClassName, title }) => {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setImageUrlInput(isImageIconValue(value) ? value : '');
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const pick = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const applyImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    pick(url);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={title || 'Mudar ícone'}
        className={
          triggerClassName ||
          'w-10 h-10 text-2xl text-center bg-transparent hover:bg-neutral-800/60 rounded-lg cursor-pointer border border-transparent hover:border-neutral-700 transition-colors focus:outline-none'
        }
      >
        <NodeIcon value={value} fallback="📄" size={28} className="text-2xl mx-auto" />
      </button>

      {open && (
        <div className="absolute z-40 top-full left-0 mt-1 w-80 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
          <div className="p-2 border-b border-neutral-800 space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider px-1">
              <Link2 className="w-3 h-3" />
              Link de imagem (logo)
            </label>
            <div className="flex items-center gap-1.5 px-1">
              <input
                type="text"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyImageUrl();
                }}
                placeholder="https://exemplo.com/logo.png"
                className="flex-1 min-w-0 bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800 text-[11px] text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500/50"
              />
              <button
                type="button"
                onClick={applyImageUrl}
                disabled={!imageUrlInput.trim()}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-[11px] font-medium rounded-md transition-colors shrink-0"
              >
                Usar
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 p-2 border-b border-neutral-800 flex-wrap">
            {DEFAULT_ICONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => pick(emoji)}
                className="w-7 h-7 flex items-center justify-center text-base rounded-lg hover:bg-neutral-800 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 px-2 pt-2 overflow-x-auto">
            {EMOJI_GROUPS.map((group, idx) => (
              <button
                key={group.label}
                onClick={() => setActiveGroup(idx)}
                title={group.label}
                className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  activeGroup === idx
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                {group.emojis[0]}
              </button>
            ))}
          </div>

          <div className="p-2">
            <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider px-1 pb-1.5">
              {EMOJI_GROUPS[activeGroup].label}
            </div>
            <div className="grid grid-cols-8 gap-0.5 max-h-56 overflow-y-auto">
              {EMOJI_GROUPS[activeGroup].emojis.map((emoji, i) => (
                <button
                  key={`${emoji}-${i}`}
                  onClick={() => pick(emoji)}
                  className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
