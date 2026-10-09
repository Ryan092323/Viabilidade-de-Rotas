# Painel de Viabilidade de Rotas — GitHub + Cloudflare Pages

Versão recriada a partir do ZIP enviado em 09/10/2026, com dados e funcionalidades originais preservados e arquivos separados para facilitar manutenção.

## Recursos preservados

- Lista suspensa pesquisável de rotas.
- 38 médias de KM cadastradas, com preenchimento automático e possibilidade de substituição manual.
- Perfis 3/4, Toco, Truck, Bitruck e Carreta, incluindo Truck de 12 Ton.
- Metas por grupo/região e custos por KM.
- Tempo de atendimento/espera: Varejo = 30 min por cliente; Rede = 3 h por cliente.
- Frete próprio e transportadora contratada.
- Lançamento manual, importação de XLSX/CSV/TSV e colagem de planilhas.
- Planejamento de várias rotas, com divisão de peso pela quantidade de carros.
- Entrada de peso em kg ou Ton e resultados em Ton.
- Leitura correta de KM em formato brasileiro.
- Resumo consolidado, exportação PNG e impressão/PDF.
- Persistência local do planejamento no navegador.

## Arquivos

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Tela e listas suspensas |
| `styles.css` | Aparência responsiva e impressão |
| `data.js` | Custos, capacidades, metas, esperas e médias de KM |
| `app.js` | Cálculos, importação, salvamento e exportação |
| `jszip.min.js` | Biblioteca local de leitura de planilhas |
| `natto-logo.png` | Logotipo |
| `_headers` | Cabeçalhos HTTP para Cloudflare Pages |
| `tests/route-import.test.mjs` | Testes automatizados |
| `JSZIP-LICENSE.txt`, `PAKO-LICENSE.txt` | Licenças |

## Publicar no GitHub

1. Extraia o ZIP.
2. Crie um repositório no GitHub.
3. Envie **todos os arquivos extraídos** para a raiz do repositório (não envie somente o ZIP).
4. Confirme que `index.html`, `data.js`, `app.js`, `styles.css` e `jszip.min.js` estão na raiz.

## Publicar no Cloudflare Pages

Conecte o repositório em **Workers & Pages → Pages** e configure:

| Configuração | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` |
| Build command | `exit 0` |
| Build output directory | `.` |
| Root directory | Vazio |

Não é necessário instalar pacotes nem configurar banco de dados.

## Testar localmente

Abra `index.html` ou execute na pasta extraída:

```bash
python -m http.server 8080
```

Acesse `http://localhost:8080`.

Para executar os testes (Node.js):

```bash
node tests/route-import.test.mjs
```

## Atenção aos planejamentos anteriores

O armazenamento do planejamento é local ao navegador e ao endereço de origem.
Os planejamentos salvos em outro domínio não são transferidos automaticamente para o novo endereço. Importe novamente os dados originais quando necessário.

## Alterações de parâmetros

Edite `data.js` para atualizar os perfis, capacidades, custos, metas, tempos de atendimento e as 38 médias de KM.
