# NodeX — Plataforma Unificada (Notion + Trello + Obsidian) Self-Hosted

<div align="center">
  <h3>Uma fusão 100% Web e Self-Hosted de gestão de conhecimento, tarefas, calendário e apontamento de horas.</h3>
</div>

---

## ✨ Principais Recursos

### 📝 Notas & Conhecimento
- **Editor em Blocos (estilo Notion)**: formatação rica, títulos, listas, checklists, citações, blocos de código e comandos rápidos com `/`.
- **Sub-páginas aninhadas**: crie notas dentro de notas digitando `/subpagina` no editor — a barra lateral mostra a hierarquia numa árvore expansível.
- **Anexos de arquivo**: arraste e solte ou use o botão "Vincular Arquivo" para anexar PDFs, imagens, planilhas etc. direto na nota.
- **Ícones personalizados**: escolha entre centenas de emojis organizados por categoria para cada nota, quadro ou card.
- **`[[WikiLinks]]` e Backlinks**: links bidirecionais automáticos que conectam qualquer nota ou card, com painel de "Conexões de Conhecimento".
- **Grafo de Conhecimento 2D**: visualização interativa em WebGL acelerada por GPU de todas as conexões do seu acervo.
- **Busca Global Rápida**: command palette (`Ctrl+K`) para navegar instantaneamente por notas, quadros e conteúdo.

### 📋 Quadros Kanban (estilo Trello)
- Drag-and-drop fluido de cards entre colunas — incluindo colunas vazias.
- Criação e exclusão de colunas e cards, com badges de prioridade e tags.

### 📅 Calendário
- Visualização mensal com criação, edição e exclusão de compromissos.
- Lembretes configuráveis por evento (5 min a 1 dia antes).
- **Notificações via Telegram**: conecte seu próprio bot (token + chat ID) na tela de Configurações para receber avisos de compromissos próximos direto no Telegram, com botão de teste.

### ⏱️ Apontamento de Horas
- **Grade semanal** (estilo Teamwork): projetos nas linhas, dias da semana nas colunas, com totais por linha/coluna e período.
- **Duração direta**: digite "2h30", "2:30" ou "2.5" em vez de calcular horário de início/fim.
- **Tags** por apontamento e **repetição em múltiplos dias** de uma vez (ex: mesma tarefa de segunda a sexta).
- **Linha do Tempo**: gráfico de barras empilhadas por projeto, mostrando um período de 15 dias por vez, com paginação.
- Gerenciamento de projetos (nome + cor) direto na tela.

### 🏠 Outros
- **Página Início**: acesso rápido para criar notas/quadros e abrir os módulos principais, além dos seus favoritos.
- **100% Self-Hosted & Leve**: roda em qualquer servidor com Docker Compose, com banco SQLite embutido — sem dependências externas.

---

## 🚀 Como Executar

### Opção 1: Desenvolvimento Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Executar aplicação em modo de desenvolvimento
pnpm --filter "@nodex/*" --parallel dev
```
Acesse a aplicação no navegador em: `http://localhost:5173`

---

### Opção 2: Deploy Self-Hosted com Docker Compose

```bash
# Iniciar os serviços em segundo plano
docker compose up -d
```
Acesse a aplicação no seu servidor ou rede local em: `http://localhost:3000`

---

## 📂 Estrutura do Monorepo

```
nodex-workspace/
├── apps/
│   ├── web/                     # Frontend SPA React + Vite + Tailwind
│   │   └── src/
│   │       ├── editor/          # Editor de blocos (TipTap) e sub-páginas
│   │       ├── kanban/          # Quadro Kanban (dnd-kit)
│   │       ├── graph/           # Grafo de conhecimento 2D
│   │       ├── calendar/        # Calendário e lembretes
│   │       ├── timetracking/    # Apontamento de horas (grade + linha do tempo)
│   │       ├── home/            # Página Início
│   │       ├── components/      # Sidebar, Header, Command Palette, Configurações
│   │       └── stores/          # Estado global (Zustand)
│   └── server/                  # Backend Fastify + SQLite
│       └── src/
│           ├── db/              # Schema e acesso ao SQLite
│           ├── routes/          # Rotas REST (notas, eventos, projetos, apontamentos)
│           └── telegram.ts      # Integração com a Bot API do Telegram
├── packages/
│   └── shared/                  # Tipos TypeScript e utilitários compartilhados
├── docker-compose.yml           # Configuração de deploy em 1 comando
└── Dockerfile                   # Build multi-stage otimizado
```

---

## 🛠️ Stack Tecnológica

- **Frontend**: React 19, Vite, Tailwind CSS, Zustand, TipTap (editor), dnd-kit (drag-and-drop), react-force-graph (grafo 2D).
- **Backend**: Fastify, better-sqlite3, TypeScript.
- **Infraestrutura**: pnpm workspaces (monorepo), Docker multi-stage build.
