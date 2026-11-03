# AMSS — Rebranding do frontend (Fase 1)

Importar o frontend enviado (web.zip, app React/Vite do Frigate, 2148 arquivos) neste projeto, aplicar a identidade visual **azul corporativo da AMSS (ANTOSC Monitoring & Surveillance System)**, remover tudo que remete a "Frigate" e entregar: (a) app rodando no preview do Lovable e (b) ZIP com o código rebrandado.

**Backend mantido:** o app continua conversando com o mesmo servidor. Nada de API muda — rotas (`/api/*`), WebSocket (`/ws`, `/live`), caminhos de mídia (`/media/frigate/...`), formatos de resposta e schema de config permanecem idênticos. A rebranding é só de marca, textos e identidade visual.

## O que muda vs. o que não muda

**Muda**
- Tudo que o usuário vê: título da aba, tela de login, menu lateral, mensagens, alertas, textos de documentação — nas 52 traduções incluídas.
- Logos, favicons, site.webmanifest, página de login.
- Cores/tipografia: tema azul corporativo como padrão.
- Identificadores internos de código (`FrigateConfig` → `AmssConfig`, hooks `useFrigateStats` → `useAmssStats`, etc.).

**Não muda (contrato com o backend)**
- URLs e endpoints, nomes de campos recebidos do servidor, caminhos de armazenamento, esquema de configuração.

## Etapas

1. **Logo AMSS** — dois conceitos distintos (azul corporativo), refinamento do escolhido, derivação de favicon e ícones do app.
2. **Importação** — copiar o código para o projeto, mesclar dependências no `package.json` (mantidas as versões TanStack fixadas do template; sem react-router-dom), incluir os patches do Radix via patch-package e ajustar o build (proxy para o servidor via `PROXY_HOST`, Monaco editor).
3. **Roteamento** — substituir o roteador atual por TanStack Router em 62 arquivos: rotas live, review, explore, export, settings, system, config, logs, faces, classification, chat, playground, replay, unauthorized + login, preservando o controle de acesso por papéis (admin/viewer) já existente. O app roda no navegador (WebSocket, IndexedDB, vídeo) e será montado sem renderização no servidor.
4. **Estilos** — portar o Tailwind v3 para o Tailwind v4 do projeto (`src/styles.css`), mantendo os arquivos de tema existentes (variáveis de cor) e definindo o azul corporativo como tema default, com login e menu rebrandados.
5. **Rebranding em massa (script)** — trocar strings visíveis "Frigate" → "AMSS" nas traduções, títulos, README e textos de interface; remover links para documentação do Frigate; renomear identificadores de código; conferência por amostragem (en, pt, pt-BR) para não alterar chaves de API por engano.
6. **Verificação** — build sem erros, checagem de tipos, teste de rotas atualizado, navegação com navegador real: login/casca do app visíveis, zero ocorrências de "Frigate" na interface, console limpo.
7. **Entrega** — ZIP do código rebrandado nos Files (sem dependências nem build), pronto para substituir o frontend atual do seu servidor.

## Observações do preview

Sem um servidor conectado, o preview mostra o casco do app (login, menu, páginas com estados vazios) — os dados ao vivo dependem do servidor real. Isso é esperado nesta fase.

## Riscos

- Conversão de roteador em 62 arquivos é extensa, porém mecânica; validada por checagem de tipos e navegação real.
- Monaco/konva/HLS no build do projeto podem exigir ajustes de plugin e workers.
- Troca automatizada nas 52 traduções é revisada por amostragem antes de entrar.
