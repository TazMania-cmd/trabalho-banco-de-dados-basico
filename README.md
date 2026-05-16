# Trabalho Node.js + MySQL

Projeto para consultar, via backend Node.js, os dados da locadora usados nas aulas de Banco de Dados I.

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

5. Acesse:

```text
http://localhost:3000
```

## Rotas SELECT

- `GET /api/clientes`
- `GET /api/categorias`
- `GET /api/filmes`
- `GET /api/locacoes`
- `GET /api/locacoes/detalhes`
- `GET /api/clientes/:id/locacoes`

As credenciais do banco ficam apenas no arquivo `.env`. O JavaScript do front-end usa `fetch` para chamar o backend e nao acessa o MySQL diretamente.
