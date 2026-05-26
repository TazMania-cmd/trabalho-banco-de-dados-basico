const path = require('path');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Aviso: configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no arquivo .env.local.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

app.use(express.json());
app.use('/_CSS', express.static(path.join(__dirname, '_CSS')));
app.use('/_JavaScript', express.static(path.join(__dirname, '_JavaScript')));
app.use('/_Imagens', express.static(path.join(__dirname, '_Imagens')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function responderErro(res, error, mensagem = 'Nao foi possivel acessar o banco de dados.') {
  console.error(mensagem, error);
  res.status(500).json({
    erro: mensagem,
    detalhe: error?.message || String(error)
  });
}

function validarId(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: 'Informe um codigo valido.' });
    return null;
  }

  return id;
}

function validarCampoId(valor, nomeCampo, res) {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: `Informe um codigo de ${nomeCampo} valido.` });
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

function clienteParaFront(row) {
  return {
    CLI_ID: row.cli_id,
    CLI_NOME: row.cli_nome,
    CLI_TELEFONE: row.cli_telefone,
    CLI_DATA_CAD: row.cli_data_cad,
    CLI_SALDO: row.cli_saldo
  };
}

function categoriaParaFront(row) {
  return {
    CAT_ID: row.cat_id,
    CAT_NOME: row.cat_nome,
    CAT_DATA_CAD: row.cat_data_cad
  };
}

function filmeParaFront(row, categorias = []) {
  const categoria = categorias.find(item => item.cat_id === row.fil_cat_id);

  return {
    FIL_ID: row.fil_id,
    FIL_NOME: row.fil_nome,
    FIL_CAT_ID: row.fil_cat_id,
    CAT_NOME: categoria?.cat_nome || row.cat_nome || '',
    FIL_DATA_CAD: row.fil_data_cad
  };
}

function locacaoParaFront(row, clientes = []) {
  const cliente = clientes.find(item => item.cli_id === row.loc_cli_id);

  return {
    LOC_ID: row.loc_id,
    LOC_CLI_ID: row.loc_cli_id,
    CLI_NOME: cliente?.cli_nome || row.cli_nome || '',
    LOC_DATA_CAD: row.loc_data_cad
  };
}

function itemParaFront(row, locacoes = [], clientes = [], filmes = []) {
  const locacao = locacoes.find(item => item.loc_id === row.itn_loc_id);
  const cliente = clientes.find(item => item.cli_id === locacao?.loc_cli_id);
  const filme = filmes.find(item => item.fil_id === row.itn_fil_id);

  return {
    ITN_ID: row.itn_id,
    ITN_LOC_ID: row.itn_loc_id,
    ITN_FIL_ID: row.itn_fil_id,
    LOC_CLI_ID: locacao?.loc_cli_id || '',
    CLI_NOME: cliente?.cli_nome || '',
    FIL_NOME: filme?.fil_nome || '',
    ITN_VALOR_LOC: row.itn_valor_loc
  };
}

async function listarTabela(tabela, ordem) {
  return supabase.from(tabela).select('*').order(ordem, { ascending: true });
}

async function carregarBaseRelacional() {
  const [clientes, categorias, filmes, locacoes, itens] = await Promise.all([
    listarTabela('clientes', 'cli_id'),
    listarTabela('categorias', 'cat_id'),
    listarTabela('filmes', 'fil_id'),
    listarTabela('locacoes', 'loc_id'),
    listarTabela('itens', 'itn_id')
  ]);

  const consultas = [clientes, categorias, filmes, locacoes, itens];
  const erro = consultas.find(consulta => consulta.error)?.error;
  if (erro) throw erro;

  return {
    clientes: clientes.data || [],
    categorias: categorias.data || [],
    filmes: filmes.data || [],
    locacoes: locacoes.data || [],
    itens: itens.data || []
  };
}

app.get('/api/status', async (req, res) => {
  const { error } = await supabase.from('clientes').select('cli_id').limit(1);

  if (error) {
    responderErro(res, error, 'Nao foi possivel conectar ao Supabase.');
    return;
  }

  res.json([{ conectado: 1 }]);
});

// CLIENTES
app.get('/api/clientes', async (req, res) => {
  const { data, error } = await listarTabela('clientes', 'cli_id');

  if (error) {
    responderErro(res, error, 'Nao foi possivel listar os clientes.');
    return;
  }

  res.json((data || []).map(clienteParaFront));
});

app.post('/api/clientes', async (req, res) => {
  const nome = textoObrigatorio(req.body.CLI_NOME, 'nome do cliente', res);
  if (!nome) return;

  const telefone = req.body.CLI_TELEFONE ? String(req.body.CLI_TELEFONE).trim() : null;
  const saldo = numeroPositivo(req.body.CLI_SALDO ?? 0, 'saldo', res);
  if (saldo === null) return;

  const { data, error } = await supabase
    .from('clientes')
    .insert({ cli_nome: nome, cli_telefone: telefone, cli_saldo: saldo })
    .select('cli_id')
    .single();

  if (error) {
    responderErro(res, error, 'Nao foi possivel cadastrar o cliente.');
    return;
  }

  res.json({ mensagem: 'Cliente cadastrado com sucesso.', insertId: data.cli_id, affectedRows: 1 });
});

app.put('/api/clientes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const nome = textoObrigatorio(req.body.CLI_NOME, 'nome do cliente', res);
  if (!nome) return;

  const telefone = req.body.CLI_TELEFONE ? String(req.body.CLI_TELEFONE).trim() : null;
  const saldo = numeroPositivo(req.body.CLI_SALDO ?? 0, 'saldo', res);
  if (saldo === null) return;

  const { error, count } = await supabase
    .from('clientes')
    .update({ cli_nome: nome, cli_telefone: telefone, cli_saldo: saldo }, { count: 'exact' })
    .eq('cli_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel atualizar o cliente.');
    return;
  }

  res.json({ mensagem: 'Cliente atualizado com sucesso.', affectedRows: count });
});

app.delete('/api/clientes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const { error, count } = await supabase
    .from('clientes')
    .delete({ count: 'exact' })
    .eq('cli_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel excluir o cliente.');
    return;
  }

  res.json({ mensagem: 'Cliente excluido com sucesso.', affectedRows: count });
});

// CATEGORIAS
app.get('/api/categorias', async (req, res) => {
  const { data, error } = await listarTabela('categorias', 'cat_id');

  if (error) {
    responderErro(res, error, 'Nao foi possivel listar as categorias.');
    return;
  }

  res.json((data || []).map(categoriaParaFront));
});

app.post('/api/categorias', async (req, res) => {
  const nome = textoObrigatorio(req.body.CAT_NOME, 'nome da categoria', res);
  if (!nome) return;

  const { data, error } = await supabase
    .from('categorias')
    .insert({ cat_nome: nome })
    .select('cat_id')
    .single();

  if (error) {
    responderErro(res, error, 'Nao foi possivel cadastrar a categoria.');
    return;
  }

  res.json({ mensagem: 'Categoria cadastrada com sucesso.', insertId: data.cat_id, affectedRows: 1 });
});

app.put('/api/categorias/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const nome = textoObrigatorio(req.body.CAT_NOME, 'nome da categoria', res);
  if (!nome) return;

  const { error, count } = await supabase
    .from('categorias')
    .update({ cat_nome: nome }, { count: 'exact' })
    .eq('cat_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel atualizar a categoria.');
    return;
  }

  res.json({ mensagem: 'Categoria atualizada com sucesso.', affectedRows: count });
});

app.delete('/api/categorias/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const { error, count } = await supabase
    .from('categorias')
    .delete({ count: 'exact' })
    .eq('cat_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel excluir a categoria.');
    return;
  }

  res.json({ mensagem: 'Categoria excluida com sucesso.', affectedRows: count });
});

// FILMES
app.get('/api/filmes', async (req, res) => {
  try {
    const { categorias, filmes } = await carregarBaseRelacional();
    res.json(filmes.map(filme => filmeParaFront(filme, categorias)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar os filmes.');
  }
});

app.post('/api/filmes', async (req, res) => {
  const nome = textoObrigatorio(req.body.FIL_NOME, 'nome do filme', res);
  if (!nome) return;

  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!categoriaId) return;

  const { data, error } = await supabase
    .from('filmes')
    .insert({ fil_nome: nome, fil_cat_id: categoriaId })
    .select('fil_id')
    .single();

  if (error) {
    responderErro(res, error, 'Nao foi possivel cadastrar o filme.');
    return;
  }

  res.json({ mensagem: 'Filme cadastrado com sucesso.', insertId: data.fil_id, affectedRows: 1 });
});

app.put('/api/filmes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const nome = textoObrigatorio(req.body.FIL_NOME, 'nome do filme', res);
  if (!nome) return;

  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!categoriaId) return;

  const { error, count } = await supabase
    .from('filmes')
    .update({ fil_nome: nome, fil_cat_id: categoriaId }, { count: 'exact' })
    .eq('fil_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel atualizar o filme.');
    return;
  }

  res.json({ mensagem: 'Filme atualizado com sucesso.', affectedRows: count });
});

app.delete('/api/filmes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const { error, count } = await supabase
    .from('filmes')
    .delete({ count: 'exact' })
    .eq('fil_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel excluir o filme.');
    return;
  }

  res.json({ mensagem: 'Filme excluido com sucesso.', affectedRows: count });
});

// LOCACOES
app.get('/api/locacoes', async (req, res) => {
  try {
    const { clientes, locacoes } = await carregarBaseRelacional();
    res.json(locacoes.map(locacao => locacaoParaFront(locacao, clientes)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar as locacoes.');
  }
});

app.post('/api/locacoes', async (req, res) => {
  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!clienteId) return;

  const { data, error } = await supabase
    .from('locacoes')
    .insert({ loc_cli_id: clienteId })
    .select('loc_id')
    .single();

  if (error) {
    responderErro(res, error, 'Nao foi possivel cadastrar a locacao.');
    return;
  }

  res.json({ mensagem: 'Locacao cadastrada com sucesso.', insertId: data.loc_id, affectedRows: 1 });
});

app.put('/api/locacoes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!clienteId) return;

  const { error, count } = await supabase
    .from('locacoes')
    .update({ loc_cli_id: clienteId }, { count: 'exact' })
    .eq('loc_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel atualizar a locacao.');
    return;
  }

  res.json({ mensagem: 'Locacao atualizada com sucesso.', affectedRows: count });
});

app.delete('/api/locacoes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const { error, count } = await supabase
    .from('locacoes')
    .delete({ count: 'exact' })
    .eq('loc_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel excluir a locacao.');
    return;
  }

  res.json({ mensagem: 'Locacao excluida com sucesso.', affectedRows: count });
});

// ITENS
app.get('/api/itens', async (req, res) => {
  try {
    const { clientes, filmes, locacoes, itens } = await carregarBaseRelacional();
    res.json(itens.map(item => itemParaFront(item, locacoes, clientes, filmes)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar os itens.');
  }
});

app.post('/api/itens', async (req, res) => {
  const locacaoId = validarCampoId(req.body.ITN_LOC_ID, 'locacao', res);
  if (!locacaoId) return;

  const filmeId = validarCampoId(req.body.ITN_FIL_ID, 'filme', res);
  if (!filmeId) return;

  const valor = numeroPositivo(req.body.ITN_VALOR_LOC, 'valor da locacao', res);
  if (valor === null) return;

  const { data, error } = await supabase
    .from('itens')
    .insert({ itn_loc_id: locacaoId, itn_fil_id: filmeId, itn_valor_loc: valor })
    .select('itn_id')
    .single();

  if (error) {
    responderErro(res, error, 'Nao foi possivel cadastrar o item.');
    return;
  }

  res.json({ mensagem: 'Item cadastrado com sucesso.', insertId: data.itn_id, affectedRows: 1 });
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

  const { error, count } = await supabase
    .from('itens')
    .update({ itn_loc_id: locacaoId, itn_fil_id: filmeId, itn_valor_loc: valor }, { count: 'exact' })
    .eq('itn_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel atualizar o item.');
    return;
  }

  res.json({ mensagem: 'Item atualizado com sucesso.', affectedRows: count });
});

app.delete('/api/itens/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  const { error, count } = await supabase
    .from('itens')
    .delete({ count: 'exact' })
    .eq('itn_id', id);

  if (error) {
    responderErro(res, error, 'Nao foi possivel excluir o item.');
    return;
  }

  res.json({ mensagem: 'Item excluido com sucesso.', affectedRows: count });
});

// CONSULTAS E RELATORIOS
app.get('/api/locacoes/detalhes', async (req, res) => {
  try {
    const { clientes, categorias, filmes, locacoes, itens } = await carregarBaseRelacional();

    const relatorio = itens.map(item => {
      const locacao = locacoes.find(loc => loc.loc_id === item.itn_loc_id);
      const cliente = clientes.find(cli => cli.cli_id === locacao?.loc_cli_id);
      const filme = filmes.find(fil => fil.fil_id === item.itn_fil_id);
      const categoria = categorias.find(cat => cat.cat_id === filme?.fil_cat_id);

      return {
        CLI_ID: cliente?.cli_id || '',
        CLI_NOME: cliente?.cli_nome || '',
        CLI_SALDO: cliente?.cli_saldo || '',
        LOC_ID: locacao?.loc_id || '',
        LOC_DATA_CAD: locacao?.loc_data_cad || '',
        FIL_NOME: filme?.fil_nome || '',
        CAT_NOME: categoria?.cat_nome || '',
        ITN_VALOR_LOC: item.itn_valor_loc
      };
    });

    res.json(relatorio.sort((a, b) => Number(a.LOC_ID) - Number(b.LOC_ID)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel gerar o relatorio.');
  }
});

app.get('/api/clientes/:id/locacoes', async (req, res) => {
  const clienteId = validarId(req, res);
  if (!clienteId) return;

  try {
    const { clientes, categorias, filmes, locacoes, itens } = await carregarBaseRelacional();
    const cliente = clientes.find(cli => cli.cli_id === clienteId);
    const locacoesCliente = locacoes.filter(loc => loc.loc_cli_id === clienteId);
    const idsLocacoes = locacoesCliente.map(loc => loc.loc_id);

    const resultado = itens
      .filter(item => idsLocacoes.includes(item.itn_loc_id))
      .map(item => {
        const locacao = locacoes.find(loc => loc.loc_id === item.itn_loc_id);
        const filme = filmes.find(fil => fil.fil_id === item.itn_fil_id);
        const categoria = categorias.find(cat => cat.cat_id === filme?.fil_cat_id);

        return {
          CLI_NOME: cliente?.cli_nome || '',
          LOC_ID: locacao?.loc_id || '',
          LOC_DATA_CAD: locacao?.loc_data_cad || '',
          FIL_NOME: filme?.fil_nome || '',
          CAT_NOME: categoria?.cat_nome || '',
          ITN_VALOR_LOC: item.itn_valor_loc
        };
      });

    res.json(resultado.sort((a, b) => Number(a.LOC_ID) - Number(b.LOC_ID)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar as locacoes do cliente.');
  }
});

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
