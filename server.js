const path = require('path');
const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'AULAS'
});

connection.connect((error) => {
  if (error) {
    console.error('Erro ao conectar no MySQL:', error.message);
    return;
  }

  console.log('Conectado ao MySQL.');
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function query(res, sql, params = []) {
  connection.query(sql, params, (error, rows) => {
    if (!error) {
      res.json(rows);
      return;
    }

    console.error('Erro ao consultar o MySQL:', error);
    res.status(500).json({
      erro: 'Nao foi possivel consultar o banco de dados.',
      detalhe: error.message
    });
  });
}

app.get('/api/status', (req, res) => {
  connection.query('SELECT 1 AS conectado', (error, rows) => {
    if (!error) {
    res.json(rows);
      return;
    }

    res.status(500).json({
      erro: 'Nao foi possivel conectar ao banco de dados.',
      detalhe: error.message
    });
  });
});

app.get('/api/clientes', (req, res) => {
  query(
    res,
    `SELECT CLI_ID, CLI_NOME, CLI_TELEFONE, CLI_DATA_CAD, CLI_SALDO
     FROM CLIENTES
     ORDER BY CLI_NOME ASC`
  );
});

app.get('/api/categorias', (req, res) => {
  query(
    res,
    `SELECT CAT_ID, CAT_NOME, CAT_DATA_CAD
     FROM CATEGORIAS
     ORDER BY CAT_NOME ASC`
  );
});

app.get('/api/filmes', (req, res) => {
  query(
    res,
    `SELECT FILMES.FIL_ID,
            FILMES.FIL_NOME,
            CATEGORIAS.CAT_NOME,
            FILMES.FIL_DATA_CAD
     FROM FILMES, CATEGORIAS
     WHERE FILMES.FIL_CAT_ID = CATEGORIAS.CAT_ID
     ORDER BY FILMES.FIL_NOME ASC`
  );
});

app.get('/api/locacoes', (req, res) => {
  query(
    res,
    `SELECT CLIENTES.CLI_ID,
            CLIENTES.CLI_NOME,
            CLIENTES.CLI_SALDO,
            LOCACOES.LOC_ID,
            LOCACOES.LOC_DATA_CAD
     FROM CLIENTES, LOCACOES
     WHERE CLIENTES.CLI_ID = LOCACOES.LOC_CLI_ID
     ORDER BY LOCACOES.LOC_ID ASC`
  );
});

app.get('/api/locacoes/detalhes', (req, res) => {
  query(
    res,
    `SELECT CLIENTES.CLI_ID,
            CLIENTES.CLI_NOME,
            CLIENTES.CLI_SALDO,
            LOCACOES.LOC_ID,
            LOCACOES.LOC_DATA_CAD,
            FILMES.FIL_NOME,
            CATEGORIAS.CAT_NOME,
            ITENS.ITN_VALOR_LOC
     FROM CLIENTES, LOCACOES, CATEGORIAS, FILMES, ITENS
     WHERE CLIENTES.CLI_ID = LOCACOES.LOC_CLI_ID
       AND LOCACOES.LOC_ID = ITENS.ITN_LOC_ID
       AND FILMES.FIL_ID = ITENS.ITN_FIL_ID
       AND CATEGORIAS.CAT_ID = FILMES.FIL_CAT_ID
     ORDER BY LOCACOES.LOC_ID ASC, FILMES.FIL_NOME ASC`
  );
});

app.get('/api/clientes/:id/locacoes', (req, res) => {
  const clienteId = Number(req.params.id);

  if (!Number.isInteger(clienteId) || clienteId <= 0) {
    res.status(400).json({ erro: 'Informe um codigo de cliente valido.' });
    return;
  }

  query(
    res,
    `SELECT CLIENTES.CLI_NOME,
            LOCACOES.LOC_ID,
            LOCACOES.LOC_DATA_CAD,
            FILMES.FIL_NOME,
            CATEGORIAS.CAT_NOME,
            ITENS.ITN_VALOR_LOC
     FROM CLIENTES, LOCACOES, ITENS, FILMES, CATEGORIAS
     WHERE LOCACOES.LOC_CLI_ID = CLIENTES.CLI_ID
       AND CLIENTES.CLI_ID = ?
       AND ITENS.ITN_LOC_ID = LOCACOES.LOC_ID
       AND ITENS.ITN_FIL_ID = FILMES.FIL_ID
       AND CATEGORIAS.CAT_ID = FILMES.FIL_CAT_ID
     ORDER BY LOCACOES.LOC_ID ASC, FILMES.FIL_NOME ASC`,
    [clienteId]
  );
});

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
