const path = require('path');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });
require('dotenv').config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDir = path.join(__dirname, 'public');
const valorMultaPorDia = Number(process.env.VALOR_MULTA_DIA) || 2;
const tmdbBaseUrl = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const tmdbImageBaseUrl = process.env.TMDB_IMAGE_BASE_URL || 'https://image.tmdb.org/t/p';
const tmdbAccessToken = process.env.TMDB_ACCESS_TOKEN || process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_BEARER_TOKEN;
const tmdbApiKey = process.env.TMDB_API_KEY;
const tmdbImageOrigin = (() => {
  try {
    return new URL(tmdbImageBaseUrl).origin;
  } catch {
    return null;
  }
})();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

if (!supabase) {
  console.error('Erro: SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no arquivo .env.');
}

app.use((req, res, next) => {
  const connectSrc = ["'self'", 'http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*'];
  const imgSrc = ["'self'", 'data:', 'blob:'];
  if (supabaseUrl) connectSrc.push(supabaseUrl);
  if (tmdbImageOrigin) imgSrc.push(tmdbImageOrigin);

  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "font-src 'self'; " +
    `img-src ${imgSrc.join(' ')}; ` +
    `connect-src ${connectSrc.join(' ')};`
  );
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDir));

app.use('/api', (req, res, next) => {
  if (!supabase && !req.path.startsWith('/tmdb')) {
    return res.status(500).json({ erro: 'Supabase não configurado.' });
  }
  next();
});

const paginas = [
  'clientes.html',
  'categorias.html',
  'filmes.html',
  'exemplares.html',
  'locacoes.html',
  'itens.html',
  'pagamentos.html',
  'relatorios.html'
];

const statusPermitidos = {
  simNao: ['SIM', 'NAO'],
  exemplar: ['DISPONIVEL', 'ALUGADO', 'MANUTENCAO', 'INATIVO'],
  tipoExemplar: ['FISICO', 'DIGITAL'],
  pagamento: ['DINHEIRO', 'PIX', 'CARTAO', 'BOLETO'],
  locacao: ['ABERTA', 'DEVOLVIDA', 'CANCELADA']
};

const responderErro = (res, error, msg = 'Erro no banco de dados.') => {
  console.error(msg, error);
  if (error?.code === '42703') {
    return res.status(500).json({
      erro: 'O banco de dados está desatualizado para esta versão do sistema.',
      detalhe: `${error.message}. Execute a migração migrations/2026-06-09_tmdb_schema.sql no SQL Editor do Supabase.`
    });
  }
  res.status(500).json({ erro: msg, detalhe: error?.message || String(error) });
};

const erroValidacao = (res, msg) => res.status(400).json({ erro: msg });

const validarCampoId = (valor, nome, res) => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ erro: `Informe um código de ${nome} válido.` });
    return null;
  }
  return id;
};

const textoOpcional = (valor, max = 255) => {
  const texto = String(valor ?? '').trim();
  return texto ? texto.slice(0, max) : null;
};

const textoObrigatorio = (valor, nome, res, max = 255) => {
  const texto = textoOpcional(valor, max);
  if (!texto) {
    erroValidacao(res, `Informe ${nome}.`);
    return null;
  }
  return texto;
};

const numero = (valor, padrao = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
};

const status = (valor, permitidos, padrao) => {
  const normalizado = String(valor || padrao).toUpperCase();
  return permitidos.includes(normalizado) ? normalizado : padrao;
};

const dataIso = () => new Date().toISOString();

const saldoLocacao = loc =>
  Number(loc.loc_valor_total || 0) + Number(loc.loc_multa_total || 0) - Number(loc.loc_pago_total || 0);

const clienteParaFront = r => ({
  CLI_ID: r.cli_id,
  CLI_NOME: r.cli_nome,
  CLI_DOCUMENTO: r.cli_documento,
  CLI_EMAIL: r.cli_email,
  CLI_TELEFONE: r.cli_telefone,
  CLI_DATA_CAD: r.cli_data_cad,
  CLI_SALDO: r.cli_saldo,
  CLI_ATIVO: r.cli_ativo ? 'SIM' : 'NAO'
});

const locacaoParaFront = r => ({
  LOC_ID: r.loc_id,
  LOC_CLI_ID: r.loc_cli_id,
  CLI_NOME: r.clientes?.cli_nome,
  LOC_DATA_CAD: r.loc_data_cad,
  LOC_DATA_PREVISTA: r.loc_data_prevista,
  LOC_DATA_DEVOLUCAO: r.loc_data_devolucao,
  LOC_STATUS: r.loc_status,
  LOC_VALOR_TOTAL: r.loc_valor_total,
  LOC_MULTA_TOTAL: r.loc_multa_total,
  LOC_PAGO_TOTAL: r.loc_pago_total,
  SALDO_DEVEDOR: saldoLocacao(r)
});

async function buscarPorId(tabela, coluna, id) {
  return supabase.from(tabela).select('*').eq(coluna, id).maybeSingle();
}

async function atualizarStatusExemplar(exemplarId, exaStatus) {
  const { error } = await supabase.from('exemplares').update({ exa_status: exaStatus }).eq('exa_id', exemplarId);
  if (error) throw error;
}

function tmdbConfigurado() {
  return Boolean(tmdbAccessToken || tmdbApiKey);
}

function posterTmdb(pathname, tamanho = 'w185') {
  return pathname ? `${tmdbImageBaseUrl}/${tamanho}${pathname}` : null;
}

async function tmdbFetch(endpoint, params = {}) {
  if (!tmdbConfigurado()) {
    const erro = new Error('TMDB não configurado. Defina TMDB_ACCESS_TOKEN no arquivo .env.local.');
    erro.statusCode = 500;
    throw erro;
  }

  const url = new URL(`${tmdbBaseUrl}${endpoint}`);
  Object.entries(params).forEach(([chave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') url.searchParams.set(chave, valor);
  });
  if (!tmdbAccessToken && tmdbApiKey) url.searchParams.set('api_key', tmdbApiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resposta = await fetch(url, {
      headers: tmdbAccessToken ? { Authorization: `Bearer ${tmdbAccessToken}` } : undefined,
      signal: controller.signal
    });
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      const erro = new Error(dados.status_message || 'Falha ao consultar o TMDB.');
      erro.statusCode = resposta.status;
      throw erro;
    }

    return dados;
  } finally {
    clearTimeout(timeout);
  }
}

async function buscarGenerosTmdb() {
  const dados = await tmdbFetch('/genre/movie/list', { language: 'pt-BR' });
  return new Map((dados.genres || []).map(genero => [genero.id, genero.name]));
}

function extrairClassificacao(releaseDates) {
  const resultados = releaseDates?.results || [];
  const br = resultados.find(item => item.iso_3166_1 === 'BR');
  const us = resultados.find(item => item.iso_3166_1 === 'US');
  const certificacao = [...(br?.release_dates || []), ...(us?.release_dates || [])]
    .map(item => item.certification)
    .find(Boolean);
  return certificacao || null;
}

function normalizarFilmeTmdb(movie, generos = []) {
  const nomesGeneros = Array.isArray(movie.genres)
    ? movie.genres.map(genero => genero.name).filter(Boolean)
    : (movie.genre_ids || []).map(id => generos.get(id)).filter(Boolean);
  const ano = movie.release_date ? Number(String(movie.release_date).slice(0, 4)) : null;

  return {
    tmdbId: movie.id,
    titulo: movie.title || movie.original_title,
    tituloOriginal: movie.original_title,
    ano,
    dataLancamento: movie.release_date || null,
    sinopse: movie.overview || null,
    duracao: movie.runtime || null,
    classificacao: extrairClassificacao(movie.release_dates),
    generos: nomesGeneros,
    categoria: nomesGeneros[0] || null,
    posterPath: movie.poster_path || null,
    posterUrl: posterTmdb(movie.poster_path),
    popularidade: movie.popularity || 0
  };
}

async function obterDetalhesTmdb(tmdbId) {
  const id = Number(tmdbId);
  if (!Number.isInteger(id) || id <= 0) {
    const erro = new Error('Informe um código TMDB válido.');
    erro.statusCode = 400;
    throw erro;
  }

  const dados = await tmdbFetch(`/movie/${id}`, {
    language: 'pt-BR',
    append_to_response: 'release_dates'
  });
  return normalizarFilmeTmdb(dados);
}

async function obterOuCriarCategoria(nomeCategoria) {
  const nome = textoOpcional(nomeCategoria, 150) || 'Sem categoria';
  const { data: existente, error: buscaErro } = await supabase
    .from('categorias')
    .select('cat_id, cat_nome')
    .ilike('cat_nome', nome)
    .maybeSingle();
  if (buscaErro) throw buscaErro;
  if (existente) return existente;

  const { data, error } = await supabase
    .from('categorias')
    .insert({ cat_nome: nome })
    .select('cat_id, cat_nome')
    .single();
  if (error) {
    const { data: segundaBusca, error: segundaBuscaErro } = await supabase
      .from('categorias')
      .select('cat_id, cat_nome')
      .ilike('cat_nome', nome)
      .maybeSingle();
    if (segundaBuscaErro || !segundaBusca) throw error;
    return segundaBusca;
  }

  return data;
}

app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
paginas.forEach(file => app.get(`/${file}`, (req, res) => res.sendFile(path.join(publicDir, file))));

app.get('/api/status', async (req, res) => {
  const { error } = await supabase.from('clientes').select('cli_id').limit(1);
  res.json([{ conectado: error ? 0 : 1 }]);
});

app.get('/api/tmdb/search', async (req, res) => {
  const query = textoOpcional(req.query.query, 120);
  if (!query || query.length < 2) return erroValidacao(res, 'Informe ao menos 2 caracteres para buscar no TMDB.');

  try {
    const [resultado, generos] = await Promise.all([
      tmdbFetch('/search/movie', {
        query,
        language: 'pt-BR',
        include_adult: 'false',
        page: Math.max(1, Math.min(Number(req.query.page) || 1, 20))
      }),
      buscarGenerosTmdb()
    ]);

    res.json({
      pagina: resultado.page,
      totalPaginas: resultado.total_pages,
      totalResultados: resultado.total_results,
      resultados: (resultado.results || []).slice(0, 10).map(movie => normalizarFilmeTmdb(movie, generos))
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ erro: error.message });
  }
});

app.get('/api/tmdb/movie/:id', async (req, res) => {
  try {
    res.json(await obterDetalhesTmdb(req.params.id));
  } catch (error) {
    res.status(error.statusCode || 500).json({ erro: error.message });
  }
});

app.post('/api/tmdb/import/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ erro: 'Supabase não configurado.' });

  try {
    const filmeTmdb = await obterDetalhesTmdb(req.params.id);
    const { data: existente, error: existenteErro } = await supabase
      .from('filmes')
      .select('fil_id, fil_nome')
      .eq('fil_tmdb_id', filmeTmdb.tmdbId)
      .maybeSingle();
    if (existenteErro) throw existenteErro;
    if (existente) {
      const { error: atualizarErro } = await supabase
        .from('filmes')
        .update({
          fil_ano: filmeTmdb.ano,
          fil_classificacao: filmeTmdb.classificacao,
          fil_duracao_min: filmeTmdb.duracao,
          fil_sinopse: filmeTmdb.sinopse,
          fil_poster_path: filmeTmdb.posterPath
        })
        .eq('fil_id', existente.fil_id);
      if (atualizarErro) throw atualizarErro;

      return res.json({
        mensagem: 'Filme já importado. Dados do TMDB atualizados.',
        insertId: existente.fil_id,
        filme: existente
      });
    }

    const categoria = await obterOuCriarCategoria(filmeTmdb.categoria);
    const { data, error } = await supabase.from('filmes').insert({
      fil_tmdb_id: filmeTmdb.tmdbId,
      fil_nome: filmeTmdb.titulo,
      fil_cat_id: categoria.cat_id,
      fil_ano: filmeTmdb.ano,
      fil_classificacao: filmeTmdb.classificacao,
      fil_duracao_min: filmeTmdb.duracao,
      fil_sinopse: filmeTmdb.sinopse,
      fil_poster_path: filmeTmdb.posterPath,
      fil_valor_padrao: numero(req.body.FIL_VALOR_PADRAO, 10),
      fil_ativo: true
    }).select('fil_id, fil_nome').single();
    if (error) throw error;

    res.json({
      mensagem: `Filme importado do TMDB: ${data.fil_nome}.`,
      insertId: data.fil_id,
      categoria: categoria.cat_nome
    });
  } catch (error) {
    responderErro(res, error, 'Não foi possível importar o filme do TMDB.');
  }
});

app.get('/api/clientes', async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*').order('cli_id');
  if (error) return responderErro(res, error);
  res.json(data.map(clienteParaFront));
});

app.post('/api/clientes', async (req, res) => {
  const nome = textoObrigatorio(req.body.CLI_NOME, 'o nome do cliente', res, 80);
  if (!nome) return;

  const { data, error } = await supabase.from('clientes').insert({
    cli_nome: nome,
    cli_documento: textoOpcional(req.body.CLI_DOCUMENTO, 20),
    cli_email: textoOpcional(req.body.CLI_EMAIL, 120),
    cli_telefone: textoOpcional(req.body.CLI_TELEFONE, 25),
    cli_saldo: numero(req.body.CLI_SALDO),
    cli_ativo: status(req.body.CLI_ATIVO, statusPermitidos.simNao, 'SIM') === 'SIM'
  }).select('cli_id').single();
  if (error) return responderErro(res, error, 'Não foi possível cadastrar o cliente.');
  res.json({ mensagem: 'Cliente cadastrado.', insertId: data.cli_id });
});

app.put('/api/clientes/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'cliente', res);
  const nome = textoObrigatorio(req.body.CLI_NOME, 'o nome do cliente', res, 80);
  if (!id || !nome) return;

  const { error, count } = await supabase.from('clientes').update({
    cli_nome: nome,
    cli_documento: textoOpcional(req.body.CLI_DOCUMENTO, 20),
    cli_email: textoOpcional(req.body.CLI_EMAIL, 120),
    cli_telefone: textoOpcional(req.body.CLI_TELEFONE, 25),
    cli_saldo: numero(req.body.CLI_SALDO),
    cli_ativo: status(req.body.CLI_ATIVO, statusPermitidos.simNao, 'SIM') === 'SIM'
  }, { count: 'exact' }).eq('cli_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar o cliente.');
  if (!count) return erroValidacao(res, 'Cliente não encontrado.');
  res.json({ mensagem: 'Cliente atualizado.' });
});

app.delete('/api/clientes/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'cliente', res);
  if (!id) return;
  const { error, count } = await supabase.from('clientes').delete({ count: 'exact' }).eq('cli_id', id);
  if (error) return responderErro(res, error, 'Não é possível excluir cliente com histórico.');
  if (!count) return erroValidacao(res, 'Cliente não encontrado.');
  res.json({ mensagem: 'Cliente excluído.' });
});

app.get('/api/categorias', async (req, res) => {
  const { data, error } = await supabase.from('categorias').select('*').order('cat_id');
  if (error) return responderErro(res, error);
  res.json(data.map(r => ({ CAT_ID: r.cat_id, CAT_NOME: r.cat_nome, CAT_DATA_CAD: r.cat_data_cad })));
});

app.post('/api/categorias', async (req, res) => {
  const nome = textoObrigatorio(req.body.CAT_NOME, 'o nome da categoria', res, 150);
  if (!nome) return;
  const { data, error } = await supabase.from('categorias').insert({ cat_nome: nome }).select('cat_id').single();
  if (error) return responderErro(res, error, 'Não foi possível cadastrar a categoria.');
  res.json({ mensagem: 'Categoria cadastrada.', insertId: data.cat_id });
});

app.put('/api/categorias/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'categoria', res);
  const nome = textoObrigatorio(req.body.CAT_NOME, 'o nome da categoria', res, 150);
  if (!id || !nome) return;
  const { error, count } = await supabase.from('categorias').update({ cat_nome: nome }, { count: 'exact' }).eq('cat_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar a categoria.');
  if (!count) return erroValidacao(res, 'Categoria não encontrada.');
  res.json({ mensagem: 'Categoria atualizada.' });
});

app.delete('/api/categorias/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'categoria', res);
  if (!id) return;
  const { error, count } = await supabase.from('categorias').delete({ count: 'exact' }).eq('cat_id', id);
  if (error) return responderErro(res, error, 'Categoria em uso.');
  if (!count) return erroValidacao(res, 'Categoria não encontrada.');
  res.json({ mensagem: 'Categoria excluída.' });
});

app.get('/api/filmes', async (req, res) => {
  const { data, error } = await supabase
    .from('filmes')
    .select('*, categorias(cat_nome), exemplares(exa_status)')
    .order('fil_id');
  if (error) return responderErro(res, error);

  res.json(data.map(r => ({
    FIL_ID: r.fil_id,
    FIL_TMDB_ID: r.fil_tmdb_id,
    FIL_POSTER: posterTmdb(r.fil_poster_path, 'w92'),
    FIL_NOME: r.fil_nome,
    CAT_NOME: r.categorias?.cat_nome,
    FIL_CAT_ID: r.fil_cat_id,
    FIL_ANO: r.fil_ano,
    FIL_CLASSIFICACAO: r.fil_classificacao,
    FIL_DURACAO_MIN: r.fil_duracao_min,
    FIL_VALOR_PADRAO: r.fil_valor_padrao,
    FIL_ATIVO: r.fil_ativo ? 'SIM' : 'NAO',
    QTD_DISPONIVEL: (r.exemplares || []).filter(e => e.exa_status === 'DISPONIVEL').length,
    QTD_ALUGADA: (r.exemplares || []).filter(e => e.exa_status === 'ALUGADO').length
  })));
});

app.post('/api/filmes', async (req, res) => {
  const nome = textoObrigatorio(req.body.FIL_NOME, 'o nome do filme', res, 150);
  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!nome || !categoriaId) return;

  const { data, error } = await supabase.from('filmes').insert({
    fil_nome: nome,
    fil_cat_id: categoriaId,
    fil_ano: req.body.FIL_ANO ? numero(req.body.FIL_ANO) : null,
    fil_classificacao: textoOpcional(req.body.FIL_CLASSIFICACAO, 10),
    fil_duracao_min: req.body.FIL_DURACAO_MIN ? numero(req.body.FIL_DURACAO_MIN) : null,
    fil_valor_padrao: numero(req.body.FIL_VALOR_PADRAO, 10),
    fil_ativo: status(req.body.FIL_ATIVO, statusPermitidos.simNao, 'SIM') === 'SIM'
  }).select('fil_id').single();
  if (error) return responderErro(res, error, 'Não foi possível cadastrar o filme.');
  res.json({ mensagem: 'Filme cadastrado.', insertId: data.fil_id });
});

app.put('/api/filmes/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'filme', res);
  const nome = textoObrigatorio(req.body.FIL_NOME, 'o nome do filme', res, 150);
  const categoriaId = validarCampoId(req.body.FIL_CAT_ID, 'categoria', res);
  if (!id || !nome || !categoriaId) return;

  const { error, count } = await supabase.from('filmes').update({
    fil_nome: nome,
    fil_cat_id: categoriaId,
    fil_ano: req.body.FIL_ANO ? numero(req.body.FIL_ANO) : null,
    fil_classificacao: textoOpcional(req.body.FIL_CLASSIFICACAO, 10),
    fil_duracao_min: req.body.FIL_DURACAO_MIN ? numero(req.body.FIL_DURACAO_MIN) : null,
    fil_valor_padrao: numero(req.body.FIL_VALOR_PADRAO, 10),
    fil_ativo: status(req.body.FIL_ATIVO, statusPermitidos.simNao, 'SIM') === 'SIM'
  }, { count: 'exact' }).eq('fil_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar o filme.');
  if (!count) return erroValidacao(res, 'Filme não encontrado.');
  res.json({ mensagem: 'Filme atualizado.' });
});

app.delete('/api/filmes/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'filme', res);
  if (!id) return;
  const { error, count } = await supabase.from('filmes').delete({ count: 'exact' }).eq('fil_id', id);
  if (error) return responderErro(res, error, 'Não é possível excluir filme com exemplares ou locações.');
  if (!count) return erroValidacao(res, 'Filme não encontrado.');
  res.json({ mensagem: 'Filme excluído.' });
});

app.get('/api/exemplares', async (req, res) => {
  const { data, error } = await supabase.from('exemplares').select('*, filmes(fil_nome)').order('exa_id');
  if (error) return responderErro(res, error);
  res.json(data.map(r => ({
    EXA_ID: r.exa_id,
    EXA_FIL_ID: r.exa_fil_id,
    EXA_CODIGO: r.exa_codigo,
    FIL_NOME: r.filmes?.fil_nome,
    EXA_TIPO: r.exa_tipo,
    EXA_STATUS: r.exa_status
  })));
});

app.post('/api/exemplares', async (req, res) => {
  const filmeId = validarCampoId(req.body.EXA_FIL_ID, 'filme', res);
  const codigo = textoObrigatorio(req.body.EXA_CODIGO, 'o código do exemplar', res, 30);
  if (!filmeId || !codigo) return;

  const { data, error } = await supabase.from('exemplares').insert({
    exa_fil_id: filmeId,
    exa_codigo: codigo,
    exa_tipo: status(req.body.EXA_TIPO, statusPermitidos.tipoExemplar, 'FISICO'),
    exa_status: status(req.body.EXA_STATUS, statusPermitidos.exemplar, 'DISPONIVEL')
  }).select('exa_id').single();
  if (error) return responderErro(res, error, 'Não foi possível cadastrar o exemplar.');
  res.json({ mensagem: 'Exemplar cadastrado.', insertId: data.exa_id });
});

app.put('/api/exemplares/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'exemplar', res);
  const filmeId = validarCampoId(req.body.EXA_FIL_ID, 'filme', res);
  const codigo = textoObrigatorio(req.body.EXA_CODIGO, 'o código do exemplar', res, 30);
  if (!id || !filmeId || !codigo) return;

  const { data: itemAberto, error: itemErro } = await supabase
    .from('itens')
    .select('itn_id')
    .eq('itn_exa_id', id)
    .eq('itn_status', 'ALUGADO')
    .limit(1)
    .maybeSingle();
  if (itemErro) return responderErro(res, itemErro);

  const novoStatus = status(req.body.EXA_STATUS, statusPermitidos.exemplar, 'DISPONIVEL');
  if (itemAberto && novoStatus !== 'ALUGADO') {
    return erroValidacao(res, 'Exemplar alugado não pode mudar para outro status.');
  }

  const { error, count } = await supabase.from('exemplares').update({
    exa_fil_id: filmeId,
    exa_codigo: codigo,
    exa_tipo: status(req.body.EXA_TIPO, statusPermitidos.tipoExemplar, 'FISICO'),
    exa_status: novoStatus
  }, { count: 'exact' }).eq('exa_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar o exemplar.');
  if (!count) return erroValidacao(res, 'Exemplar não encontrado.');
  res.json({ mensagem: 'Exemplar atualizado.' });
});

app.delete('/api/exemplares/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'exemplar', res);
  if (!id) return;
  const { data: exemplar, error: buscaErro } = await buscarPorId('exemplares', 'exa_id', id);
  if (buscaErro) return responderErro(res, buscaErro);
  if (!exemplar) return erroValidacao(res, 'Exemplar não encontrado.');
  if (exemplar.exa_status === 'ALUGADO') return erroValidacao(res, 'Não é possível excluir exemplar alugado.');

  const { error, count } = await supabase.from('exemplares').delete({ count: 'exact' }).eq('exa_id', id);
  if (error) return responderErro(res, error, 'Não é possível excluir exemplar com histórico.');
  if (!count) return erroValidacao(res, 'Exemplar não encontrado.');
  res.json({ mensagem: 'Exemplar excluído.' });
});

app.get('/api/locacoes', async (req, res) => {
  const { data, error } = await supabase
    .from('locacoes')
    .select('*, clientes(cli_nome)')
    .order('loc_id', { ascending: false });
  if (error) return responderErro(res, error);
  res.json(data.map(locacaoParaFront));
});

app.post('/api/locacoes', async (req, res) => {
  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!clienteId) return;
  if (!req.body.LOC_DATA_PREVISTA) return erroValidacao(res, 'Informe a data prevista de devolução.');

  const { data, error } = await supabase.from('locacoes').insert({
    loc_cli_id: clienteId,
    loc_data_prevista: req.body.LOC_DATA_PREVISTA,
    loc_status: 'ABERTA'
  }).select('loc_id').single();
  if (error) return responderErro(res, error, 'Não foi possível abrir a locação.');
  res.json({ mensagem: 'Locação aberta.', insertId: data.loc_id });
});

app.put('/api/locacoes/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'locação', res);
  const clienteId = validarCampoId(req.body.LOC_CLI_ID, 'cliente', res);
  if (!id || !clienteId) return;
  if (!req.body.LOC_DATA_PREVISTA) return erroValidacao(res, 'Informe a data prevista de devolução.');

  const locStatus = status(req.body.LOC_STATUS, statusPermitidos.locacao, 'ABERTA');
  if (locStatus === 'DEVOLVIDA') {
    return erroValidacao(res, 'Use o botão Devolver para registrar a devolução da locação.');
  }
  if (locStatus === 'CANCELADA') {
    const { data: itens, error: itensErro } = await supabase.from('itens').select('itn_id').eq('itn_loc_id', id).limit(1);
    if (itensErro) return responderErro(res, itensErro);
    if (itens?.length) return erroValidacao(res, 'Não é possível cancelar locação com itens.');
  }

  const { error, count } = await supabase.from('locacoes').update({
    loc_cli_id: clienteId,
    loc_data_prevista: req.body.LOC_DATA_PREVISTA,
    loc_status: locStatus,
    loc_data_devolucao: null
  }, { count: 'exact' }).eq('loc_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar a locação.');
  if (!count) return erroValidacao(res, 'Locação não encontrada.');
  res.json({ mensagem: 'Locação atualizada.' });
});

app.delete('/api/locacoes/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'locação', res);
  if (!id) return;
  const { data: itens, error: itensErro } = await supabase.from('itens').select('itn_id').eq('itn_loc_id', id).limit(1);
  if (itensErro) return responderErro(res, itensErro);
  if (itens?.length) return erroValidacao(res, 'Não é possível excluir locação com itens.');

  const { error, count } = await supabase.from('locacoes').delete({ count: 'exact' }).eq('loc_id', id);
  if (error) return responderErro(res, error, 'Não foi possível excluir a locação.');
  if (!count) return erroValidacao(res, 'Locação não encontrada.');
  res.json({ mensagem: 'Locação excluída.' });
});

app.post('/api/locacoes/:id/devolver', async (req, res) => {
  const id = validarCampoId(req.params.id, 'locação', res);
  if (!id) return;

  try {
    const { data: locacao, error: locacaoErro } = await buscarPorId('locacoes', 'loc_id', id);
    if (locacaoErro) throw locacaoErro;
    if (!locacao) return erroValidacao(res, 'Locação não encontrada.');
    if (locacao.loc_status !== 'ABERTA') return erroValidacao(res, 'Apenas locações abertas podem ser devolvidas.');

    const { data: itens, error: itensErro } = await supabase
      .from('itens')
      .select('itn_id, itn_exa_id')
      .eq('itn_loc_id', id)
      .eq('itn_status', 'ALUGADO');
    if (itensErro) throw itensErro;

    const diasAtraso = Math.max(0, Math.floor((Date.now() - new Date(`${locacao.loc_data_prevista}T00:00:00`).getTime()) / 86400000));
    const multaPorItem = Number((diasAtraso * valorMultaPorDia).toFixed(2));
    const devolvidoEm = dataIso();

    for (const item of itens || []) {
      const { error: itemErro } = await supabase.from('itens').update({
        itn_status: 'DEVOLVIDO',
        itn_data_devolucao: devolvidoEm,
        itn_valor_multa: multaPorItem
      }).eq('itn_id', item.itn_id);
      if (itemErro) throw itemErro;
      await atualizarStatusExemplar(item.itn_exa_id, 'DISPONIVEL');
    }

    const { error: updateErro } = await supabase.from('locacoes').update({
      loc_status: 'DEVOLVIDA',
      loc_data_devolucao: devolvidoEm
    }).eq('loc_id', id);
    if (updateErro) throw updateErro;

    res.json({ mensagem: 'Devolução concluída.', diasAtraso, multa: multaPorItem });
  } catch (error) {
    responderErro(res, error, 'Não foi possível registrar a devolução.');
  }
});

app.get('/api/itens', async (req, res) => {
  const { data, error } = await supabase
    .from('itens')
    .select('*, filmes(fil_nome), exemplares(exa_codigo)')
    .order('itn_id');
  if (error) return responderErro(res, error);
  res.json(data.map(r => ({
    ITN_ID: r.itn_id,
    ITN_LOC_ID: r.itn_loc_id,
    FIL_NOME: r.filmes?.fil_nome,
    EXA_CODIGO: r.exemplares?.exa_codigo,
    ITN_EXA_ID: r.itn_exa_id,
    ITN_VALOR_LOC: r.itn_valor_loc,
    ITN_VALOR_MULTA: r.itn_valor_multa,
    ITN_DATA_DEVOLUCAO: r.itn_data_devolucao,
    ITN_STATUS: r.itn_status
  })));
});

app.post('/api/itens', async (req, res) => {
  const locacaoId = validarCampoId(req.body.ITN_LOC_ID, 'locação', res);
  const exemplarId = validarCampoId(req.body.ITN_EXA_ID, 'exemplar', res);
  const valor = numero(req.body.ITN_VALOR_LOC, NaN);
  if (!locacaoId || !exemplarId) return;
  if (!Number.isFinite(valor) || valor <= 0) return erroValidacao(res, 'Informe um valor de locação válido.');

  try {
    const { data: locacao, error: locacaoErro } = await buscarPorId('locacoes', 'loc_id', locacaoId);
    if (locacaoErro) throw locacaoErro;
    if (!locacao) return erroValidacao(res, 'Locação não encontrada.');
    if (locacao.loc_status !== 'ABERTA') return erroValidacao(res, 'Somente locações abertas podem receber itens.');

    const { data: exemplar, error: exemplarErro } = await buscarPorId('exemplares', 'exa_id', exemplarId);
    if (exemplarErro) throw exemplarErro;
    if (!exemplar) return erroValidacao(res, 'Exemplar não encontrado.');
    if (exemplar.exa_status !== 'DISPONIVEL') return erroValidacao(res, 'Exemplar indisponível.');

    const { data, error } = await supabase.from('itens').insert({
      itn_loc_id: locacaoId,
      itn_exa_id: exemplarId,
      itn_fil_id: exemplar.exa_fil_id,
      itn_valor_loc: valor,
      itn_status: 'ALUGADO'
    }).select('itn_id').single();
    if (error) throw error;

    await atualizarStatusExemplar(exemplarId, 'ALUGADO');
    res.json({ mensagem: 'Item adicionado.', insertId: data.itn_id });
  } catch (error) {
    responderErro(res, error, 'Não foi possível adicionar o item.');
  }
});

app.put('/api/itens/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'item', res);
  const valor = numero(req.body.ITN_VALOR_LOC, NaN);
  if (!id) return;
  if (!Number.isFinite(valor) || valor <= 0) return erroValidacao(res, 'Informe um valor de locação válido.');

  const { data: item, error: buscaErro } = await buscarPorId('itens', 'itn_id', id);
  if (buscaErro) return responderErro(res, buscaErro);
  if (!item) return erroValidacao(res, 'Item não encontrado.');
  if (item.itn_status !== 'ALUGADO') return erroValidacao(res, 'Somente itens alugados podem ser editados.');

  const { error, count } = await supabase.from('itens').update({ itn_valor_loc: valor }, { count: 'exact' }).eq('itn_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar o item.');
  if (!count) return erroValidacao(res, 'Item não encontrado.');
  res.json({ mensagem: 'Item atualizado.' });
});

app.delete('/api/itens/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'item', res);
  if (!id) return;

  try {
    const { data: item, error: buscaErro } = await buscarPorId('itens', 'itn_id', id);
    if (buscaErro) throw buscaErro;
    if (!item) return erroValidacao(res, 'Item não encontrado.');
    if (item.itn_status !== 'ALUGADO') return erroValidacao(res, 'Somente itens alugados podem ser excluídos.');

    const { error, count } = await supabase.from('itens').delete({ count: 'exact' }).eq('itn_id', id);
    if (error) throw error;
    if (!count) return erroValidacao(res, 'Item não encontrado.');

    await atualizarStatusExemplar(item.itn_exa_id, 'DISPONIVEL');
    res.json({ mensagem: 'Item excluído e exemplar liberado.' });
  } catch (error) {
    responderErro(res, error, 'Não foi possível excluir o item.');
  }
});

app.get('/api/pagamentos', async (req, res) => {
  const { data, error } = await supabase
    .from('pagamentos')
    .select('*, locacoes(loc_cli_id, clientes(cli_nome))')
    .order('pag_id');
  if (error) return responderErro(res, error);
  res.json(data.map(r => ({
    PAG_ID: r.pag_id,
    PAG_LOC_ID: r.pag_loc_id,
    CLI_NOME: r.locacoes?.clientes?.cli_nome,
    PAG_VALOR: r.pag_valor,
    PAG_FORMA: r.pag_forma,
    PAG_OBSERVACAO: r.pag_observacao,
    PAG_DATA: r.pag_data
  })));
});

app.post('/api/pagamentos', async (req, res) => {
  const locacaoId = validarCampoId(req.body.PAG_LOC_ID, 'locação', res);
  const valor = numero(req.body.PAG_VALOR, NaN);
  if (!locacaoId) return;
  if (!Number.isFinite(valor) || valor <= 0) return erroValidacao(res, 'Informe um valor de pagamento válido.');

  const { data, error } = await supabase.from('pagamentos').insert({
    pag_loc_id: locacaoId,
    pag_valor: valor,
    pag_forma: status(req.body.PAG_FORMA, statusPermitidos.pagamento, 'DINHEIRO'),
    pag_observacao: textoOpcional(req.body.PAG_OBSERVACAO, 200)
  }).select('pag_id').single();
  if (error) return responderErro(res, error, 'Não foi possível registrar o pagamento.');
  res.json({ mensagem: 'Pagamento registrado.', insertId: data.pag_id });
});

app.put('/api/pagamentos/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'pagamento', res);
  const locacaoId = validarCampoId(req.body.PAG_LOC_ID, 'locação', res);
  const valor = numero(req.body.PAG_VALOR, NaN);
  if (!id || !locacaoId) return;
  if (!Number.isFinite(valor) || valor <= 0) return erroValidacao(res, 'Informe um valor de pagamento válido.');

  const { error, count } = await supabase.from('pagamentos').update({
    pag_loc_id: locacaoId,
    pag_valor: valor,
    pag_forma: status(req.body.PAG_FORMA, statusPermitidos.pagamento, 'DINHEIRO'),
    pag_observacao: textoOpcional(req.body.PAG_OBSERVACAO, 200)
  }, { count: 'exact' }).eq('pag_id', id);
  if (error) return responderErro(res, error, 'Não foi possível atualizar o pagamento.');
  if (!count) return erroValidacao(res, 'Pagamento não encontrado.');
  res.json({ mensagem: 'Pagamento atualizado.' });
});

app.delete('/api/pagamentos/:id', async (req, res) => {
  const id = validarCampoId(req.params.id, 'pagamento', res);
  if (!id) return;
  const { error, count } = await supabase.from('pagamentos').delete({ count: 'exact' }).eq('pag_id', id);
  if (error) return responderErro(res, error, 'Não foi possível excluir o pagamento.');
  if (!count) return erroValidacao(res, 'Pagamento não encontrado.');
  res.json({ mensagem: 'Pagamento excluído.' });
});

app.get('/api/filmes/disponiveis', async (req, res) => {
  const { data, error } = await supabase
    .from('filmes')
    .select('*, categorias(cat_nome), exemplares(exa_status)')
    .eq('fil_ativo', true)
    .order('fil_nome');
  if (error) return responderErro(res, error);

  res.json(data
    .map(filme => ({
      FIL_POSTER: posterTmdb(filme.fil_poster_path, 'w92'),
      FIL_NOME: filme.fil_nome,
      CAT_NOME: filme.categorias?.cat_nome,
      QTD_DISPONIVEL: (filme.exemplares || []).filter(exa => exa.exa_status === 'DISPONIVEL').length
    }))
    .filter(filme => filme.QTD_DISPONIVEL > 0));
});

app.get('/api/filmes/alugados', async (req, res) => {
  const { data, error } = await supabase
    .from('itens')
    .select('itn_loc_id, filmes(*, categorias(cat_nome)), exemplares(exa_codigo), locacoes(loc_data_prevista, clientes(cli_nome))')
    .eq('itn_status', 'ALUGADO')
    .order('itn_id');
  if (error) return responderErro(res, error);

  res.json(data.map(item => ({
    LOC_ID: item.itn_loc_id,
    CLI_NOME: item.locacoes?.clientes?.cli_nome,
    FIL_POSTER: posterTmdb(item.filmes?.fil_poster_path, 'w92'),
    FIL_NOME: item.filmes?.fil_nome,
    CAT_NOME: item.filmes?.categorias?.cat_nome,
    EXA_CODIGO: item.exemplares?.exa_codigo,
    LOC_DATA_PREVISTA: item.locacoes?.loc_data_prevista
  })));
});

app.get('/api/locacoes/detalhes', async (req, res) => {
  const { data, error } = await supabase
    .from('itens')
    .select('*, locacoes(loc_id, loc_status, loc_data_cad, loc_data_prevista, clientes(cli_nome)), filmes(fil_nome, categorias(cat_nome)), exemplares(exa_codigo)')
    .order('itn_id');
  if (error) return responderErro(res, error);

  res.json(data.map(item => ({
    LOC_ID: item.locacoes?.loc_id,
    CLI_NOME: item.locacoes?.clientes?.cli_nome,
    LOC_STATUS: item.locacoes?.loc_status,
    LOC_DATA_CAD: item.locacoes?.loc_data_cad,
    LOC_DATA_PREVISTA: item.locacoes?.loc_data_prevista,
    FIL_NOME: item.filmes?.fil_nome,
    CAT_NOME: item.filmes?.categorias?.cat_nome,
    EXA_CODIGO: item.exemplares?.exa_codigo,
    ITN_VALOR_LOC: item.itn_valor_loc,
    ITN_VALOR_MULTA: item.itn_valor_multa
  })));
});

app.get('/api/clientes/:id/locacoes', async (req, res) => {
  const clienteId = validarCampoId(req.params.id, 'cliente', res);
  if (!clienteId) return;

  const { data, error } = await supabase
    .from('locacoes')
    .select('*, clientes(cli_nome)')
    .eq('loc_cli_id', clienteId)
    .order('loc_id', { ascending: false });
  if (error) return responderErro(res, error);
  res.json(data.map(locacaoParaFront));
});

app.get('/api/relatorios/locacoes-abertas', async (req, res) => {
  const { data, error } = await supabase
    .from('locacoes')
    .select('*, clientes(cli_nome)')
    .eq('loc_status', 'ABERTA')
    .order('loc_id', { ascending: false });
  if (error) return responderErro(res, error);
  res.json(data.map(locacaoParaFront));
});

app.get('/api/relatorios/atrasos', async (req, res) => {
  const { data, error } = await supabase
    .from('locacoes')
    .select('loc_id, loc_data_prevista, clientes(cli_nome)')
    .eq('loc_status', 'ABERTA')
    .lt('loc_data_prevista', new Date().toISOString().slice(0, 10))
    .order('loc_data_prevista');
  if (error) return responderErro(res, error);

  res.json(data.map(loc => {
    const diasAtraso = Math.max(0, Math.floor((Date.now() - new Date(`${loc.loc_data_prevista}T00:00:00`).getTime()) / 86400000));
    return {
      CLI_NOME: loc.clientes?.cli_nome,
      LOC_ID: loc.loc_id,
      LOC_DATA_PREVISTA: loc.loc_data_prevista,
      DIAS_ATRASO: diasAtraso,
      MULTA_PREVISTA: Number((diasAtraso * valorMultaPorDia).toFixed(2))
    };
  }));
});

app.get('/api/relatorios/multas', async (req, res) => {
  const { data, error } = await supabase
    .from('locacoes')
    .select('*, clientes(cli_nome)')
    .gt('loc_multa_total', 0)
    .order('loc_id', { ascending: false });
  if (error) return responderErro(res, error);
  res.json(data.map(locacaoParaFront));
});

app.use('/api', (req, res) => {
  res.status(404).json({ erro: 'Rota da API não encontrada.' });
});

app.listen(port, () => console.log(`Servidor: http://localhost:${port}`));
