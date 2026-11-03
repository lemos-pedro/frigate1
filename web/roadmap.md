# Roadmap — AMSS rebranding

Fase 1 aprovada: importar frontend, identidade azul corporativo, remover Frigate, preview + ZIP.

## Tarefas
- [ ] 1. Logo AMSS (2 conceitos) → refinamento → favicon/ícones derivados
- [x] 2. Importar código (src, public, themes, images, patches) + mesclar dependências (sem react-router-dom) + patches Radix
- [ ] 3. Rebranding em massa: locales (52 idiomas), títulos, README, assets de marca, identificadores Frigate*→Amss*
- [x] 4. Roteamento: TanStack catch-all + shim de compat react-router-dom (62 arquivos intocados)
- [ ] 5. Estilos: portar Tailwind v3 → v4 (styles.css), tema azul corporativo default
- [ ] 6. Entrada do app: providers do App.tsx no root route, páginas sem SSR, login como rota
- [ ] 7. Verificação: build, typecheck, teste de rotas, Playwright (login + casco), zero "Frigate" visível
- [ ] 8. Entrega: ZIP rebrandado em Files

## Notas
- Backend Frigate mantido: NÃO alterar /api/*, /ws, /live, /media/frigate/*, schema de config.
- e2e/ não entra no projeto Lovable; entra no ZIP com varredura de marca.
