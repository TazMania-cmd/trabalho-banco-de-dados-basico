# Sistema Locadora - Node.js + Supabase

Projeto para a disciplina de Banco de Dados I com backend Node.js, Supabase e interface web para manutencao dos dados de uma locadora.

## Caracteristicas atendidas

- `index.html` fica na pasta principal do projeto.
- Arquivos JavaScript ficam na pasta `_JavaScript`.
- Arquivos CSS ficam na pasta `_CSS`.
- Arquivos de imagem devem ficar na pasta `_Imagens`, caso sejam adicionados.
- O sistema possui menu inicial para acessar a manutencao de cada tabela.
- Todas as operacoes de banco sao feitas pelo backend, usando JSON entre front-end e servidor.
- O front-end nao conecta diretamente no banco.
- Cada tela possui uma area superior para Insert, Select, Update e Delete e uma grid inferior com os dados ativos.
- Existe uma tela de relatorio geral com opcao de impressao.

## Tecnologias

- Node.js
- Express
- Supabase
- @supabase/supabase-js
- dotenv
- HTML, CSS e JavaScript puro

## Estrutura

```text
.
├── index.html
├── server.js
├── database.sql
├── package.json
├── .env.example
├── _CSS/
│   └── styles.css
├── _JavaScript/
│   └── app.js
└── _Imagens/
    └── .gitkeep
```

## Como configurar no Supabase

1. Crie um projeto no Supabase.

2. Abra o painel do projeto e va em:

```text
SQL Editor
```

3. Copie todo o conteudo do arquivo `database.sql`, cole no SQL Editor e execute.

Esse script cria as tabelas:

- `clientes`
- `categorias`
- `filmes`
- `locacoes`
- `itens`

E tambem insere dados de exemplo.

## Como conectar o projeto ao Supabase

1. No Supabase, pegue as chaves em:

```text
Project Settings > API
```

2. No projeto local, copie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

No Windows PowerShell, use:

```powershell
copy .env.example .env.local
```

3. Edite o `.env.local` e coloque seus dados reais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=COLE_AQUI_A_URL_DO_SUPABASE
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=COLE_AQUI_A_CHAVE_PUBLICA_DO_SUPABASE
PORT=3000
```

Importante: nao envie o arquivo `.env.local` para o GitHub.

## Como executar depois do git pull

1. Atualize seu projeto:

```bash
git pull
```

2. Reinstale as dependencias:

```bash
npm install
```

3. Configure o `.env.local` com a URL e a chave publica do Supabase.

4. Inicie o backend:

```bash
npm start
```

5. Acesse no navegador:

```text
http://localhost:3000
```

## Tabelas contempladas

- Clientes
- Categorias
- Filmes
- Locacoes
- Itens da locacao

## Rotas principais

### Status

- `GET /api/status`

### Clientes

- `GET /api/clientes`
- `POST /api/clientes`
- `PUT /api/clientes/:id`
- `DELETE /api/clientes/:id`

### Categorias

- `GET /api/categorias`
- `POST /api/categorias`
- `PUT /api/categorias/:id`
- `DELETE /api/categorias/:id`

### Filmes

- `GET /api/filmes`
- `POST /api/filmes`
- `PUT /api/filmes/:id`
- `DELETE /api/filmes/:id`

### Locacoes

- `GET /api/locacoes`
- `POST /api/locacoes`
- `PUT /api/locacoes/:id`
- `DELETE /api/locacoes/:id`

### Itens

- `GET /api/itens`
- `POST /api/itens`
- `PUT /api/itens/:id`
- `DELETE /api/itens/:id`

### Relatorios

- `GET /api/locacoes/detalhes`
- `GET /api/clientes/:id/locacoes`

## Observacao

As credenciais ficam apenas no arquivo `.env.local`. O JavaScript do front-end usa `fetch` para chamar o backend e recebe os dados em JSON. Isso mantem a manipulacao dos dados centralizada no backend.
