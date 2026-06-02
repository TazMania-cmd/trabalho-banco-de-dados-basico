# Sistema Locadora - Node.js + Supabase

Projeto academico para a disciplina de Banco de Dados I. O sistema representa uma locadora de filmes com cadastro de clientes, filmes, categorias, exemplares, locacoes, devolucoes, multas por atraso e pagamentos.

## Stack

- Node.js 20 ou superior
- Express
- Supabase como banco PostgreSQL
- `@supabase/supabase-js` no backend
- Front-end em HTML, CSS e JavaScript puro

O front-end nao acessa o Supabase diretamente. Todas as operacoes passam pelas rotas `/api` do backend.

## Estrutura

```text
.
|-- index.html
|-- server.js
|-- database.sql
|-- package.json
|-- .env.example
|-- _CSS/
|   `-- styles.css
|-- _JavaScript/
|   `-- app.js
`-- _Imagens/
```

O projeto nao usa models/controllers separados. Para manter o escopo academico simples, o `server.js` concentra rotas, validacoes e regras de negocio.

## Configurar o banco

1. Crie ou abra um projeto no Supabase.
2. Abra o `SQL Editor`.
3. Copie todo o conteudo de `database.sql`.
4. Cole no editor SQL e execute.

O script recria o banco do projeto, cria constraints, indices, views e dados de exemplo.

## Tabelas

- `clientes`: dados cadastrais, documento, contato, saldo e status ativo.
- `categorias`: generos dos filmes.
- `filmes`: titulo, categoria, ano, classificacao, duracao e valor padrao.
- `exemplares`: copias fisicas ou digitais de cada filme, com status de disponibilidade.
- `locacoes`: cabecalho da locacao, cliente, datas, status, totais, multa e pagamentos.
- `itens`: filmes/exemplares alugados em uma locacao.
- `pagamentos`: registros de pagamento vinculados a uma locacao.

## Regras de negocio implementadas

- Uma locacao deve ter cliente e data prevista de devolucao.
- Um item de locacao so pode usar exemplar com status `DISPONIVEL`.
- Ao inserir item, o exemplar passa para `ALUGADO`.
- Locacoes devolvidas ou canceladas nao podem receber novos itens.
- Ao devolver uma locacao, todos os itens alugados sao marcados como `DEVOLVIDO`.
- Ao devolver, os exemplares voltam para `DISPONIVEL`.
- A devolucao duplicada e bloqueada.
- Multa de atraso e calculada por dia de atraso e por item.
- Pagamentos atualizam automaticamente o total pago da locacao.
- Os totais da locacao sao recalculados a partir de itens e pagamentos.
- Nao e permitido excluir exemplar alugado.
- Nao e permitido excluir locacao com itens.

## Configurar o backend

Copie o arquivo de exemplo:

```powershell
copy .env.example .env.local
```

Preencha o `.env.local`:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
PORT=3000
VALOR_MULTA_DIA=2
```

Tambem e possivel usar:

```env
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

Nao envie `.env.local` para o GitHub.

## Executar

Instale as dependencias:

```bash
npm install
```

Inicie em modo desenvolvimento:

```bash
npm run dev
```

No PowerShell do Windows, se `npm.ps1` for bloqueado pela politica de execucao, use:

```powershell
npm.cmd run dev
```

Acesse:

```text
http://localhost:3000
```

## Funcionalidades da tela

- Cadastro de clientes
- Cadastro de categorias
- Cadastro de filmes
- Cadastro de exemplares
- Abertura de locacoes
- Inclusao de itens na locacao
- Registro de devolucao
- Registro de pagamentos
- Consulta de filmes disponiveis
- Consulta de filmes alugados
- Relatorio de locacoes abertas
- Relatorio de atrasos
- Relatorio de multas
- Relatorio geral de locacoes
- Busca textual nas tabelas exibidas

## Rotas principais

- `GET /api/status`
- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`
- `GET /api/categorias`
- `POST /api/categorias`
- `PUT /api/categorias/:id`
- `DELETE /api/categorias/:id`
- `GET /api/filmes`
- `POST /api/filmes`
- `PUT /api/filmes/:id`
- `DELETE /api/filmes/:id`
- `GET /api/exemplares`
- `POST /api/exemplares`
- `PUT /api/exemplares/:id`
- `DELETE /api/exemplares/:id`
- `GET /api/locacoes`
- `POST /api/locacoes`
- `PUT /api/locacoes/:id`
- `DELETE /api/locacoes/:id`
- `POST /api/locacoes/:id/devolver`
- `GET /api/itens`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`
- `GET /api/pagamentos`
- `POST /api/pagamentos`
- `DELETE /api/pagamentos/:id`
- `GET /api/filmes/disponiveis`
- `GET /api/filmes/alugados`
- `GET /api/clientes/:id/locacoes`
- `GET /api/locacoes/detalhes`
- `GET /api/relatorios/locacoes-abertas`
- `GET /api/relatorios/atrasos`
- `GET /api/relatorios/multas`

## Dados de exemplo

O `database.sql` cria clientes, categorias, filmes, exemplares fisicos e digitais, locacoes abertas, locacoes devolvidas, pagamentos parciais e totais, atrasos e multas.

## Observacoes de seguranca

- O backend valida campos obrigatorios antes de gravar.
- O acesso ao banco usa a biblioteca oficial do Supabase, sem concatenacao manual de SQL.
- O SQL cria chaves primarias, estrangeiras, checks, uniques e indices.
- As policies de RLS foram liberadas para CRUD porque o objetivo e academico e o front depende da chave anon/publishable. Em um sistema real, essas policies devem ser restritas por usuario autenticado.
