# Publicar no Cloudflare Pages (modelo do painel anterior)

Este pacote é **Cloudflare Pages**, não Cloudflare Workers. Não precisa de Wrangler, GitHub Actions, D1, npm ou comando de build.

## Atualizar o projeto existente `viabilidade-de-rotas.pages.dev`

1. Extraia este ZIP no computador.
2. Abra no GitHub o **repositório que já está conectado** ao projeto `viabilidade-de-rotas` no Cloudflare Pages.
3. Substitua os arquivos antigos pelos arquivos extraídos, preservando `index.html`, `natto-logo.png` e `jszip.min.js` **na raiz** e `tests/` e `docs/` em suas pastas. Não envie o ZIP fechado como único arquivo.
4. Confirme o commit na branch de produção (normalmente `main`). O Cloudflare Pages fará uma nova implantação automaticamente, se a integração Git estiver ativa.
5. Acesse `https://viabilidade-de-rotas.pages.dev` e recarregue a página.

**Importante:** Se seu Pages atual foi criado por **upload direto**, ele não atualiza automaticamente pelo GitHub. Nesse caso, abra o projeto no Cloudflare Pages e faça **Create deployment / Upload assets** com este ZIP ou com a pasta extraída.

## Configurações para criar um projeto Pages via Git

- Framework preset: `None`
- Build command: `exit 0` (ou vazio, se permitido)
- Build output directory: `.`
- Root directory: vazio
- Production branch: `main` (ou a branch existente)
- Variáveis de ambiente: nenhuma

Este pacote não contém `.github/workflows/deploy.yml` nem `wrangler.jsonc`, pois a implantação é gerenciada pelo **Cloudflare Pages**.

**Atenção à segurança:** este site salva dados no navegador local. Se precisar restringir quem pode abrir o endereço, configure uma aplicação Cloudflare Access para o domínio Pages.
