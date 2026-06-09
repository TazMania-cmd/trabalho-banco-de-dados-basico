# Sistema Locadora - Node.js + Supabase

Projeto acadêmico para a disciplina de Banco de Dados I. O sistema representa uma locadora de filmes com cadastro de clientes, filmes, categorias, exemplares, locações, devoluções, multas por atraso e pagamentos.

## Stack

- Node.js 20 ou superior
- Express
- Supabase como banco PostgreSQL
- `@supabase/supabase-js` no backend
- API do TMDB para busca e importação de dados de filmes
- Front-end em HTML, CSS e JavaScript puro

O front-end não acessa o Supabase diretamente. Todas as operações passam pelas rotas `/api` do backend.
O token do TMDB também fica somente no backend, em variável de ambiente.

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

O projeto não usa models/controllers separados. Para manter o escopo acadêmico simples, o `server.js` concentra rotas, validações e regras de negócio.

## Configurar o banco

1. Crie ou abra um projeto no Supabase.
2. Abra o `SQL Editor`.
3. Copie todo o conteúdo de `database.sql`.
4. Cole no editor SQL e execute.

O script recria o banco do projeto, cria constraints, índices, views e dados de exemplo.

Se o banco já existe e você quer apenas habilitar os campos novos do TMDB sem apagar dados, execute o arquivo:

```text
migrations/2026-06-09_tmdb_schema.sql
```

## Tabelas

- `clientes`: dados cadastrais, documento, contato, saldo e status ativo.
- `categorias`: gêneros dos filmes.
- `filmes`: título, categoria, ano, classificação, duração e valor padrão.
- `exemplares`: cópias físicas ou digitais de cada filme, com status de disponibilidade.
- `locacoes`: cabeçalho da locação, cliente, datas, status, totais, multa e pagamentos.
- `itens`: filmes/exemplares alugados em uma locação.
- `pagamentos`: registros de pagamento vinculados a uma locação.

## Regras de negócio implementadas

- Uma locação deve ter cliente e data prevista de devolução.
- Um item de locação só pode usar exemplar com status `DISPONIVEL`.
- Ao inserir item, o exemplar passa para `ALUGADO`.
- Locações devolvidas ou canceladas não podem receber novos itens.
- Ao devolver uma locação, todos os itens alugados são marcados como `DEVOLVIDO`.
- Ao devolver, os exemplares voltam para `DISPONIVEL`.
- A devolução duplicada é bloqueada.
- Multa de atraso é calculada por dia de atraso e por item.
- Pagamentos atualizam automaticamente o total pago da locação.
- Os totais da locação são recalculados a partir de itens e pagamentos.
- Não é permitido excluir exemplar alugado.
- Não é permitido excluir locação com itens.

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
TMDB_ACCESS_TOKEN=seu-token-read-access
```

Também é possível usar:

```env
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

Não envie `.env.local` para o GitHub.

Para usar o TMDB, crie uma conta em The Movie Database, acesse as configurações de API e copie o token de leitura para `TMDB_ACCESS_TOKEN`.

## Executar

Instale as dependências:

```bash
npm install
```

Inicie em modo desenvolvimento:

```bash
npm run dev
```

No PowerShell do Windows, se `npm.ps1` for bloqueado pela política de execução, use:

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
- Busca e importação de filmes pelo TMDB
- Cadastro de exemplares
- Abertura de locações
- Inclusão de itens na locação
- Registro de devolução
- Registro de pagamentos
- Consulta de filmes disponíveis
- Consulta de filmes alugados
- Relatório de locações abertas
- Relatório de atrasos
- Relatório de multas
- Relatório geral de locações
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
- `GET /api/tmdb/search`
- `GET /api/tmdb/movie/:id`
- `POST /api/tmdb/import/:id`
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
- `PUT /api/pagamentos/:id`
- `DELETE /api/pagamentos/:id`
- `GET /api/filmes/disponiveis`
- `GET /api/filmes/alugados`
- `GET /api/clientes/:id/locacoes`
- `GET /api/locacoes/detalhes`
- `GET /api/relatorios/locacoes-abertas`
- `GET /api/relatorios/atrasos`
- `GET /api/relatorios/multas`

## Dados de exemplo

O `database.sql` cria clientes, categorias, filmes, exemplares físicos e digitais, locações abertas, locações devolvidas, pagamentos parciais e totais, atrasos e multas.

## Observações de segurança

- O backend valida campos obrigatórios antes de gravar.
- O acesso ao banco usa a biblioteca oficial do Supabase, sem concatenação manual de SQL.
- O SQL cria chaves primárias, estrangeiras, checks, uniques e índices.
- As policies de RLS foram liberadas para CRUD porque o objetivo é acadêmico e o front depende da chave anon/publishable. Em um sistema real, essas policies devem ser restritas por usuário autenticado.
