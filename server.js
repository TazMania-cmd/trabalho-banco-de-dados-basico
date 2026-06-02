const path = require('path');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

['.env.local', '.env', '.env.example'].forEach(envFile => {
  require('dotenv').config({ path: path.join(__dirname, envFile), override: false });
});

const app = express();
const port = Number(process.env.PORT) || 3000;
const valorMultaPorDia = Number(process.env.VALOR_MULTA_DIA) || 2;

function obterVariavelAmbiente(...nomes) {
  for (const nome of nomes) {
    const valor = process.env[nome];
    if (valor && String(valor).trim() !== '') return String(valor).trim();
  }

  return '';
}

const supabaseUrl = obterVariavelAmbiente('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = obterVariavelAmbiente(
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
);

if (!supabaseUrl || !supabaseKey) {
  console.warn('Aviso: configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.local, .env ou .env.example.');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  : null;

app.use(express.json());
app.use('/_CSS', express.static(path.join(__dirname, '_CSS')));
app.use('/_JavaScript', express.static(path.join(__dirname, '_JavaScript')));
app.use('/_Imagens', express.static(path.join(__dirname, '_Imagens')));

app.use('/api', (req, res, next) => {
  if (!supabase) {
    res.status(500).json({
      erro: 'Supabase nao configurado.',
      detalhe: 'Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env.local, .env ou .env.example.'
    });
    return;
  }

  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

[
  'clientes.html',
  'categorias.html',
  'filmes.html',
  'exemplares.html',
  'locacoes.html',
  'itens.html',
  'pagamentos.html',
  'relatorios.html'
].forEach(arquivo => {
  app.get(`/${arquivo}`, (req, res) => {
    res.sendFile(path.join(__dirname, arquivo));
  });
});

function responderErro(res, error, mensagem = 'Nao foi possivel acessar o banco de dados.') {
  console.error(mensagem, error);
  res.status(500).json({ erro: mensagem, detalhe: error?.message || String(error) });
}

function erroValidacao(res, mensagem) {
  res.status(400).json({ erro: mensagem });
  return null;
}

function validarId(req, res) {
  return validarCampoId(req.params.id, 'registro', res);
}

function validarCampoId(valor, nomeCampo, res, obrigatorio = true) {
  if ((valor === undefined || valor === null || valor === '') && !obrigatorio) return null;

  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    return erroValidacao(res, `Informe um codigo de ${nomeCampo} valido.`);
  }

  return id;
}

function textoObrigatorio(valor, nomeCampo, res, limite = 150) {
  const texto = valor === undefined || valor === null ? '' : String(valor).trim();
  if (!texto) return erroValidacao(res, `O campo ${nomeCampo} e obrigatorio.`);
  if (texto.length > limite) return erroValidacao(res, `O campo ${nomeCampo} deve ter no maximo ${limite} caracteres.`);
  return texto;
}

function textoOpcional(valor, limite = 200) {
  if (valor === undefined || valor === null || valor === '') return null;
  return String(valor).trim().slice(0, limite);
}

function numeroPositivo(valor, nomeCampo, res, obrigatorio = true) {
  if ((valor === undefined || valor === null || valor === '') && !obrigatorio) return null;

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    return erroValidacao(res, `O campo ${nomeCampo} deve ser um numero positivo.`);
  }

  return Number(numero.toFixed(2));
}

function inteiroPositivo(valor, nomeCampo, res, obrigatorio = true) {
  if ((valor === undefined || valor === null || valor === '') && !obrigatorio) return null;

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero <= 0) {
    return erroValidacao(res, `O campo ${nomeCampo} deve ser um numero inteiro positivo.`);
  }

  return numero;
}

function dataObrigatoria(valor, nomeCampo, res) {
  if (!valor) return erroValidacao(res, `O campo ${nomeCampo} e obrigatorio.`);
  const data = new Date(`${valor}T00:00:00`);
  if (Number.isNaN(data.getTime())) return erroValidacao(res, `Informe uma data valida para ${nomeCampo}.`);
  return valor;
}

function normalizarStatus(valor, permitidos, padrao) {
  const status = String(valor || padrao).trim().toUpperCase();
  return permitidos.includes(status) ? status : padrao;
}

function diasAtraso(dataPrevista) {
  const prevista = new Date(`${String(dataPrevista).slice(0, 10)}T00:00:00`);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((hoje - prevista) / 86400000));
}

async function listarTabela(tabela, ordem) {
  return supabase.from(tabela).select('*').order(ordem, { ascending: true });
}

async function buscarPorId(tabela, coluna, id) {
  return supabase.from(tabela).select('*').eq(coluna, id).maybeSingle();
}

async function carregarBaseRelacional() {
  const consultas = await Promise.all([
    listarTabela('clientes', 'cli_id'),
    listarTabela('categorias', 'cat_id'),
    listarTabela('filmes', 'fil_id'),
    listarTabela('exemplares', 'exa_id'),
    listarTabela('locacoes', 'loc_id'),
    listarTabela('itens', 'itn_id'),
    listarTabela('pagamentos', 'pag_id')
  ]);

  const erro = consultas.find(consulta => consulta.error)?.error;
  if (erro) throw erro;

  return {
    clientes: consultas[0].data || [],
    categorias: consultas[1].data || [],
    filmes: consultas[2].data || [],
    exemplares: consultas[3].data || [],
    locacoes: consultas[4].data || [],
    itens: consultas[5].data || [],
    pagamentos: consultas[6].data || []
  };
}

function clienteParaFront(row) {
  return {
    CLI_ID: row.cli_id,
    CLI_NOME: row.cli_nome,
    CLI_DOCUMENTO: row.cli_documento,
    CLI_EMAIL: row.cli_email,
    CLI_TELEFONE: row.cli_telefone,
    CLI_DATA_CAD: row.cli_data_cad,
    CLI_SALDO: row.cli_saldo,
    CLI_ATIVO: row.cli_ativo ? 'SIM' : 'NAO'
  };
}

function categoriaParaFront(row) {
  return { CAT_ID: row.cat_id, CAT_NOME: row.cat_nome, CAT_DATA_CAD: row.cat_data_cad };
}

function filmeParaFront(row, categorias = [], exemplares = []) {
  const categoria = categorias.find(item => item.cat_id === row.fil_cat_id);
  const doFilme = exemplares.filter(item => item.exa_fil_id === row.fil_id);
  const disponiveis = doFilme.filter(item => item.exa_status === 'DISPONIVEL').length;
  const alugados = doFilme.filter(item => item.exa_status === 'ALUGADO').length;

  return {
    FIL_ID: row.fil_id,
    FIL_NOME: row.fil_nome,
    FIL_CAT_ID: row.fil_cat_id,
    CAT_NOME: categoria?.cat_nome || row.cat_nome || '',
    FIL_ANO: row.fil_ano,
    FIL_CLASSIFICACAO: row.fil_classificacao,
    FIL_DURACAO_MIN: row.fil_duracao_min,
    FIL_VALOR_PADRAO: row.fil_valor_padrao,
    QTD_DISPONIVEL: disponiveis,
    QTD_ALUGADA: alugados,
    FIL_ATIVO: row.fil_ativo ? 'SIM' : 'NAO',
    FIL_DATA_CAD: row.fil_data_cad
  };
}

function exemplarParaFront(row, filmes = []) {
  const filme = filmes.find(item => item.fil_id === row.exa_fil_id);
  return {
    EXA_ID: row.exa_id,
    EXA_FIL_ID: row.exa_fil_id,
    FIL_NOME: filme?.fil_nome || '',
    EXA_CODIGO: row.exa_codigo,
    EXA_TIPO: row.exa_tipo,
    EXA_STATUS: row.exa_status,
    EXA_DATA_CAD: row.exa_data_cad
  };
}

function locacaoParaFront(row, clientes = []) {
  const cliente = clientes.find(item => item.cli_id === row.loc_cli_id);
  return {
    LOC_ID: row.loc_id,
    LOC_CLI_ID: row.loc_cli_id,
    CLI_NOME: cliente?.cli_nome || row.cli_nome || '',
    LOC_DATA_CAD: row.loc_data_cad,
    LOC_DATA_PREVISTA: row.loc_data_prevista,
    LOC_DATA_DEVOLUCAO: row.loc_data_devolucao,
    LOC_STATUS: row.loc_status,
    LOC_VALOR_TOTAL: row.loc_valor_total,
    LOC_MULTA_TOTAL: row.loc_multa_total,
    LOC_PAGO_TOTAL: row.loc_pago_total,
    SALDO_DEVEDOR: Number(row.loc_valor_total || 0) + Number(row.loc_multa_total || 0) - Number(row.loc_pago_total || 0)
  };
}

function itemParaFront(row, locacoes = [], clientes = [], filmes = [], exemplares = []) {
  const locacao = locacoes.find(item => item.loc_id === row.itn_loc_id);
  const cliente = clientes.find(item => item.cli_id === locacao?.loc_cli_id);
  const filme = filmes.find(item => item.fil_id === row.itn_fil_id);
  const exemplar = exemplares.find(item => item.exa_id === row.itn_exa_id);

  return {
    ITN_ID: row.itn_id,
    ITN_LOC_ID: row.itn_loc_id,
    ITN_FIL_ID: row.itn_fil_id,
    ITN_EXA_ID: row.itn_exa_id,
    LOC_CLI_ID: locacao?.loc_cli_id || '',
    CLI_NOME: cliente?.cli_nome || '',
    FIL_NOME: filme?.fil_nome || '',
    EXA_CODIGO: exemplar?.exa_codigo || '',
    ITN_VALOR_LOC: row.itn_valor_loc,
    ITN_VALOR_MULTA: row.itn_valor_multa,
    ITN_DATA_DEVOLUCAO: row.itn_data_devolucao,
    ITN_STATUS: row.itn_status
  };
}

function pagamentoParaFront(row, locacoes = [], clientes = []) {
  const locacao = locacoes.find(item => item.loc_id === row.pag_loc_id);
  const cliente = clientes.find(item => item.cli_id === locacao?.loc_cli_id);
  return {
    PAG_ID: row.pag_id,
    PAG_LOC_ID: row.pag_loc_id,
    CLI_NOME: cliente?.cli_nome || '',
    PAG_VALOR: row.pag_valor,
    PAG_FORMA: row.pag_forma,
    PAG_DATA: row.pag_data,
    PAG_OBSERVACAO: row.pag_observacao
  };
}

async function atualizarTotalLocacao(locacaoId) {
  const [itens, pagamentos] = await Promise.all([
    supabase.from('itens').select('itn_valor_loc,itn_valor_multa').eq('itn_loc_id', locacaoId),
    supabase.from('pagamentos').select('pag_valor').eq('pag_loc_id', locacaoId)
  ]);

  if (itens.error) throw itens.error;
  if (pagamentos.error) throw pagamentos.error;

  const valorTotal = (itens.data || []).reduce((total, item) => total + Number(item.itn_valor_loc || 0), 0);
  const multaTotal = (itens.data || []).reduce((total, item) => total + Number(item.itn_valor_multa || 0), 0);
  const pagoTotal = (pagamentos.data || []).reduce((total, item) => total + Number(item.pag_valor || 0), 0);

  const { error } = await supabase
    .from('locacoes')
    .update({
      loc_valor_total: Number(valorTotal.toFixed(2)),
      loc_multa_total: Number(multaTotal.toFixed(2)),
      loc_pago_total: Number(pagoTotal.toFixed(2))
    })
    .eq('loc_id', locacaoId);

  if (error) throw error;
}

app.get('/api/status', async (req, res) => {
  const { error } = await supabase.from('clientes').select('cli_id').limit(1);
  if (error) return responderErro(res, error, 'Nao foi possivel conectar ao Supabase.');
  res.json([{ conectado: 1 }]);
});

app.get('/api/clientes', async (req, res) => {
  const { data, error } = await listarTabela('clientes', 'cli_id');
  if (error) return responderErro(res, error, 'Nao foi possivel listar os clientes.');
  res.json((data || []).map(clienteParaFront));
});

app.post('/api/clientes', async (req, res) => {
  const nome = textoObrigatorio(req.body.CLI_NOME, 'nome do cliente', res, 80);
  if (!nome) return;
  const saldo = numeroPositivo(req.body.CLI_SALDO ?? 0, 'saldo', res);
  if (saldo === null) return;

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      cli_nome: nome,
      cli_documento: textoOpcional(req.body.CLI_DOCUMENTO, 20),
      cli_email: textoOpcional(req.body.CLI_EMAIL, 120),
      cli_telefone: textoOpcional(req.body.CLI_TELEFONE, 25),
      cli_saldo: saldo,
      cli_ativo: req.body.CLI_ATIVO === undefined ? true : String(req.body.CLI_ATIVO).toUpperCase() !== 'NAO'
    })
    .select('cli_id')
    .single();

  if (error) return responderErro(res, error, 'Nao foi possivel cadastrar o cliente.');
  res.json({ mensagem: 'Cliente cadastrado com sucesso.', insertId: data.cli_id, affectedRows: 1 });
});

app.put('/api/clientes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const nome = textoObrigatorio(req.body.CLI_NOME, 'nome do cliente', res, 80);
  if (!nome) return;
  const saldo = numeroPositivo(req.body.CLI_SALDO ?? 0, 'saldo', res);
  if (saldo === null) return;

  const { error, count } = await supabase
    .from('clientes')
    .update({
      cli_nome: nome,
      cli_documento: textoOpcional(req.body.CLI_DOCUMENTO, 20),
      cli_email: textoOpcional(req.body.CLI_EMAIL, 120),
      cli_telefone: textoOpcional(req.body.CLI_TELEFONE, 25),
      cli_saldo: saldo,
      cli_ativo: req.body.CLI_ATIVO === undefined ? true : String(req.body.CLI_ATIVO).toUpperCase() !== 'NAO'
    }, { count: 'exact' })
    .eq('cli_id', id);

  if (error) return responderErro(res, error, 'Nao foi possivel atualizar o cliente.');
  res.json({ mensagem: 'Cliente atualizado com sucesso.', affectedRows: count });
});

app.delete('/api/clientes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const { error, count } = await supabase.from('clientes').delete({ count: 'exact' }).eq('cli_id', id);
  if (error) return responderErro(res, error, 'Nao foi possivel excluir o cliente.');
  res.json({ mensagem: 'Cliente excluido com sucesso.', affectedRows: count });
});

app.get('/api/categorias', async (req, res) => {
  const { data, error } = await listarTabela('categorias', 'cat_id');
  if (error) return responderErro(res, error, 'Nao foi possivel listar as categorias.');
  res.json((data || []).map(categoriaParaFront));
});

app.post('/api/categorias', async (req, res) => {
  const nome = textoObrigatorio(req.body.CAT_NOME, 'nome da categoria', res);
  if (!nome) return;
  const { data, error } = await supabase.from('categorias').insert({ cat_nome: nome }).select('cat_id').single();
  if (error) return responderErro(res, error, 'Nao foi possivel cadastrar a categoria.');
  res.json({ mensagem: 'Categoria cadastrada com sucesso.', insertId: data.cat_id, affectedRows: 1 });
});

app.put('/api/categorias/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const nome = textoObrigatorio(req.body.CAT_NOME, 'nome da categoria', res);
  if (!nome) return;
  const { error, count } = await supabase.from('categorias').update({ cat_nome: nome }, { count: 'exact' }).eq('cat_id', id);
  if (error) return responderErro(res, error, 'Nao foi possivel atualizar a categoria.');
  res.json({ mensagem: 'Categoria atualizada com sucesso.', affectedRows: count });
});

app.delete('/api/categorias/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const { error, count } = await supabase.from('categorias').delete({ count: 'exact' }).eq('cat_id', id);
  if (error) return responderErro(res, error, 'Nao foi possivel excluir a categoria.');
  res.json({ mensagem: 'Categoria excluida com sucesso.', affectedRows: count });
});

app.get('/api/filmes', async (req, res) => {
  try {
    const { categorias, filmes, exemplares } = await carregarBaseRelacional();
    res.json(filmes.map(filme => filmeParaFront(filme, categorias, exemplares)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar os filmes.');
  }
});

app.post('/api/filmes', async (req, res) => {
  const nome = textoObrigatorio(req.body.FIL_NOME, 'nome do filme', res);
  if (!nome) return;
  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!categoriaId) return;
  const valor = numeroPositivo(req.body.FIL_VALOR_PADRAO ?? 10, 'valor padrao', res);
  if (valor === null) return;
  const ano = inteiroPositivo(req.body.FIL_ANO, 'ano', res, false);
  if (ano === null && req.body.FIL_ANO) return;
  const duracao = inteiroPositivo(req.body.FIL_DURACAO_MIN, 'duracao', res, false);
  if (duracao === null && req.body.FIL_DURACAO_MIN) return;

  const { data, error } = await supabase
    .from('filmes')
    .insert({
      fil_nome: nome,
      fil_cat_id: categoriaId,
      fil_ano: ano,
      fil_classificacao: textoOpcional(req.body.FIL_CLASSIFICACAO, 10),
      fil_duracao_min: duracao,
      fil_valor_padrao: valor,
      fil_ativo: req.body.FIL_ATIVO === undefined ? true : String(req.body.FIL_ATIVO).toUpperCase() !== 'NAO'
    })
    .select('fil_id')
    .single();

  if (error) return responderErro(res, error, 'Nao foi possivel cadastrar o filme.');
  res.json({ mensagem: 'Filme cadastrado com sucesso.', insertId: data.fil_id, affectedRows: 1 });
});

app.put('/api/filmes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const nome = textoObrigatorio(req.body.FIL_NOME, 'nome do filme', res);
  if (!nome) return;
  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!categoriaId) return;
  const valor = numeroPositivo(req.body.FIL_VALOR_PADRAO ?? 10, 'valor padrao', res);
  if (valor === null) return;
  const ano = inteiroPositivo(req.body.FIL_ANO, 'ano', res, false);
  if (ano === null && req.body.FIL_ANO) return;
  const duracao = inteiroPositivo(req.body.FIL_DURACAO_MIN, 'duracao', res, false);
  if (duracao === null && req.body.FIL_DURACAO_MIN) return;

  const { error, count } = await supabase
    .from('filmes')
    .update({
      fil_nome: nome,
      fil_cat_id: categoriaId,
      fil_ano: ano,
      fil_classificacao: textoOpcional(req.body.FIL_CLASSIFICACAO, 10),
      fil_duracao_min: duracao,
      fil_valor_padrao: valor,
      fil_ativo: req.body.FIL_ATIVO === undefined ? true : String(req.body.FIL_ATIVO).toUpperCase() !== 'NAO'
    }, { count: 'exact' })
    .eq('fil_id', id);

  if (error) return responderErro(res, error, 'Nao foi possivel atualizar o filme.');
  res.json({ mensagem: 'Filme atualizado com sucesso.', affectedRows: count });
});

app.delete('/api/filmes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const { error, count } = await supabase.from('filmes').delete({ count: 'exact' }).eq('fil_id', id);
  if (error) return responderErro(res, error, 'Nao foi possivel excluir o filme.');
  res.json({ mensagem: 'Filme excluido com sucesso.', affectedRows: count });
});

app.get('/api/exemplares', async (req, res) => {
  try {
    const { filmes, exemplares } = await carregarBaseRelacional();
    res.json(exemplares.map(exemplar => exemplarParaFront(exemplar, filmes)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar os exemplares.');
  }
});

app.post('/api/exemplares', async (req, res) => {
  const filmeId = validarCampoId(req.body.EXA_FIL_ID, 'filme', res);
  if (!filmeId) return;
  const codigo = textoObrigatorio(req.body.EXA_CODIGO, 'codigo do exemplar', res, 30);
  if (!codigo) return;
  const tipo = normalizarStatus(req.body.EXA_TIPO, ['FISICO', 'DIGITAL'], 'FISICO');
  const status = normalizarStatus(req.body.EXA_STATUS, ['DISPONIVEL', 'ALUGADO', 'MANUTENCAO', 'INATIVO'], 'DISPONIVEL');

  const { data, error } = await supabase
    .from('exemplares')
    .insert({ exa_fil_id: filmeId, exa_codigo: codigo, exa_tipo: tipo, exa_status: status })
    .select('exa_id')
    .single();

  if (error) return responderErro(res, error, 'Nao foi possivel cadastrar o exemplar.');
  res.json({ mensagem: 'Exemplar cadastrado com sucesso.', insertId: data.exa_id, affectedRows: 1 });
});

app.put('/api/exemplares/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const filmeId = validarCampoId(req.body.EXA_FIL_ID, 'filme', res);
  if (!filmeId) return;
  const codigo = textoObrigatorio(req.body.EXA_CODIGO, 'codigo do exemplar', res, 30);
  if (!codigo) return;

  const { error, count } = await supabase
    .from('exemplares')
    .update({
      exa_fil_id: filmeId,
      exa_codigo: codigo,
      exa_tipo: normalizarStatus(req.body.EXA_TIPO, ['FISICO', 'DIGITAL'], 'FISICO'),
      exa_status: normalizarStatus(req.body.EXA_STATUS, ['DISPONIVEL', 'ALUGADO', 'MANUTENCAO', 'INATIVO'], 'DISPONIVEL')
    }, { count: 'exact' })
    .eq('exa_id', id);

  if (error) return responderErro(res, error, 'Nao foi possivel atualizar o exemplar.');
  res.json({ mensagem: 'Exemplar atualizado com sucesso.', affectedRows: count });
});

app.delete('/api/exemplares/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const { data: exemplar, error: buscaErro } = await buscarPorId('exemplares', 'exa_id', id);
  if (buscaErro) return responderErro(res, buscaErro, 'Nao foi possivel localizar o exemplar.');
  if (exemplar?.exa_status === 'ALUGADO') return erroValidacao(res, 'Nao e possivel excluir exemplar alugado.');

  const { error, count } = await supabase.from('exemplares').delete({ count: 'exact' }).eq('exa_id', id);
  if (error) return responderErro(res, error, 'Nao foi possivel excluir o exemplar.');
  res.json({ mensagem: 'Exemplar excluido com sucesso.', affectedRows: count });
});

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
  const dataPrevista = dataObrigatoria(req.body.LOC_DATA_PREVISTA, 'data prevista de devolucao', res);
  if (!dataPrevista) return;
  const status = normalizarStatus(req.body.LOC_STATUS, ['ABERTA', 'DEVOLVIDA', 'CANCELADA'], 'ABERTA');

  const { data, error } = await supabase
    .from('locacoes')
    .insert({
      loc_cli_id: clienteId,
      loc_data_prevista: dataPrevista,
      loc_status: status,
      loc_data_devolucao: status === 'DEVOLVIDA' ? new Date().toISOString() : null
    })
    .select('loc_id')
    .single();

  if (error) return responderErro(res, error, 'Nao foi possivel cadastrar a locacao.');
  res.json({ mensagem: 'Locacao cadastrada com sucesso.', insertId: data.loc_id, affectedRows: 1 });
});

app.put('/api/locacoes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!clienteId) return;
  const dataPrevista = dataObrigatoria(req.body.LOC_DATA_PREVISTA, 'data prevista de devolucao', res);
  if (!dataPrevista) return;
  const status = normalizarStatus(req.body.LOC_STATUS, ['ABERTA', 'DEVOLVIDA', 'CANCELADA'], 'ABERTA');

  const { data: locacao, error: buscaErro } = await buscarPorId('locacoes', 'loc_id', id);
  if (buscaErro) return responderErro(res, buscaErro, 'Nao foi possivel localizar a locacao.');
  if (!locacao) return erroValidacao(res, 'Locacao nao encontrada.');

  const { error, count } = await supabase
    .from('locacoes')
    .update({
      loc_cli_id: clienteId,
      loc_data_prevista: dataPrevista,
      loc_status: status,
      loc_data_devolucao: status === 'DEVOLVIDA'
        ? (locacao.loc_data_devolucao || new Date().toISOString())
        : null
    }, { count: 'exact' })
    .eq('loc_id', id);

  if (error) return responderErro(res, error, 'Nao foi possivel atualizar a locacao.');
  res.json({ mensagem: 'Locacao atualizada com sucesso.', affectedRows: count });
});

app.delete('/api/locacoes/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const { data: itens, error: erroItens } = await supabase.from('itens').select('itn_id').eq('itn_loc_id', id).limit(1);
  if (erroItens) return responderErro(res, erroItens, 'Nao foi possivel verificar itens da locacao.');
  if ((itens || []).length) return erroValidacao(res, 'Nao e possivel excluir locacao com itens. Remova os itens primeiro.');

  const { error, count } = await supabase.from('locacoes').delete({ count: 'exact' }).eq('loc_id', id);
  if (error) return responderErro(res, error, 'Nao foi possivel excluir a locacao.');
  res.json({ mensagem: 'Locacao excluida com sucesso.', affectedRows: count });
});

app.post('/api/locacoes/:id/devolver', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  try {
    const { data: locacao, error: locacaoErro } = await buscarPorId('locacoes', 'loc_id', id);
    if (locacaoErro) throw locacaoErro;
    if (!locacao) return erroValidacao(res, 'Locacao nao encontrada.');
    if (locacao.loc_status !== 'ABERTA') return erroValidacao(res, 'Esta locacao ja foi devolvida ou cancelada.');

    const { data: itens, error: itensErro } = await supabase.from('itens').select('*').eq('itn_loc_id', id);
    if (itensErro) throw itensErro;
    if (!(itens || []).length) return erroValidacao(res, 'Nao e possivel devolver locacao sem itens.');

    const atraso = diasAtraso(locacao.loc_data_prevista);
    const multaPorItem = Number((atraso * valorMultaPorDia).toFixed(2));

    for (const item of itens) {
      if (item.itn_status === 'ALUGADO') {
        const { error: itemErro } = await supabase
          .from('itens')
          .update({
            itn_status: 'DEVOLVIDO',
            itn_data_devolucao: new Date().toISOString(),
            itn_valor_multa: multaPorItem
          })
          .eq('itn_id', item.itn_id);
        if (itemErro) throw itemErro;

        const { error: exemplarErro } = await supabase
          .from('exemplares')
          .update({ exa_status: 'DISPONIVEL' })
          .eq('exa_id', item.itn_exa_id);
        if (exemplarErro) throw exemplarErro;
      }
    }

    const { error: locacaoUpdateErro } = await supabase
      .from('locacoes')
      .update({ loc_status: 'DEVOLVIDA', loc_data_devolucao: new Date().toISOString() })
      .eq('loc_id', id);
    if (locacaoUpdateErro) throw locacaoUpdateErro;

    await atualizarTotalLocacao(id);
    res.json({ mensagem: 'Locacao devolvida com sucesso.', diasAtraso: atraso, multaPorItem, affectedRows: 1 });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel registrar a devolucao.');
  }
});

app.get('/api/itens', async (req, res) => {
  try {
    const { clientes, filmes, exemplares, locacoes, itens } = await carregarBaseRelacional();
    res.json(itens.map(item => itemParaFront(item, locacoes, clientes, filmes, exemplares)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar os itens.');
  }
});

app.post('/api/itens', async (req, res) => {
  const locacaoId = validarCampoId(req.body.ITN_LOC_ID, 'locacao', res);
  if (!locacaoId) return;
  const exemplarId = validarCampoId(req.body.ITN_EXA_ID || req.body.ITN_FIL_ID, 'exemplar', res);
  if (!exemplarId) return;
  const valor = numeroPositivo(req.body.ITN_VALOR_LOC, 'valor da locacao', res);
  if (valor === null) return;

  try {
    const { data: locacao, error: locacaoErro } = await buscarPorId('locacoes', 'loc_id', locacaoId);
    if (locacaoErro) throw locacaoErro;
    if (!locacao) return erroValidacao(res, 'Locacao nao encontrada.');
    if (locacao.loc_status !== 'ABERTA') return erroValidacao(res, 'Somente locacoes abertas podem receber itens.');

    const { data: exemplar, error: exemplarErro } = await buscarPorId('exemplares', 'exa_id', exemplarId);
    if (exemplarErro) throw exemplarErro;
    if (!exemplar) return erroValidacao(res, 'Exemplar nao encontrado.');
    if (exemplar.exa_status !== 'DISPONIVEL') return erroValidacao(res, 'Este exemplar nao esta disponivel para locacao.');

    const { data, error } = await supabase
      .from('itens')
      .insert({
        itn_loc_id: locacaoId,
        itn_fil_id: exemplar.exa_fil_id,
        itn_exa_id: exemplar.exa_id,
        itn_valor_loc: valor,
        itn_status: 'ALUGADO'
      })
      .select('itn_id')
      .single();
    if (error) throw error;

    const { error: statusErro } = await supabase.from('exemplares').update({ exa_status: 'ALUGADO' }).eq('exa_id', exemplar.exa_id);
    if (statusErro) throw statusErro;

    await atualizarTotalLocacao(locacaoId);
    res.json({ mensagem: 'Item cadastrado e exemplar marcado como alugado.', insertId: data.itn_id, affectedRows: 1 });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel cadastrar o item.');
  }
});

app.put('/api/itens/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const valor = numeroPositivo(req.body.ITN_VALOR_LOC, 'valor da locacao', res);
  if (valor === null) return;

  try {
    const { data: item, error: buscaErro } = await buscarPorId('itens', 'itn_id', id);
    if (buscaErro) throw buscaErro;
    if (!item) return erroValidacao(res, 'Item nao encontrado.');
    if (item.itn_status !== 'ALUGADO') return erroValidacao(res, 'Somente itens alugados podem ser editados.');

    const { error, count } = await supabase.from('itens').update({ itn_valor_loc: valor }, { count: 'exact' }).eq('itn_id', id);
    if (error) throw error;

    await atualizarTotalLocacao(item.itn_loc_id);
    res.json({ mensagem: 'Item atualizado com sucesso.', affectedRows: count });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel atualizar o item.');
  }
});

app.delete('/api/itens/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  try {
    const { data: item, error: buscaErro } = await buscarPorId('itens', 'itn_id', id);
    if (buscaErro) throw buscaErro;
    if (!item) return erroValidacao(res, 'Item nao encontrado.');
    if (item.itn_status !== 'ALUGADO') return erroValidacao(res, 'Somente itens alugados podem ser excluidos.');

    const { error, count } = await supabase.from('itens').delete({ count: 'exact' }).eq('itn_id', id);
    if (error) throw error;

    const { error: exemplarErro } = await supabase.from('exemplares').update({ exa_status: 'DISPONIVEL' }).eq('exa_id', item.itn_exa_id);
    if (exemplarErro) throw exemplarErro;

    await atualizarTotalLocacao(item.itn_loc_id);
    res.json({ mensagem: 'Item excluido e exemplar liberado.', affectedRows: count });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel excluir o item.');
  }
});

app.get('/api/pagamentos', async (req, res) => {
  try {
    const { clientes, locacoes, pagamentos } = await carregarBaseRelacional();
    res.json(pagamentos.map(pagamento => pagamentoParaFront(pagamento, locacoes, clientes)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar os pagamentos.');
  }
});

app.post('/api/pagamentos', async (req, res) => {
  const locacaoId = validarCampoId(req.body.PAG_LOC_ID, 'locacao', res);
  if (!locacaoId) return;
  const valor = numeroPositivo(req.body.PAG_VALOR, 'valor do pagamento', res);
  if (valor === null) return;
  if (valor === 0) return erroValidacao(res, 'O pagamento deve ser maior que zero.');
  const forma = normalizarStatus(req.body.PAG_FORMA, ['DINHEIRO', 'PIX', 'CARTAO', 'BOLETO'], 'DINHEIRO');

  try {
    const { data: locacao, error: locacaoErro } = await buscarPorId('locacoes', 'loc_id', locacaoId);
    if (locacaoErro) throw locacaoErro;
    if (!locacao) return erroValidacao(res, 'Locacao nao encontrada.');

    const { data, error } = await supabase
      .from('pagamentos')
      .insert({
        pag_loc_id: locacaoId,
        pag_valor: valor,
        pag_forma: forma,
        pag_observacao: textoOpcional(req.body.PAG_OBSERVACAO, 200)
      })
      .select('pag_id')
      .single();
    if (error) throw error;

    await atualizarTotalLocacao(locacaoId);
    res.json({ mensagem: 'Pagamento registrado com sucesso.', insertId: data.pag_id, affectedRows: 1 });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel registrar o pagamento.');
  }
});

app.put('/api/pagamentos/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;
  const locacaoId = validarCampoId(req.body.PAG_LOC_ID, 'locacao', res);
  if (!locacaoId) return;
  const valor = numeroPositivo(req.body.PAG_VALOR, 'valor do pagamento', res);
  if (valor === null) return;
  if (valor === 0) return erroValidacao(res, 'O pagamento deve ser maior que zero.');
  const forma = normalizarStatus(req.body.PAG_FORMA, ['DINHEIRO', 'PIX', 'CARTAO', 'BOLETO'], 'DINHEIRO');

  try {
    const { data: pagamento, error: buscaErro } = await buscarPorId('pagamentos', 'pag_id', id);
    if (buscaErro) throw buscaErro;
    if (!pagamento) return erroValidacao(res, 'Pagamento nao encontrado.');

    const { data: locacao, error: locacaoErro } = await buscarPorId('locacoes', 'loc_id', locacaoId);
    if (locacaoErro) throw locacaoErro;
    if (!locacao) return erroValidacao(res, 'Locacao nao encontrada.');

    const { error, count } = await supabase
      .from('pagamentos')
      .update({
        pag_loc_id: locacaoId,
        pag_valor: valor,
        pag_forma: forma,
        pag_observacao: textoOpcional(req.body.PAG_OBSERVACAO, 200)
      }, { count: 'exact' })
      .eq('pag_id', id);
    if (error) throw error;

    await atualizarTotalLocacao(pagamento.pag_loc_id);
    if (pagamento.pag_loc_id !== locacaoId) await atualizarTotalLocacao(locacaoId);
    res.json({ mensagem: 'Pagamento atualizado com sucesso.', affectedRows: count });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel atualizar o pagamento.');
  }
});

app.delete('/api/pagamentos/:id', async (req, res) => {
  const id = validarId(req, res);
  if (!id) return;

  try {
    const { data: pagamento, error: buscaErro } = await buscarPorId('pagamentos', 'pag_id', id);
    if (buscaErro) throw buscaErro;
    if (!pagamento) return erroValidacao(res, 'Pagamento nao encontrado.');

    const { error, count } = await supabase.from('pagamentos').delete({ count: 'exact' }).eq('pag_id', id);
    if (error) throw error;

    await atualizarTotalLocacao(pagamento.pag_loc_id);
    res.json({ mensagem: 'Pagamento excluido com sucesso.', affectedRows: count });
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel excluir o pagamento.');
  }
});

app.get('/api/filmes/disponiveis', async (req, res) => {
  try {
    const { categorias, filmes, exemplares } = await carregarBaseRelacional();
    const resultado = filmes
      .map(filme => filmeParaFront(filme, categorias, exemplares))
      .filter(filme => filme.QTD_DISPONIVEL > 0);
    res.json(resultado);
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar filmes disponiveis.');
  }
});

app.get('/api/filmes/alugados', async (req, res) => {
  try {
    const { clientes, categorias, filmes, exemplares, locacoes, itens } = await carregarBaseRelacional();
    const resultado = itens
      .filter(item => item.itn_status === 'ALUGADO')
      .map(item => {
        const locacao = locacoes.find(loc => loc.loc_id === item.itn_loc_id);
        const cliente = clientes.find(cli => cli.cli_id === locacao?.loc_cli_id);
        const filme = filmes.find(fil => fil.fil_id === item.itn_fil_id);
        const categoria = categorias.find(cat => cat.cat_id === filme?.fil_cat_id);
        const exemplar = exemplares.find(exa => exa.exa_id === item.itn_exa_id);
        return {
          LOC_ID: locacao?.loc_id || '',
          CLI_NOME: cliente?.cli_nome || '',
          FIL_NOME: filme?.fil_nome || '',
          CAT_NOME: categoria?.cat_nome || '',
          EXA_CODIGO: exemplar?.exa_codigo || '',
          LOC_DATA_PREVISTA: locacao?.loc_data_prevista || '',
          DIAS_ATRASO: locacao ? diasAtraso(locacao.loc_data_prevista) : 0
        };
      });
    res.json(resultado);
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar filmes alugados.');
  }
});

app.get('/api/locacoes/detalhes', async (req, res) => {
  try {
    const { clientes, categorias, filmes, exemplares, locacoes, itens } = await carregarBaseRelacional();
    const relatorio = itens.map(item => {
      const locacao = locacoes.find(loc => loc.loc_id === item.itn_loc_id);
      const cliente = clientes.find(cli => cli.cli_id === locacao?.loc_cli_id);
      const filme = filmes.find(fil => fil.fil_id === item.itn_fil_id);
      const categoria = categorias.find(cat => cat.cat_id === filme?.fil_cat_id);
      const exemplar = exemplares.find(exa => exa.exa_id === item.itn_exa_id);

      return {
        CLI_ID: cliente?.cli_id || '',
        CLI_NOME: cliente?.cli_nome || '',
        LOC_ID: locacao?.loc_id || '',
        LOC_STATUS: locacao?.loc_status || '',
        LOC_DATA_CAD: locacao?.loc_data_cad || '',
        LOC_DATA_PREVISTA: locacao?.loc_data_prevista || '',
        FIL_NOME: filme?.fil_nome || '',
        CAT_NOME: categoria?.cat_nome || '',
        EXA_CODIGO: exemplar?.exa_codigo || '',
        ITN_VALOR_LOC: item.itn_valor_loc,
        ITN_VALOR_MULTA: item.itn_valor_multa
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
    const { clientes, categorias, filmes, exemplares, locacoes, itens } = await carregarBaseRelacional();
    const cliente = clientes.find(cli => cli.cli_id === clienteId);
    const locacoesCliente = locacoes.filter(loc => loc.loc_cli_id === clienteId);
    const idsLocacoes = locacoesCliente.map(loc => loc.loc_id);

    const resultado = itens
      .filter(item => idsLocacoes.includes(item.itn_loc_id))
      .map(item => {
        const locacao = locacoes.find(loc => loc.loc_id === item.itn_loc_id);
        const filme = filmes.find(fil => fil.fil_id === item.itn_fil_id);
        const categoria = categorias.find(cat => cat.cat_id === filme?.fil_cat_id);
        const exemplar = exemplares.find(exa => exa.exa_id === item.itn_exa_id);

        return {
          CLI_NOME: cliente?.cli_nome || '',
          LOC_ID: locacao?.loc_id || '',
          LOC_STATUS: locacao?.loc_status || '',
          LOC_DATA_CAD: locacao?.loc_data_cad || '',
          LOC_DATA_PREVISTA: locacao?.loc_data_prevista || '',
          FIL_NOME: filme?.fil_nome || '',
          CAT_NOME: categoria?.cat_nome || '',
          EXA_CODIGO: exemplar?.exa_codigo || '',
          ITN_VALOR_LOC: item.itn_valor_loc,
          ITN_VALOR_MULTA: item.itn_valor_multa
        };
      });

    res.json(resultado.sort((a, b) => Number(a.LOC_ID) - Number(b.LOC_ID)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel listar as locacoes do cliente.');
  }
});

app.get('/api/relatorios/locacoes-abertas', async (req, res) => {
  try {
    const { clientes, locacoes } = await carregarBaseRelacional();
    res.json(locacoes.filter(loc => loc.loc_status === 'ABERTA').map(loc => locacaoParaFront(loc, clientes)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel gerar relatorio de locacoes abertas.');
  }
});

app.get('/api/relatorios/atrasos', async (req, res) => {
  try {
    const { clientes, locacoes } = await carregarBaseRelacional();
    const resultado = locacoes
      .filter(loc => loc.loc_status === 'ABERTA' && diasAtraso(loc.loc_data_prevista) > 0)
      .map(loc => ({
        ...locacaoParaFront(loc, clientes),
        DIAS_ATRASO: diasAtraso(loc.loc_data_prevista),
        MULTA_PREVISTA: Number((diasAtraso(loc.loc_data_prevista) * valorMultaPorDia).toFixed(2))
      }));
    res.json(resultado);
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel gerar relatorio de atrasos.');
  }
});

app.get('/api/relatorios/multas', async (req, res) => {
  try {
    const { clientes, locacoes } = await carregarBaseRelacional();
    res.json(locacoes.filter(loc => Number(loc.loc_multa_total || 0) > 0).map(loc => locacaoParaFront(loc, clientes)));
  } catch (error) {
    responderErro(res, error, 'Nao foi possivel gerar relatorio de multas.');
  }
});

app.listen(port, () => {
  console.log(`Servidor iniciado em http://localhost:${port}`);
});
