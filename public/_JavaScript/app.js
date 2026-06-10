const estado = {
  entidadeAtual: document.body.dataset.entidade || null,
  registroSelecionado: null,
  dados: [],
  ordenacao: {
    coluna: null,
    direcao: 'asc'
  },
  cache: {
    clientes: [],
    categorias: [],
    filmes: [],
    exemplares: [],
    locacoes: []
  },
  cacheCarregado: false,
  conectado: false
};

const opcoes = {
  simNao: [
    { valor: 'SIM', texto: 'SIM' },
    { valor: 'NAO', texto: 'NAO' }
  ],
  tipoExemplar: [
    { valor: 'FISICO', texto: 'FISICO' },
    { valor: 'DIGITAL', texto: 'DIGITAL' }
  ],
  statusExemplar: [
    { valor: 'DISPONIVEL', texto: 'DISPONIVEL' },
    { valor: 'ALUGADO', texto: 'ALUGADO' },
    { valor: 'MANUTENCAO', texto: 'MANUTENCAO' },
    { valor: 'INATIVO', texto: 'INATIVO' }
  ],
  formaPagamento: [
    { valor: 'DINHEIRO', texto: 'DINHEIRO' },
    { valor: 'PIX', texto: 'PIX' },
    { valor: 'CARTAO', texto: 'CARTAO' },
    { valor: 'BOLETO', texto: 'BOLETO' }
  ],
  statusLocacao: [
    { valor: 'ABERTA', texto: 'ABERTA' },
    { valor: 'DEVOLVIDA', texto: 'DEVOLVIDA' },
    { valor: 'CANCELADA', texto: 'CANCELADA' }
  ]
};

const configuracoes = {
  clientes: {
    titulo: 'Clientes',
    endpoint: '/api/clientes',
    id: 'CLI_ID',
    campos: [
      { nome: 'CLI_NOME', label: 'Nome do cliente', tipo: 'text', obrigatorio: true },
      { nome: 'CLI_DOCUMENTO', label: 'Documento', tipo: 'text', placeholder: 'CPF ou RG' },
      { nome: 'CLI_EMAIL', label: 'E-mail', tipo: 'email' },
      { nome: 'CLI_TELEFONE', label: 'Telefone', tipo: 'text', placeholder: '(62) 99999-9999' },
      { nome: 'CLI_SALDO', label: 'Saldo', tipo: 'number', step: '0.01', valorPadrao: '0' },
      { nome: 'CLI_ATIVO', label: 'Ativo', tipo: 'select-estatico', opcoes: 'simNao', valorPadrao: 'SIM' }
    ]
  },
  categorias: {
    titulo: 'Categorias',
    endpoint: '/api/categorias',
    id: 'CAT_ID',
    campos: [
      { nome: 'CAT_NOME', label: 'Nome da categoria', tipo: 'text', obrigatorio: true }
    ]
  },
  filmes: {
    titulo: 'Filmes',
    endpoint: '/api/filmes',
    id: 'FIL_ID',
    campos: [
      { nome: 'FIL_NOME', label: 'Nome do filme', tipo: 'text', obrigatorio: true },
      { nome: 'FIL_CAT_ID', label: 'Categoria', tipo: 'select', origem: 'categorias', value: 'CAT_ID', text: 'CAT_NOME', obrigatorio: true },
      { nome: 'FIL_ANO', label: 'Ano', tipo: 'number' },
      { nome: 'FIL_CLASSIFICACAO', label: 'Classificação', tipo: 'text', placeholder: 'L, 10, 12, 14...' },
      { nome: 'FIL_DURACAO_MIN', label: 'Duração em min', tipo: 'number' },
      { nome: 'FIL_VALOR_PADRAO', label: 'Valor padrão', tipo: 'number', step: '0.01', valorPadrao: '10' },
      { nome: 'FIL_ATIVO', label: 'Ativo', tipo: 'select-estatico', opcoes: 'simNao', valorPadrao: 'SIM' }
    ]
  },
  exemplares: {
    titulo: 'Exemplares',
    endpoint: '/api/exemplares',
    id: 'EXA_ID',
    campos: [
      { nome: 'EXA_FIL_ID', label: 'Filme', tipo: 'select', origem: 'filmes', value: 'FIL_ID', text: 'FIL_NOME', obrigatorio: true },
      { nome: 'EXA_CODIGO', label: 'Código do exemplar', tipo: 'text', obrigatorio: true },
      { nome: 'EXA_TIPO', label: 'Tipo', tipo: 'select-estatico', opcoes: 'tipoExemplar', valorPadrao: 'FISICO' },
      { nome: 'EXA_STATUS', label: 'Status', tipo: 'select-estatico', opcoes: 'statusExemplar', valorPadrao: 'DISPONIVEL' }
    ]
  },
  locacoes: {
    titulo: 'Locações',
    endpoint: '/api/locacoes',
    id: 'LOC_ID',
    acaoEspecial: 'devolver',
    campos: [
      { nome: 'LOC_CLI_ID', label: 'Cliente', tipo: 'select', origem: 'clientes', value: 'CLI_ID', text: 'CLI_NOME', obrigatorio: true },
      { nome: 'LOC_DATA_PREVISTA', label: 'Data prevista', tipo: 'date', obrigatorio: true },
      { nome: 'LOC_STATUS', label: 'Status', tipo: 'select-estatico', opcoes: 'statusLocacao', valorPadrao: 'ABERTA' }
    ]
  },
  itens: {
    titulo: 'Itens da locação',
    endpoint: '/api/itens',
    id: 'ITN_ID',
    campos: [
      { nome: 'ITN_LOC_ID', label: 'Locação aberta', tipo: 'select', origem: 'locacoes', value: 'LOC_ID', text: 'LOC_ID', prefixo: 'Locação #', filtro: item => item.LOC_STATUS === 'ABERTA', obrigatorio: true },
      { nome: 'ITN_EXA_ID', label: 'Exemplar disponível', tipo: 'select', origem: 'exemplares', value: 'EXA_ID', text: 'EXA_CODIGO', complemento: 'FIL_NOME', filtro: item => item.EXA_STATUS === 'DISPONIVEL', obrigatorio: true },
      { nome: 'ITN_VALOR_LOC', label: 'Valor da locação', tipo: 'number', step: '0.01', obrigatorio: true }
    ]
  },
  pagamentos: {
    titulo: 'Pagamentos',
    endpoint: '/api/pagamentos',
    id: 'PAG_ID',
    campos: [
      { nome: 'PAG_LOC_ID', label: 'Locação', tipo: 'select', origem: 'locacoes', value: 'LOC_ID', text: 'LOC_ID', prefixo: 'Locação #', obrigatorio: true },
      { nome: 'PAG_VALOR', label: 'Valor pago', tipo: 'number', step: '0.01', obrigatorio: true },
      { nome: 'PAG_FORMA', label: 'Forma', tipo: 'select-estatico', opcoes: 'formaPagamento', valorPadrao: 'DINHEIRO' },
      { nome: 'PAG_OBSERVACAO', label: 'Observação', tipo: 'text' }
    ]
  },
  disponiveis: {
    titulo: 'Filmes disponíveis',
    endpoint: '/api/filmes/disponiveis',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  alugados: {
    titulo: 'Filmes alugados',
    endpoint: '/api/filmes/alugados',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  abertas: {
    titulo: 'Locações em aberto',
    endpoint: '/api/relatorios/locacoes-abertas',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  atrasos: {
    titulo: 'Relatório de atrasos',
    endpoint: '/api/relatorios/atrasos',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  multas: {
    titulo: 'Relatório de multas',
    endpoint: '/api/relatorios/multas',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  relatorio: {
    titulo: 'Relatório geral de locações',
    endpoint: '/api/locacoes/detalhes',
    id: null,
    campos: [],
    somenteLeitura: true
  }
};

const form = document.querySelector('#form-crud');
const tabela = document.querySelector('#tabela');
const tituloEntidade = document.querySelector('#titulo-entidade');
const subtitulo = document.querySelector('#subtitulo');
const contador = document.querySelector('#contador');
const feedback = document.querySelector('#feedback');
const btnExcluir = document.querySelector('#btn-excluir');
const btnLimpar = document.querySelector('#btn-limpar');
const btnImprimir = document.querySelector('#btn-imprimir');
const btnRecibo = document.querySelector('#btn-recibo');
const busca = document.querySelector('#busca');
const formTmdb = document.querySelector('#form-tmdb');
const tmdbBusca = document.querySelector('#tmdb-busca');
const tmdbResultados = document.querySelector('#tmdb-resultados');
const menuItens = document.querySelectorAll('.menu-item');
const formArea = document.querySelector('#form-area');
const reportTabs = document.querySelectorAll('[data-relatorio]');
const topbar = document.querySelector('.topbar');

function redirecionarLogin() {
  window.location.href = `/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}

function renderizarUsuario(usuario) {
  if (!topbar || !usuario || document.querySelector('.auth-menu')) return;

  topbar.classList.add('has-auth');

  const authMenu = document.createElement('div');
  authMenu.className = 'auth-menu';

  const nome = document.createElement('span');
  nome.className = 'auth-user';
  nome.textContent = usuario.nome;

  const sair = document.createElement('button');
  sair.type = 'button';
  sair.className = 'secondary-button auth-logout';
  sair.textContent = 'Sair';
  sair.addEventListener('click', async () => {
    sair.disabled = true;
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      window.location.href = '/login.html';
    }
  });

  authMenu.append(nome, sair);
  topbar.appendChild(authMenu);
}

async function verificarSessaoAtual() {
  try {
    const resposta = await fetch('/auth/session', {
      credentials: 'include'
    });
    if (resposta.status === 401) {
      redirecionarLogin();
      return null;
    }

    if (!resposta.ok) throw new Error('Sessão indisponível.');
    const dados = await resposta.json();
    renderizarUsuario(dados.usuario);
    return dados.usuario;
  } catch (erro) {
    console.error('Falha ao verificar sessão:', erro);
    redirecionarLogin();
    return null;
  }
}

function formatarCampo(campo) {
  const nomes = {
    CLI_ID: 'Cód. cliente',
    CLI_NOME: 'Cliente',
    CLI_DOCUMENTO: 'Documento',
    CLI_EMAIL: 'E-mail',
    CLI_TELEFONE: 'Telefone',
    CLI_DATA_CAD: 'Cadastro',
    CLI_SALDO: 'Saldo',
    CLI_ATIVO: 'Ativo',
    CAT_ID: 'Cód. categoria',
    CAT_NOME: 'Categoria',
    CAT_DATA_CAD: 'Cadastro',
    FIL_ID: 'Cód. filme',
    FIL_TMDB_ID: 'Cód. TMDB',
    FIL_POSTER: 'Pôster',
    FIL_NOME: 'Filme',
    FIL_CAT_ID: 'Cód. categoria',
    FIL_ANO: 'Ano',
    FIL_CLASSIFICACAO: 'Classificação',
    FIL_DURACAO_MIN: 'Duração',
    FIL_VALOR_PADRAO: 'Valor padrão',
    QTD_DISPONIVEL: 'Disponíveis',
    QTD_ALUGADA: 'Alugados',
    FIL_ATIVO: 'Ativo',
    FIL_DATA_CAD: 'Cadastro',
    EXA_ID: 'Cód. exemplar',
    EXA_FIL_ID: 'Cód. filme',
    EXA_CODIGO: 'Exemplar',
    EXA_TIPO: 'Tipo',
    EXA_STATUS: 'Status',
    EXA_DATA_CAD: 'Cadastro',
    LOC_ID: 'Cód. locação',
    LOC_CLI_ID: 'Cód. cliente',
    LOC_DATA_CAD: 'Data da locação',
    LOC_DATA_PREVISTA: 'Devolução prevista',
    LOC_DATA_DEVOLUCAO: 'Devolução real',
    LOC_STATUS: 'Status',
    LOC_VALOR_TOTAL: 'Valor total',
    LOC_MULTA_TOTAL: 'Multa',
    LOC_PAGO_TOTAL: 'Pago',
    SALDO_DEVEDOR: 'Saldo devedor',
    ITN_ID: 'Cód. item',
    ITN_LOC_ID: 'Cód. locação',
    ITN_FIL_ID: 'Cód. filme',
    ITN_EXA_ID: 'Cód. exemplar',
    ITN_VALOR_LOC: 'Valor',
    ITN_VALOR_MULTA: 'Multa',
    ITN_DATA_DEVOLUCAO: 'Devolução',
    ITN_STATUS: 'Status',
    PAG_ID: 'Cód. pagamento',
    PAG_LOC_ID: 'Cód. locação',
    PAG_VALOR: 'Valor',
    PAG_FORMA: 'Forma',
    PAG_DATA: 'Data',
    PAG_OBSERVACAO: 'Observação',
    DIAS_ATRASO: 'Dias de atraso',
    MULTA_PREVISTA: 'Multa prevista'
  };

  return nomes[campo] || campo.replaceAll('_', ' ').toLowerCase();
}

function formatarValor(valor, campo = '') {
  if (valor === null || valor === undefined) return '';

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString('pt-BR');
  }

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T00:00:00`).toLocaleDateString('pt-BR');
  }

  if (campo.includes('VALOR') || campo.includes('SALDO') || campo.includes('MULTA') || campo.includes('PAGO')) {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return valor;
}

function valorOrdenavel(valor, campo = '') {
  if (valor === null || valor === undefined || valor === '') {
    return { tipo: 'vazio', valor: null };
  }

  if (campo === 'FIL_POSTER') {
    return { tipo: 'texto', valor: String(valor) };
  }

  if (typeof valor === 'number') {
    return { tipo: 'numero', valor };
  }

  const texto = String(valor).trim();
  const campoNumerico = /(ID|QTD|DIAS|ANO|DURACAO|VALOR|SALDO|MULTA|PAGO)/i.test(campo);
  const numero = Number(texto.replace(/\./g, '').replace(',', '.'));
  if (campoNumerico && Number.isFinite(numero)) {
    return { tipo: 'numero', valor: numero };
  }

  const dataIso = /^\d{4}-\d{2}-\d{2}(T|\s|$)/.test(texto);
  const dataBr = /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto);
  if (dataIso) {
    const timestamp = new Date(texto).getTime();
    if (Number.isFinite(timestamp)) return { tipo: 'data', valor: timestamp };
  }
  if (dataBr) {
    const [, dia, mes, ano, hora = '00', minuto = '00', segundo = '00'] = dataBr;
    const timestamp = new Date(`${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`).getTime();
    if (Number.isFinite(timestamp)) return { tipo: 'data', valor: timestamp };
  }

  return { tipo: 'texto', valor: texto.toLocaleLowerCase('pt-BR') };
}

function compararRegistros(a, b, coluna) {
  const valorA = valorOrdenavel(a[coluna], coluna);
  const valorB = valorOrdenavel(b[coluna], coluna);

  if (valorA.tipo === 'vazio' && valorB.tipo === 'vazio') return 0;
  if (valorA.tipo === 'vazio') return 1;
  if (valorB.tipo === 'vazio') return -1;

  if (valorA.tipo === 'texto' || valorB.tipo === 'texto') {
    return String(valorA.valor).localeCompare(String(valorB.valor), 'pt-BR', {
      numeric: true,
      sensitivity: 'base'
    });
  }

  return valorA.valor - valorB.valor;
}

function ordenarDados(dados) {
  const { coluna, direcao } = estado.ordenacao;
  if (!coluna) return [...dados];

  const fator = direcao === 'desc' ? -1 : 1;
  return [...dados].sort((a, b) => compararRegistros(a, b, coluna) * fator);
}

function alternarOrdenacao(coluna) {
  const mesmaColuna = estado.ordenacao.coluna === coluna;
  estado.ordenacao = {
    coluna,
    direcao: mesmaColuna && estado.ordenacao.direcao === 'asc' ? 'desc' : 'asc'
  };
  aplicarFiltro();
}

function renderizarCelula(td, valor, coluna) {
  if (coluna === 'FIL_POSTER') {
    td.className = 'poster-cell';

    if (valor) {
      const img = document.createElement('img');
      img.className = 'table-poster';
      img.src = valor;
      img.alt = 'Pôster do filme';
      img.loading = 'lazy';
      img.decoding = 'async';
      td.appendChild(img);
      return;
    }

    const placeholder = document.createElement('span');
    placeholder.className = 'table-poster-placeholder';
    placeholder.textContent = 'Sem pôster';
    td.appendChild(placeholder);
    return;
  }

  td.textContent = formatarValor(valor, coluna);
}

function exibirFeedback(texto, tipo = 'ok') {
  feedback.textContent = texto;
  feedback.className = `feedback ${tipo}`;
}

function confirmarAcao({ titulo, mensagem, textoConfirmar = 'Confirmar', perigoso = false }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'presentation');

    const modal = document.createElement('section');
    modal.className = 'confirm-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-title');
    modal.setAttribute('aria-describedby', 'confirm-message');

    const heading = document.createElement('h2');
    heading.id = 'confirm-title';
    heading.textContent = titulo;

    const texto = document.createElement('p');
    texto.id = 'confirm-message';
    texto.textContent = mensagem;

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'secondary-button';
    cancelar.textContent = 'Cancelar';

    const confirmar = document.createElement('button');
    confirmar.type = 'button';
    confirmar.className = perigoso ? 'danger-button' : '';
    confirmar.textContent = textoConfirmar;

    actions.append(cancelar, confirmar);
    modal.append(heading, texto, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    confirmar.focus();

    const fechar = resultado => {
      document.removeEventListener('keydown', tratarTecla);
      overlay.remove();
      resolve(resultado);
    };

    const tratarTecla = evento => {
      if (evento.key === 'Escape') fechar(false);
    };

    confirmar.addEventListener('click', () => fechar(true));
    cancelar.addEventListener('click', () => fechar(false));
    overlay.addEventListener('click', evento => {
      if (evento.target === overlay) fechar(false);
    });
    document.addEventListener('keydown', tratarTecla);
  });
}

async function fetchJson(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes
  });
  const dados = await resposta.json();

  if (!resposta.ok) {
    if (resposta.status === 401) redirecionarLogin();
    throw new Error(dados.erro || dados.detalhe || 'Erro na operação.');
  }

  return dados;
}

async function carregarCache(force = false) {
  if (estado.cacheCarregado && !force) return;
  
  try {
    const [clientes, categorias, filmes, exemplares, locacoes] = await Promise.all([
      fetchJson('/api/clientes'),
      fetchJson('/api/categorias'),
      fetchJson('/api/filmes'),
      fetchJson('/api/exemplares'),
      fetchJson('/api/locacoes')
    ]);

    estado.cache = { clientes, categorias, filmes, exemplares, locacoes };
    estado.cacheCarregado = true;
    estado.conectado = true;
  } catch (erro) {
    estado.conectado = false;
    throw erro;
  }
}

function precisaCache(config) {
  return !config.somenteLeitura && config.campos.some(campo => campo.tipo === 'select');
}

function criarOptions(input, lista, campo) {
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione...';
  input.appendChild(placeholder);

  lista.forEach(item => {
    const option = document.createElement('option');
    option.value = item[campo.value] ?? item.valor;
    const texto = item[campo.text] ?? item.texto;
    const complemento = campo.complemento && item[campo.complemento] ? ` - ${item[campo.complemento]}` : '';
    option.textContent = `${campo.prefixo || ''}${texto}${complemento}`;
    input.appendChild(option);
  });
}

function criarCampo(campo) {
  const grupo = document.createElement('label');
  grupo.className = 'field';
  grupo.textContent = campo.label;

  let input;
  if (campo.tipo === 'select' || campo.tipo === 'select-estatico') {
    input = document.createElement('select');
    const origem = campo.tipo === 'select-estatico'
      ? opcoes[campo.opcoes] || []
      : (estado.cache[campo.origem] || []).filter(item => !campo.filtro || campo.filtro(item));
    criarOptions(input, origem, campo.tipo === 'select-estatico' ? { value: 'valor', text: 'texto' } : campo);
  } else {
    input = document.createElement('input');
    input.type = campo.tipo;
    if (campo.step) input.step = campo.step;
    if (campo.placeholder) input.placeholder = campo.placeholder;
    if (campo.valorPadrao !== undefined) input.value = campo.valorPadrao;
  }

  input.name = campo.nome;
  if (campo.obrigatorio) input.required = true;
  if (campo.valorPadrao !== undefined && input.tagName === 'SELECT') input.value = campo.valorPadrao;
  grupo.appendChild(input);
  return grupo;
}

function renderizarFormulario() {
  const config = configuracoes[estado.entidadeAtual];
  form.innerHTML = '';
  feedback.textContent = '';

  if (config.somenteLeitura) {
    formArea.hidden = true;
    return;
  }

  formArea.hidden = false;
  config.campos.forEach(campo => form.appendChild(criarCampo(campo)));
}

function preencherFormulario(registro) {
  const config = configuracoes[estado.entidadeAtual];
  if (config.somenteLeitura) return;

  estado.registroSelecionado = registro;
  btnExcluir.disabled = false;
  if (btnRecibo) btnRecibo.disabled = estado.entidadeAtual !== 'locacoes';

  config.campos.forEach(campo => {
    const input = form.elements[campo.nome];
    if (!input) return;
    const valor = registro[campo.nome] ?? '';
    if (input.tagName === 'SELECT' && valor && ![...input.options].some(option => option.value === String(valor))) {
      const option = document.createElement('option');
      option.value = valor;
      option.textContent = `${campo.prefixo || ''}${valor}`;
      input.appendChild(option);
    }
    input.value = input.type === 'date' && valor ? String(valor).slice(0, 10) : valor;
  });

  exibirFeedback(`Registro #${registro[config.id]} selecionado para edição.`, 'info');
}

function limparFormulario() {
  if (!estado.entidadeAtual) return;
  const config = configuracoes[estado.entidadeAtual];
  estado.registroSelecionado = null;
  if (btnExcluir) btnExcluir.disabled = true;
  if (btnRecibo) btnRecibo.disabled = true;
  form.reset();

  config.campos.forEach(campo => {
    if (campo.valorPadrao !== undefined && form.elements[campo.nome]) {
      form.elements[campo.nome].value = campo.valorPadrao;
    }
  });

  feedback.textContent = '';
}

async function devolverLocacao(registro) {
  if (registro.LOC_STATUS !== 'ABERTA') {
    exibirFeedback('Apenas locações abertas podem ser devolvidas.', 'erro');
    return;
  }

  const confirmar = await confirmarAcao({
    titulo: 'Registrar devolução',
    mensagem: `Registrar devolução da locação #${registro.LOC_ID}?`,
    textoConfirmar: 'Devolver'
  });
  if (!confirmar) return;

  try {
    const resposta = await fetchJson(`/api/locacoes/${registro.LOC_ID}/devolver`, { method: 'POST' });
    const mensagem = resposta.mensagem || 'Devolução registrada.';
    estado.cacheCarregado = false;
    await carregarDados();
    exibirFeedback(mensagem, 'ok');
  } catch (erro) {
    exibirFeedback(erro.message, 'erro');
  }
}

function imprimirRecibo() {
  const registro = estado.registroSelecionado;
  if (!registro || estado.entidadeAtual !== 'locacoes') return;

  const recibo = window.open('', '_blank', 'width=760,height=640');
  recibo.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Recibo de locação #${registro.LOC_ID}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #182033; }
        h1 { margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { border: 1px solid #d9e1ec; padding: 10px; }
        strong { display: inline-block; min-width: 180px; }
      </style>
    </head>
    <body>
      <h1>Recibo de locação</h1>
      <table>
        <tr><td><strong>Locação:</strong> #${formatarValor(registro.LOC_ID)}</td></tr>
        <tr><td><strong>Cliente:</strong> ${formatarValor(registro.CLI_NOME)}</td></tr>
        <tr><td><strong>Data da locação:</strong> ${formatarValor(registro.LOC_DATA_CAD)}</td></tr>
        <tr><td><strong>Devolução prevista:</strong> ${formatarValor(registro.LOC_DATA_PREVISTA)}</td></tr>
        <tr><td><strong>Status:</strong> ${formatarValor(registro.LOC_STATUS)}</td></tr>
        <tr><td><strong>Valor total:</strong> ${formatarValor(registro.LOC_VALOR_TOTAL, 'LOC_VALOR_TOTAL')}</td></tr>
        <tr><td><strong>Multa:</strong> ${formatarValor(registro.LOC_MULTA_TOTAL, 'LOC_MULTA_TOTAL')}</td></tr>
        <tr><td><strong>Pago:</strong> ${formatarValor(registro.LOC_PAGO_TOTAL, 'LOC_PAGO_TOTAL')}</td></tr>
        <tr><td><strong>Saldo devedor:</strong> ${formatarValor(registro.SALDO_DEVEDOR, 'SALDO_DEVEDOR')}</td></tr>
      </table>
      <script>window.print();<\/script>
    </body>
    </html>
  `);
  recibo.document.close();
}

function renderizarTabela(dados) {
  const config = configuracoes[estado.entidadeAtual];
  const dadosOrdenados = ordenarDados(dados);
  tabela.innerHTML = '';
  contador.textContent = `${dados.length} registro${dados.length === 1 ? '' : 's'}`;

  if (!dadosOrdenados.length) {
    tabela.innerHTML = '<tbody><tr><td>Nenhum registro encontrado.</td></tr></tbody>';
    return;
  }

  const colunas = Object.keys(dadosOrdenados[0]);
  contador.textContent = `${dados.length} registro${dados.length === 1 ? '' : 's'} · clique nos títulos para ordenar`;
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');

  colunas.forEach(coluna => {
    const th = document.createElement('th');
    const ativo = estado.ordenacao.coluna === coluna;
    const botaoOrdenar = document.createElement('button');
    botaoOrdenar.type = 'button';
    botaoOrdenar.className = `sort-button${ativo ? ' active' : ''}`;
    botaoOrdenar.textContent = `${formatarCampo(coluna)} ${ativo ? (estado.ordenacao.direcao === 'asc' ? '↑' : '↓') : '↕'}`;
    botaoOrdenar.setAttribute('aria-label', `Ordenar por ${formatarCampo(coluna)}`);
    botaoOrdenar.title = ativo && estado.ordenacao.direcao === 'asc'
      ? 'Ordenar em ordem decrescente'
      : 'Ordenar em ordem crescente';
    botaoOrdenar.addEventListener('click', () => alternarOrdenacao(coluna));
    th.setAttribute('aria-sort', ativo ? (estado.ordenacao.direcao === 'asc' ? 'ascending' : 'descending') : 'none');
    th.appendChild(botaoOrdenar);
    trHead.appendChild(th);
  });

  if (!config.somenteLeitura || config.acaoEspecial) {
    const thAcao = document.createElement('th');
    thAcao.textContent = 'Ação';
    trHead.appendChild(thAcao);
  }

  thead.appendChild(trHead);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');
  dadosOrdenados.forEach(registro => {
    const tr = document.createElement('tr');
    colunas.forEach(coluna => {
      const td = document.createElement('td');
      renderizarCelula(td, registro[coluna], coluna);
      tr.appendChild(td);
    });

    if (!config.somenteLeitura || config.acaoEspecial) {
      const tdAcao = document.createElement('td');
      if (!config.somenteLeitura) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'table-button';
        botao.textContent = 'Selecionar';
        botao.addEventListener('click', () => preencherFormulario(registro));
        tdAcao.appendChild(botao);
      }

      if (config.acaoEspecial === 'devolver' && registro.LOC_STATUS === 'ABERTA') {
        const botaoDevolver = document.createElement('button');
        botaoDevolver.type = 'button';
        botaoDevolver.className = 'table-button success-button';
        botaoDevolver.textContent = 'Devolver';
        botaoDevolver.addEventListener('click', () => devolverLocacao(registro));
        tdAcao.appendChild(botaoDevolver);
      }

      tr.appendChild(tdAcao);
    }

    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
}

async function carregarDados() {
  if (!estado.entidadeAtual) return;
  const config = configuracoes[estado.entidadeAtual];
  tituloEntidade.textContent = config.titulo;
  subtitulo.textContent = config.somenteLeitura ? 'Consulta e relatório' : 'Formulário de manutenção';

  try {
    renderizarFormulario();
    if (precisaCache(config)) {
      await carregarCache();
      renderizarFormulario();
    }
    estado.dados = await fetchJson(config.endpoint);
    aplicarFiltro();
    limparFormulario();
  } catch (erro) {
    console.error('Falha ao carregar dados:', erro);
    renderizarFormulario();
    exibirFeedback('O banco de dados parece estar offline. Verifique a conexão.', 'erro');
    renderizarTabela([]);
  }
}

function aplicarFiltro() {
  const termo = busca.value.trim().toLowerCase();
  if (!termo) {
    renderizarTabela(estado.dados);
    return;
  }

  const filtrados = estado.dados.filter(registro => {
    return Object.values(registro).some(valor => String(valor ?? '').toLowerCase().includes(termo));
  });

  renderizarTabela(filtrados);
}

function encontrarCategoriaPorNome(nome) {
  if (!nome) return null;
  const normalizado = nome.trim().toLowerCase();
  return estado.cache.categorias.find(categoria => categoria.CAT_NOME?.trim().toLowerCase() === normalizado) || null;
}

function preencherFilmeComTmdb(filme) {
  if (estado.entidadeAtual !== 'filmes') return;
  estado.registroSelecionado = null;
  if (btnExcluir) btnExcluir.disabled = true;

  const campos = {
    FIL_NOME: filme.titulo,
    FIL_ANO: filme.ano,
    FIL_CLASSIFICACAO: filme.classificacao,
    FIL_DURACAO_MIN: filme.duracao,
    FIL_VALOR_PADRAO: form.elements.FIL_VALOR_PADRAO?.value || '10',
    FIL_ATIVO: 'SIM'
  };

  Object.entries(campos).forEach(([nome, valor]) => {
    if (form.elements[nome] && valor !== null && valor !== undefined) form.elements[nome].value = valor;
  });

  const categoria = encontrarCategoriaPorNome(filme.categoria);
  if (categoria && form.elements.FIL_CAT_ID) {
    form.elements.FIL_CAT_ID.value = categoria.CAT_ID;
    exibirFeedback(`Dados de "${filme.titulo}" preenchidos a partir do TMDB.`, 'info');
  } else {
    exibirFeedback(`Dados preenchidos. Cadastre ou selecione a categoria "${filme.categoria || 'Sem categoria'}" antes de salvar.`, 'info');
  }
}

function renderizarResultadosTmdb(filmes) {
  if (!tmdbResultados) return;
  tmdbResultados.innerHTML = '';

  if (!filmes.length) {
    tmdbResultados.innerHTML = '<p class="tmdb-empty">Nenhum filme encontrado no TMDB.</p>';
    return;
  }

  filmes.forEach(filme => {
    const card = document.createElement('article');
    card.className = 'tmdb-card';

    const poster = document.createElement('div');
    poster.className = 'tmdb-poster';
    if (filme.posterUrl) {
      const img = document.createElement('img');
      img.src = filme.posterUrl;
      img.alt = `Pôster de ${filme.titulo}`;
      poster.appendChild(img);
    } else {
      poster.textContent = 'TMDB';
    }

    const info = document.createElement('div');
    info.className = 'tmdb-info';

    const titulo = document.createElement('h3');
    titulo.textContent = `${filme.titulo || 'Sem título'}${filme.ano ? ` (${filme.ano})` : ''}`;

    const meta = document.createElement('p');
    meta.textContent = [filme.categoria, filme.dataLancamento].filter(Boolean).join(' • ') || 'Sem metadados';

    const sinopse = document.createElement('p');
    sinopse.className = 'tmdb-overview';
    sinopse.textContent = filme.sinopse || 'Sem sinopse disponível.';

    const actions = document.createElement('div');
    actions.className = 'tmdb-actions';

    const btnUsar = document.createElement('button');
    btnUsar.type = 'button';
    btnUsar.className = 'secondary-button';
    btnUsar.textContent = 'Usar dados';
    btnUsar.addEventListener('click', async () => {
      try {
        const detalhes = await fetchJson(`/api/tmdb/movie/${filme.tmdbId}`);
        preencherFilmeComTmdb(detalhes);
      } catch (erro) {
        exibirFeedback(erro.message, 'erro');
      }
    });

    const btnImportar = document.createElement('button');
    btnImportar.type = 'button';
    btnImportar.textContent = 'Importar';
    btnImportar.addEventListener('click', async () => {
      try {
        const resposta = await fetchJson(`/api/tmdb/import/${filme.tmdbId}`, { method: 'POST' });
        estado.cacheCarregado = false;
        await carregarDados();
        exibirFeedback(resposta.mensagem || 'Filme importado do TMDB.', 'ok');
      } catch (erro) {
        exibirFeedback(erro.message, 'erro');
      }
    });

    actions.append(btnUsar, btnImportar);
    info.append(titulo, meta, sinopse, actions);
    card.append(poster, info);
    tmdbResultados.appendChild(card);
  });
}

async function buscarFilmesTmdb(evento) {
  evento.preventDefault();
  const termo = tmdbBusca.value.trim();
  if (termo.length < 2) {
    exibirFeedback('Informe ao menos 2 caracteres para buscar no TMDB.', 'erro');
    return;
  }

  tmdbResultados.innerHTML = '<p class="tmdb-empty">Buscando no TMDB...</p>';

  try {
    const dados = await fetchJson(`/api/tmdb/search?query=${encodeURIComponent(termo)}`);
    renderizarResultadosTmdb(dados.resultados || []);
  } catch (erro) {
    tmdbResultados.innerHTML = '';
    exibirFeedback(erro.message, 'erro');
  }
}

function obterPayload() {
  const dados = new FormData(form);
  const payload = {};
  for (const [chave, valor] of dados.entries()) payload[chave] = valor;
  return payload;
}

async function salvarRegistro(evento) {
  evento.preventDefault();
  const config = configuracoes[estado.entidadeAtual];
  if (config.somenteLeitura) return;

  const payload = obterPayload();
  const editando = Boolean(estado.registroSelecionado) && !config.somenteCriar;
  const endpoint = editando
    ? `${config.endpoint}/${estado.registroSelecionado[config.id]}`
    : config.endpoint;

  try {
    const resposta = await fetchJson(endpoint, {
      method: editando ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });

    const mensagem = resposta.mensagem || 'Registro salvo com sucesso.';
    estado.cacheCarregado = false;
    await carregarDados();
    exibirFeedback(mensagem, 'ok');
  } catch (erro) {
    exibirFeedback(erro.message, 'erro');
  }
}

async function excluirRegistro() {
  const config = configuracoes[estado.entidadeAtual];
  if (!estado.registroSelecionado || config.somenteLeitura) return;

  const id = estado.registroSelecionado[config.id];
  const confirmar = await confirmarAcao({
    titulo: 'Excluir registro',
    mensagem: `Deseja realmente excluir o registro #${id}?`,
    textoConfirmar: 'Excluir',
    perigoso: true
  });
  if (!confirmar) return;

  try {
    const resposta = await fetchJson(`${config.endpoint}/${id}`, { method: 'DELETE' });
    const mensagem = resposta.mensagem || 'Registro excluído com sucesso.';
    estado.cacheCarregado = false;
    await carregarDados();
    exibirFeedback(mensagem, 'ok');
  } catch (erro) {
    exibirFeedback(`${erro.message} Verifique se o registro não está sendo usado por outra tabela.`, 'erro');
  }
}

function trocarEntidade(entidade) {
  estado.entidadeAtual = entidade;
  estado.registroSelecionado = null;
  estado.ordenacao = { coluna: null, direcao: 'asc' };
  busca.value = '';

  menuItens.forEach(item => {
    item.classList.toggle('active', item.dataset.entidade === entidade);
  });

  carregarDados().catch(erro => {
    exibirFeedback(erro.message, 'erro');
    renderizarTabela([]);
  });
}

if (form) form.addEventListener('submit', salvarRegistro);
if (btnLimpar) btnLimpar.addEventListener('click', limparFormulario);
if (btnExcluir) btnExcluir.addEventListener('click', excluirRegistro);
if (btnRecibo) btnRecibo.addEventListener('click', imprimirRecibo);
if (busca) busca.addEventListener('input', aplicarFiltro);
if (btnImprimir) btnImprimir.addEventListener('click', () => window.print());
if (formTmdb) formTmdb.addEventListener('submit', buscarFilmesTmdb);

menuItens.forEach(item => {
  item.addEventListener('click', () => trocarEntidade(item.dataset.entidade));
});

reportTabs.forEach(botao => {
  botao.addEventListener('click', () => {
    reportTabs.forEach(item => item.classList.toggle('active', item === botao));
    trocarEntidade(botao.dataset.relatorio);
  });
});

verificarSessaoAtual().then(usuario => {
  if (usuario && estado.entidadeAtual) trocarEntidade(estado.entidadeAtual);
});
