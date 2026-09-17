import { Extension } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface WikiLinkOptions {
  onWikiLinkClick?: (title: string) => void;
}

export const WikiLinkExtension = Extension.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      onWikiLinkClick: undefined,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey('wikiLinkDecorations'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const regex = /\[\[(.*?)\]\]/g;

            state.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                let match;
                while ((match = regex.exec(node.text)) !== null) {
                  const start = pos + match.index;
                  const end = start + match[0].length;
                  const linkTitle = match[1].trim();

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'wikilink-chip',
                      'data-wikilink': linkTitle,
                      title: `Página: ${linkTitle} (Clique para abrir)`,
                    })
                  );
                }
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const wikilinkElem = target.closest('.wikilink-chip') as HTMLElement | null;
            if (wikilinkElem) {
              const linkTitle = wikilinkElem.getAttribute('data-wikilink');
              if (linkTitle && options.onWikiLinkClick) {
                event.preventDefault();
                event.stopPropagation();
                options.onWikiLinkClick(linkTitle);
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
