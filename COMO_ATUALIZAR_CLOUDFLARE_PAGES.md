# Atualizar Painel de Viabilidade de Rotas — 22/10/2026 (Cloudflare Pages)

Este ZIP usa o **mesmo modelo Cloudflare Pages** do projeto anterior, sem Workers, Wrangler, banco D1 ou GitHub Actions. Os arquivos de 22/10/2026 foram preservados, incluindo metas por destino, interface, importação/exportação e testes.

## Se `viabilidade-de-rotas.pages.dev` está conectado ao GitHub

1. Extraia este ZIP no computador. **Não envie apenas o arquivo ZIP para o repositório.**
2. Abra o repositório GitHub já conectado ao projeto `viabilidade-de-rotas` no Cloudflare Pages.
3. Substitua os arquivos antigos pelos arquivos extraídos, mantendo `index.html`, `natto-logo.png` e `jszip.min.js` na **raiz** e os arquivos de `docs/` e `tests/` dentro de suas respectivas pastas.
4. Faça commit na branch de produção (normalmente `main`). O Pages publicará automaticamente, desde que a integração Git esteja ativa.
5. Abra https://viabilidade-de-rotas.pages.dev e recarregue a página (Ctrl+F5).

Se houver arquivos antigos que não fazem mais parte desta versão, remova-os do repositório para evitar confusão. Não exclua o projeto Pages.

## Se o Pages atual foi criado por upload direto

Abra o projeto `viabilidade-de-rotas` no painel Cloudflare, vá em **Deployments → Create deployment / Upload assets** e envie este ZIP (ou os arquivos extraídos, conforme a opção oferecida). Não é necessário criar outro projeto.

## Configuração Pages caso precise conferir

- Framework preset: `None`
- Build command: `exit 0` (ou vazio, se permitido)
- Build output directory: `.`
- Root directory: vazio
- Production branch: `main` ou a branch já usada
- Variáveis de ambiente: nenhuma

Se aparecer erro 404, confirme que `index.html` está na raiz do repositório e que a saída de build é `.`.

## Dados e segurança

O painel é estático e os dados salvos no navegador não são sincronizados entre computadores. Atualizar os arquivos do site não transfere dados entre navegadores. Para limitar acesso, configure Cloudflare Access para o domínio Pages.
