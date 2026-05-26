const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'AULAS',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(express.json());
app.use('/_CSS', express.static(path.join(__dirname, '_CSS')));
app.use('/_JavaScript', express.static(path.join(__dirname, '_JavaScript')));
app.use('/_Imagens', express.static(path.join(__dirname, '_Imagens')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function executarConsulta(res, sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao consultar o MySQL:', error);
    res.status(500).json({
      erro: 'Nao foi possivel consultar o banco de dados.',
      detalhe: error.message
    });
  }
}

async function executarAcao(res, sql, params = [], mensagem = 'Operacao realizada com sucesso.') {
  try {
    const [resultado] = await pool.execute(sql, params);
    res.json({
      mensagem,
      insertId: resultado.insertId,
      affectedRows: resultado.affectedRows
    });
  } catch (error) {
    console.error('Erro ao manipular o MySQL:', error);
    res.status(500).json({
      erro: 'Nao foi possivel manipular o banco de dados.',
      detalhe: error.message
    });
  }
}

function validarId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: 'Informe um codigo valido.' });
    return null;
  }

  return id;
}

function textoObrigatorio(valor, nomeCampo, res) {
  if (!valor || String(valor).trim() === '') {
    res.status(400).json({ erro: `O campo ${nomeCampo} e obrigatorio.` });
    return null;
  }

  return String(valor).trim();
}

function numeroPositivo(valor, nomeCampo, res, obrigatorio = true) {
  if ((valor === undefined || valor === null || valor === '') && !obrigatorio) {
    return null;
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    res.status(400).json({ erro: `O campo ${nomeCampo} deve ser um numero positivo.` });
    return null;
  }

  return numero;
}

app.get('/api/status', async (req, res) => {
  await executarConsulta(res, 'SELECT 1 AS conectado');
});

// CLIENTES
app.get('/api/clientes', async (req, res) => {
  await executarConsulta(
    res,
    `SELECT CLI_ID, CLI_NOME, CLI_TELEFONE, CLI_DATA_CAD, CLI_SALDO
     FROM CLIENTES
     ORDER BY CLI_ID ASC`
  );
});

app.post('/api/clientes', async (req, res) => {
  const nome = textoObrigatorio(req.body.CLI_NOME, 'nome do cliente', res);
  if (!nome) return;

  const telefone = req.body.CLI_TELEFONE ? String(req.body.CLI_TELEFONE).trim() : null;
  const saldo = numeroPositivo(req.body.CLI_SALDO ?? 0, 'saldo', res);
  if (saldo === null) return;

  await executarAcao(
    res,
    `INSERT INTO CLIENTES (CLI_NOME, CLI_TELEFONE, CLI_DATA_CAD, CLI_SALDO)
     VALUES (?, ?, NOW(), ?)`,
    [nome, telefone, saldo],
    'Cliente cadastrado com sucesso.'
  );
});

app.put('/api/clientes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const nome = textoObrigatorio(req.body.CLI_NOME, 'nome do cliente', res);
  if (!nome) return;

  const telefone = req.body.CLI_TELEFONE ? String(req.body.CLI_TELEFONE).trim() : null;
  const saldo = numeroPositivo(req.body.CLI_SALDO ?? 0, 'saldo', res);
  if (saldo === null) return;

  await executarAcao(
    res,
    `UPDATE CLIENTES
     SET CLI_NOME = ?, CLI_TELEFONE = ?, CLI_SALDO = ?
     WHERE CLI_ID = ?`,
    [nome, telefone, saldo, id],
    'Cliente atualizado com sucesso.'
  );
});

app.delete('/api/clientes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  await executarAcao(res, 'DELETE FROM CLIENTES WHERE CLI_ID = ?', [id], 'Cliente excluido com sucesso.');
});

// CATEGORIAS
app.get('/api/categorias', async (req, res) => {
  await executarConsulta(
    res,
    `SELECT CAT_ID, CAT_NOME, CAT_DATA_CAD
     FROM CATEGORIAS
     ORDER BY CAT_ID ASC`
  );
});

app.post('/api/categorias', async (req, res) => {
  const nome = textoObrigatorio(req.body.CAT_NOME, 'nome da categoria', res);
  if (!nome) return;

  await executarAcao(
    res,
    `INSERT INTO CATEGORIAS (CAT_NOME, CAT_DATA_CAD)
     VALUES (?, NOW())`,
    [nome],
    'Categoria cadastrada com sucesso.'
  );
});

app.put('/api/categorias/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const nome = textoObrigatorio(req.body.CAT_NOME, 'nome da categoria', res);
  if (!nome) return;

  await executarAcao(
    res,
    'UPDATE CATEGORIAS SET CAT_NOME = ? WHERE CAT_ID = ?',
    [nome, id],
    'Categoria atualizada com sucesso.'
  );
});

app.delete('/api/categorias/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  await executarAcao(res, 'DELETE FROM CATEGORIAS WHERE CAT_ID = ?', [id], 'Categoria excluida com sucesso.');
});

// FILMES
app.get('/api/filmes', async (req, res) => {
  await executarConsulta(
    res,
    `SELECT FILMES.FIL_ID,
            FILMES.FIL_NOME,
            FILMES.FIL_CAT_ID,
            CATEGORIAS.CAT_NOME,
            FILMES.FIL_DATA_CAD
     FROM FILMES
     LEFT JOIN CATEGORIAS ON FILMES.FIL_CAT_ID = CATEGORIAS.CAT_ID
     ORDER BY FILMES.FIL_ID ASC`
  );
});

app.post('/api/filmes', async (req, res) => {
  const nome = textoObrigatorio(req.body.FIL_NOME, 'nome do filme', res);
  if (!nome) return;

  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!categoriaId) return;

  await executarAcao(
    res,
    `INSERT INTO FILMES (FIL_NOME, FIL_CAT_ID, FIL_DATA_CAD)
     VALUES (?, ?, NOW())`,
    [nome, categoriaId],
    'Filme cadastrado com sucesso.'
  );
});

app.put('/api/filmes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const nome = textoObrigatorio(req.body.FIL_NOME, 'nome do filme', res);
  if (!nome) return;

  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!categoriaId) return;

  await executarAcao(
    res,
    'UPDATE FILMES SET FIL_NOME = ?, FIL_CAT_ID = ? WHERE FIL_ID = ?',
    [nome, categoriaId, id],
    'Filme atualizado com sucesso.'
  );
});

app.delete('/api/filmes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  await executarAcao(res, 'DELETE FROM FILMES WHERE FIL_ID = ?', [id], 'Filme excluido com sucesso.');
});

// LOCACOES
app.get('/api/locacoes', async (req, res) => {
  await executarConsulta(
    res,
    `SELECT LOCACOES.LOC_ID,
            LOCACOES.LOC_CLI_ID,
            CLIENTES.CLI_NOME,
            LOCACOES.LOC_DATA_CAD
     FROM LOCACOES
     LEFT JOIN CLIENTES ON LOCACOES.LOC_CLI_ID = CLIENTES.CLI_ID
     ORDER BY LOCACOES.LOC_ID ASC`
  );
});

app.post('/api/locacoes', async (req, res) => {
  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!clienteId) return;

  await executarAcao(
    res,
    `INSERT INTO LOCACOES (LOC_CLI_ID, LOC_DATA_CAD)
     VALUES (?, NOW())`,
    [clienteId],
    'Locacao cadastrada com sucesso.'
  );
});

app.put('/api/locacoes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!clienteId) return;

  await executarAcao(
    res,
    'UPDATE LOCACOES SET LOC_CLI_ID = ? WHERE LOC_ID = ?',
    [clienteId, id],
    'Locacao atualizada com sucesso.'
  );
});

app.delete('/api/locacoes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  await executarAcao(res, 'DELETE FROM LOCACOES WHERE LOC_ID = ?', [id], 'Locacao excluida com sucesso.');
});

// ITENS
app.get('/api/itens', async (req, res) => {
  await executarConsulta(
    res,
    `SELECT ITENS.ITN_ID,
            ITENS.ITN_LOC_ID,
            ITENS.ITN_FIL_ID,
            LOCACOES.LOC_CLI_ID,
            CLIENTES.CLI_NOME,
            FILMES.FIL_NOME,
            ITENS.ITN_VALOR_LOC
     FROM ITENS
     LEFT JOIN LOCACOES ON ITENS.ITN_LOC_ID = LOCACOES.LOC_ID
     LEFT JOIN CLIENTES ON LOCACOES.LOC_CLI_ID = CLIENTES.CLI_ID
     LEFT JOIN FILMES ON ITENS.ITN_FIL_ID = FILMES.FIL_ID
     ORDER BY ITENS.ITN_ID ASC`
  );
});

app.post('/api/itens', async (req, res) => {
  const locacaoId = validarCampoId(req.body.ITN_LOC_ID, 'locacao', res);
  if (!locacaoId) return;

  const filmeId = validarCampoId(req.body.ITN_FIL_ID, 'filme', res);
  if (!filmeId) return;

  const valor = numeroPositivo(req.body.ITN_VALOR_LOC, 'valor da locacao', res);
  if (valor === null) return;

  await executarAcao(
    res,
    `INSERT INTO ITENS (ITN_LOC_ID, ITN_FIL_ID, ITN_VALOR_LOC)
     VALUES (?, ?, ?)`,
    [locacaoId, filmeId, valor],
    'Item cadastrado com sucesso.'
  );
});

app.put('/api/itens/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const locacaoId = validarCampoId(req.body.ITN_LOC_ID, 'locacao', res);
  if (!locacaoId) return;

  const filmeId = validarCampoId(req.body.ITN_FIL_ID, 'filme', res);
  if (!filmeId) return;

  const valor = numeroPositivo(req.body.ITN_VALOR_LOC, 'valor da locacao', res);
  if (valor === null) return;

  await executarAcao(
    res,
    `UPDATE ITENS
     SET ITN_LOC_ID = ?, ITN_FIL_ID = ?, ITN_VALOR_LOC = ?
     WHERE ITN_ID = ?`,
    [locacaoId, filmeId, valor, id],
    'Item atualizado com sucesso.'
  );
});

app.delete('/api/itens/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  await executarAcao(res, 'DELETE FROM ITENS WHERE ITN_ID = ?', [id], 'Item excluido com sucesso.');
});

// CONSULTAS E RELATORIOS
app.get('/api/locacoes/detalhes', async (req, res) => {
  await executarConsulta(
    res,
    `SELECT CLIENTES.CLI_ID,
            CLIENTES.CLI_NOME,
            CLIENTES.CLI_SALDO,
            LOCACOES.LOC_ID,
            LOCACOES.LOC_DATA_CAD,
            FILMES.FIL_NOME,
            CATEGORIAS.CAT_NOME,
            ITENS.ITN_VALOR_LOC
     FROM CLIENTES
     INNER JOIN LOCACOES ON CLIENTES.CLI_ID = LOCACOES.LOC_CLI_ID
     INNER JOIN ITENS ON LOCACOES.LOC_ID = ITENS.ITN_LOC_ID
     INNER JOIN FILMES ON FILMES.FIL_ID = ITENS.ITN_FIL_ID
     INNER JOIN CATEGORIAS ON CATEGORIAS.CAT_ID = FILMES.FIL_CAT_ID
     ORDER BY LOCACOES.LOC_ID ASC, FILMES.FIL_NOME ASC`
  );
});

app.get('/api/clientes/:id/locacoes', async (req, res) => {
  const clienteId = validarId(req, res);
  if (!clienteId) return;

  await executarConsulta(
    res,
    `SELECT CLIENTES.CLI_NOME,
            LOCACOES.LOC_ID,
            LOCACOES.LOC_DATA_CAD,
            FILMES.FIL_NOME,
            CATEGORIAS.CAT_NOME,
            ITENS.ITN_VALOR_LOC
     FROM CLIENTES
     INNER JOIN LOCACOES ON LOCACOES.LOC_CLI_ID = CLIENTES.CLI_ID
     INNER JOIN ITENS ON ITENS.ITN_LOC_ID = LOCACOES.LOC_ID
     INNER JOIN FILMES ON ITENS.ITN_FIL_ID = FILMES.FIL_ID
     INNER JOIN CATEGORIAS ON CATEGORIAS.CAT_ID = FILMES.FIL_CAT_ID
     WHERE CLIENTES.CLI_ID = ?
     ORDER BY LOCACOES.LOC_ID ASC, FILMES.FIL_NOME ASC`,
    [clienteId]
  );
});

function validarCampoId(valor, nomeCampo, res) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: `Informe um codigo de ${nomeCampo} valido.` });
    return null;
  }

  return id;
}

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
