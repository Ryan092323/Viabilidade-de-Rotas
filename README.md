# Painel de Viabilidade de Rotas

Versão 20, atualizada em 14/10/2026, atualizada com o KM automático de 42 rotas (37 médias cadastradas e 5 estimativas rodoviárias), formulário acima das rotas planejadas e exibição dos pesos apenas em toneladas (Ton). Site estático em HTML, CSS e JavaScript, pronto para GitHub e Cloudflare Pages. A calculadora funciona no navegador, sem conta, assinatura ou API do ChatGPT.

## Publicar com GitHub e Cloudflare Pages

1. Extraia este ZIP no computador.
2. Crie um repositório no GitHub, por exemplo `painel-viabilidade-rotas`.
3. Use **Add file → Upload files** e envie os arquivos e as pastas `tests` e `docs` extraídos. O arquivo `index.html` precisa ficar na raiz do repositório, junto de `jszip.min.js` e `natto-logo.png`. Envie os arquivos extraídos, não apenas o ZIP. Confirme o envio para a branch `main`.
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
- Importação de planilhas, colagem e tabela com peso sempre em KG; conversão automática e exibição dos resultados em Ton.
- Capacidade de Truck de 12 Ton e demais perfis do painel atual.
- KM automático para 42 rotas cadastradas, mantendo a possibilidade de informar outro KM.
- Ceará utiliza Juazeiro do Norte como destino. Ceará, SRT Ouricuri, SRT Araripina Redes, SRT Dormentes e SRT Cabrobó utilizam estimativas rodoviárias de ida e volta desde Belo Jardim, identificadas no site.
- Formulário Adicionar rota acima de Rotas planejadas, ocupando toda a largura da página.
- Leitura de KM no padrão brasileiro: `1.064` significa 1064 km; `2.500` significa 2500 km.
- Custo, utilização, viabilidade média e soma e resumo consolidado.
- Tempo total dos atendimentos: 30 minutos por cliente de varejo e 3 horas por cliente de rede, somando todos os clientes da rota e sem deslocamento. Tempo e quantidade de clientes aparecem juntos no detalhamento.
- Peso mínimo viável do frete próprio em Ton, calculado por custo total ÷ R$/META e considerando todos os carros da rota.
- Nas rotas inviáveis de frete próprio, a coluna Peso viável informa **Faltam X Ton**, indicando o peso adicional para atingir a meta.
- Aviso quando o peso mínimo viável excede a capacidade dos carros planejados.
- KM da rota exibido em uma única linha, com a informação repetida de KM frota retirada das tabelas.
- Exportação em PNG usando o conteúdo e os estilos do resumo, com detalhamento das rotas à esquerda e painéis de resumo à direita, em resolução duplicada para melhorar a leitura.
- O PNG inclui os indicadores gerais, todas as colunas do detalhamento, utilização por perfil, viabilidade do frete próprio, transportadora contratada quando aplicável e alertas de capacidade.
- Impressão / PDF inclui os painéis de resumo e usa página A4 em paisagem.
- Resumo por rota removido da tela; os indicadores gerais, detalhamento, utilização por perfil e viabilidade continuam disponíveis.

## Rotas com referências rodoviárias

| Rota | KM por carro (ida e volta) |
| --- | ---: |
| Ceará — Juazeiro do Norte | 828 |
| SRT Ouricuri | 884 |
| SRT Araripina Redes | 1.002 |
| SRT Dormentes | 1.130 |
| SRT Cabrobó — Santa Maria da Boa Vista | 850 |

São estimativas calculadas como duas vezes a distância rodoviária de ida, sem os deslocamentos entre clientes. As fontes e o método estão em [docs/km-estimados.md](docs/km-estimados.md).

## Dados do planejamento

Os planejamentos ficam salvos no navegador de cada usuário, em cada endereço do site. Este ZIP contém o sistema, não as rotas salvas no seu navegador.

Ao abrir o novo endereço do Cloudflare, importe novamente as planilhas de origem. Os registros do endereço anterior não são transferidos automaticamente. Computadores e navegadores diferentes não compartilham os registros, e limpar os dados do navegador remove o planejamento salvo. Guarde as planilhas de origem e os resumos que precisar conservar.

## Arquivos

| Arquivo | Finalidade |
| --- | --- |
| `index.html` | Estrutura da interface |
| `styles.css` | Estilos da interface, impressão e exportação PNG |
| `data.js` | Perfis, capacidades, metas, tempos de espera e KM por rota |
| `app.js` | Cálculos, importações, relatórios, PNG e armazenamento |
| `jszip.min.js` | Biblioteca local utilizada para ler arquivos Excel |
| `natto-logo.png` | Logotipo utilizado no painel |
| `tests/route-import.test.mjs` | Verificações dos cálculos, importações e fluxo de exportação |
| `docs/km-estimados.md` | Fontes e método das estimativas de quilometragem |
| `JSZIP-LICENSE.txt`, `PAKO-LICENSE.txt` | Licenças das bibliotecas incluídas |

Não há etapa de compilação, instalação de pacotes ou configuração de banco de dados. Para verificar os cálculos em um computador com Node.js, execute `node tests/route-import.test.mjs` na pasta extraída. Isso é opcional e não é necessário para publicar.

## Documentação consultada

- [Cloudflare Pages — HTML estático](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)
- [Cloudflare Pages — integração com Git](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Cloudflare Pages — upload direto](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [GitHub — enviar arquivos para um repositório](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)


## Organização desta versão para GitHub + Cloudflare Pages

A lógica e os dados da versão 20 foram preservados e separados em `index.html`, `styles.css`, `data.js` e `app.js`. Não há instalação de dependências ou build. Os arquivos devem ficar juntos na raiz do repositório, juntamente com `jszip.min.js` e `natto-logo.png`.

**Correção preventiva do PNG:** a exportação carrega explicitamente `styles.css` antes de gerar a imagem, mantendo cores, colunas e tipografia. Se o arquivo de estilos não puder ser carregado, a exportação avisa sobre o erro em vez de baixar uma imagem desformatada. Para testar a exportação localmente, abra o projeto em um servidor HTTP local (por exemplo, `python -m http.server 8000`), não por `file://`.

**Testes:** execute `node tests/route-import.test.mjs` com Node.js instalado. O teste cobre cálculos, importação e fluxo de exportação, incluindo carregamento dos estilos externos. A validação automatizada não substitui um teste visual em um navegador real.

**Dados anteriores:** os planejamentos ficam no armazenamento local do navegador e não são transportados dentro do ZIP. Faça backup das planilhas originais e dos relatórios antes de trocar o endereço do site.
