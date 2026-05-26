# Sistema Locadora - Node.js + MySQL

Projeto para a disciplina de Banco de Dados I com backend Node.js, banco MySQL e interface web para manutencao dos dados de uma locadora.

## Caracteristicas atendidas

- `index.html` fica na pasta principal do projeto.
- Arquivos JavaScript ficam na pasta `_JavaScript`.
- Arquivos CSS ficam na pasta `_CSS`.
- Arquivos de imagem devem ficar na pasta `_Imagens`, caso sejam adicionados.
- O sistema possui menu inicial para acessar a manutencao de cada tabela.
- Todas as operacoes de banco sao feitas pelo backend, usando JSON entre front-end e servidor.
- O front-end nao conecta diretamente no MySQL.
- Cada tela possui uma area superior para Insert, Select, Update e Delete e uma grid inferior com os dados ativos.
- Existe uma tela de relatorio geral com opcao de impressao.

## Tecnologias

- Node.js
- Express
- MySQL
- mysql2
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
```

## Como executar

1. Instale as dependencias:

```bash
npm install
```

2. Crie o banco e os dados de exemplo no MySQL:

```bash
mysql -u root -p < database.sql
```

3. Copie `.env.example` para `.env` e ajuste usuario/senha do MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=AULAS
PORT=3000
```

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

As credenciais do banco ficam apenas no arquivo `.env`. O JavaScript do front-end usa `fetch` para chamar o backend e recebe os dados em JSON.
