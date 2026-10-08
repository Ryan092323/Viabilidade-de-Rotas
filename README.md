# Painel de Viabilidade de Rotas

Versão de 08/10/2026, com as correções de quilômetros e de kg/Ton. Site estático em HTML, CSS e JavaScript, pronto para GitHub e Cloudflare Pages. A calculadora funciona no navegador, sem conta, assinatura ou API do ChatGPT.

## Publicar com GitHub e Cloudflare Pages

1. Extraia este ZIP no computador.
2. Crie um repositório no GitHub, por exemplo `painel-viabilidade-rotas`.
3. Use **Add file → Upload files** e envie os arquivos e a pasta `tests` extraídos. O arquivo `index.html` precisa ficar na raiz do repositório, junto de `jszip.min.js` e `natto-logo.png`. Envie os arquivos extraídos, não apenas o ZIP. Confirme o envio para a branch `main`.
4. No Cloudflare, abra **Workers & Pages → Create application → Pages** e escolha a integração com Git / importação de um repositório existente.
5. Conecte sua conta GitHub e selecione o repositório criado.
6. Configure os campos conforme a tabela e selecione **Save and Deploy**.

| Campo no Cloudflare Pages | Preenchimento |
| --- | --- |
| Production branch | `main` |
| Framework preset | `None` / nenhum |
| Build command | `exit 0` |
| Build output directory | `.` — um ponto, pois o `index.html` está na raiz |
| Root directory (advanced) | Deixe vazio |
| Environment variables | Nenhuma necessária |

Ao terminar, o Cloudflare mostrará o endereço publicado. Depois, as alterações enviadas à branch `main` serão publicadas automaticamente pela integração. Se ocorrer erro 404, confira se `index.html` está na raiz e se o diretório de saída está definido como `.`.

## Alternativa: enviar o ZIP diretamente

O mesmo ZIP também está pronto para o envio de arquivos do Cloudflare Pages. Crie um projeto com a opção de upload direto / arrastar e soltar, selecione este ZIP, dê um nome ao projeto e publique.

Para atualizar pelo GitHub automaticamente, use desde o início o procedimento anterior. Um projeto criado com upload direto exige outro projeto para adotar a integração com Git posteriormente.

## O que está incluído

- Planejamento de várias rotas, manualmente, colando dados ou importando `.xlsx`, `.csv` e `.tsv`.
- Quantidade de carros por rota e divisão do peso total entre eles.
- Peso em kg e Ton, capacidade de Truck de 12.000 kg e demais perfis do painel atual.
- Leitura de KM no padrão brasileiro: `1.064` significa 1064 km; `2.500` significa 2500 km.
- Custo, utilização, viabilidade média e soma, tempo estimado e resumo consolidado.
- Exportação do resumo em PNG e impressão / PDF.

## Dados do planejamento

Os planejamentos ficam salvos no navegador de cada usuário, em cada endereço do site. Este ZIP contém o sistema, não as rotas salvas no seu navegador.

Ao abrir o novo endereço do Cloudflare, importe novamente as planilhas de origem. Os registros do endereço anterior não são transferidos automaticamente. Computadores e navegadores diferentes não compartilham os registros, e limpar os dados do navegador remove o planejamento salvo. Guarde as planilhas de origem e os resumos que precisar conservar.

## Arquivos

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Interface e cálculos completos da aplicação |
| `jszip.min.js` | Biblioteca local utilizada para ler arquivos Excel |
| `natto-logo.png` | Logotipo utilizado no painel e no resumo |
| `tests/route-import.test.mjs` | Verificações dos cálculos e importações |
| `JSZIP-LICENSE.txt`, `PAKO-LICENSE.txt` | Licenças das bibliotecas incluídas |

Não há etapa de compilação, instalação de pacotes ou configuração de banco de dados. Para verificar os cálculos em um computador com Node.js, execute `node tests/route-import.test.mjs` na pasta extraída. Isso é opcional e não é necessário para publicar.

## Documentação consultada

- [Cloudflare Pages — HTML estático](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Cloudflare Pages — integração com Git](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages — upload direto](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [GitHub — enviar arquivos para um repositório](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
