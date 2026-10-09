# Piaseg · Apólices não Renovadas

Painel para cada franqueado acompanhar os clientes cujas apólices não foram renovadas (relatório
`RptApolicesNaoRenovadas` do Quiver) e responder o que aconteceu com cada um. O gestor tem a visão geral
mês a mês por franqueado.

- `backend/` — FastAPI + PostgreSQL (Render). Login com o mesmo usuário/senha do Portal do Franqueado
  (`piaseg_usuarios` em `https://www.piaseg.com.br/get_data.php`, sha256).
- `frontend/` — Next.js (Vercel). `NEXT_PUBLIC_API_URL` aponta para o backend.

A planilha é importada pelo gestor na tela "Importar e acessos" (nenhum dado de cliente fica neste repositório).
