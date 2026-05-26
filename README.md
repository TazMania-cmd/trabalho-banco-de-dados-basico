# Sistema Locadora - Node.js + Supabase

Projeto para a disciplina de Banco de Dados I com backend Node.js, Supabase e interface web para manutencao dos dados de uma locadora.

## O que o projeto usa

- Node.js com Express
- Node.js 20 ou superior
- Supabase como banco de dados PostgreSQL
- `@supabase/supabase-js` no backend
- Front-end em HTML, CSS e JavaScript puro
- Comunicacao do front-end com o backend usando `fetch` e JSON

O front-end nao acessa o Supabase diretamente. Todas as operacoes de Insert, Select, Update e Delete passam pelas rotas `/api` do backend.

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

## Configurar o banco no Supabase

1. Crie um projeto no Supabase.
2. Abra o `SQL Editor`.
3. Copie todo o conteudo de `database.sql`.
4. Cole no editor SQL e execute.

O script cria as tabelas:

- `clientes`
- `categorias`
- `filmes`
- `locacoes`
- `itens`

Ele tambem cadastra dados iniciais e cria policies de RLS para permitir o CRUD usando a chave anon/publishable.

## Configurar o backend

Copie o arquivo de exemplo:

```powershell
copy .env.example .env.local
```

Preencha o `.env.local` com os dados do seu projeto Supabase:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
PORT=3000
```

Opcionalmente, como a conexao fica no backend, voce tambem pode usar a service role key:

```env
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

Nao envie `.env.local` para o GitHub.

## Executar

Instale as dependencias:

```bash
npm install
```

Inicie o servidor:

```bash
npm start
```

Acesse:

```text
http://localhost:3000
```

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
- `GET /api/locacoes`
- `POST /api/locacoes`
- `PUT /api/locacoes/:id`
- `DELETE /api/locacoes/:id`
- `GET /api/itens`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`
- `GET /api/locacoes/detalhes`
- `GET /api/clientes/:id/locacoes`
