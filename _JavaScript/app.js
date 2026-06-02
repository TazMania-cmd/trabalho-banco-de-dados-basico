const estado = {
  entidadeAtual: document.body.dataset.entidade || null,
  registroSelecionado: null,
  dados: [],
  cache: {
    clientes: [],
    categorias: [],
    filmes: [],
    exemplares: [],
    locacoes: []
  }
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
      { nome: 'FIL_CLASSIFICACAO', label: 'Classificacao', tipo: 'text', placeholder: 'L, 10, 12, 14...' },
      { nome: 'FIL_DURACAO_MIN', label: 'Duracao em min', tipo: 'number' },
      { nome: 'FIL_VALOR_PADRAO', label: 'Valor padrao', tipo: 'number', step: '0.01', valorPadrao: '10' },
      { nome: 'FIL_ATIVO', label: 'Ativo', tipo: 'select-estatico', opcoes: 'simNao', valorPadrao: 'SIM' }
    ]
  },
  exemplares: {
    titulo: 'Exemplares',
    endpoint: '/api/exemplares',
    id: 'EXA_ID',
    campos: [
      { nome: 'EXA_FIL_ID', label: 'Filme', tipo: 'select', origem: 'filmes', value: 'FIL_ID', text: 'FIL_NOME', obrigatorio: true },
      { nome: 'EXA_CODIGO', label: 'Codigo do exemplar', tipo: 'text', obrigatorio: true },
      { nome: 'EXA_TIPO', label: 'Tipo', tipo: 'select-estatico', opcoes: 'tipoExemplar', valorPadrao: 'FISICO' },
      { nome: 'EXA_STATUS', label: 'Status', tipo: 'select-estatico', opcoes: 'statusExemplar', valorPadrao: 'DISPONIVEL' }
    ]
  },
  locacoes: {
    titulo: 'Locacoes',
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
    titulo: 'Itens da locacao',
    endpoint: '/api/itens',
    id: 'ITN_ID',
    campos: [
      { nome: 'ITN_LOC_ID', label: 'Locacao aberta', tipo: 'select', origem: 'locacoes', value: 'LOC_ID', text: 'LOC_ID', prefixo: 'Locacao #', filtro: item => item.LOC_STATUS === 'ABERTA', obrigatorio: true },
      { nome: 'ITN_EXA_ID', label: 'Exemplar disponivel', tipo: 'select', origem: 'exemplares', value: 'EXA_ID', text: 'EXA_CODIGO', complemento: 'FIL_NOME', filtro: item => item.EXA_STATUS === 'DISPONIVEL', obrigatorio: true },
      { nome: 'ITN_VALOR_LOC', label: 'Valor da locacao', tipo: 'number', step: '0.01', obrigatorio: true }
    ]
  },
  pagamentos: {
    titulo: 'Pagamentos',
    endpoint: '/api/pagamentos',
    id: 'PAG_ID',
    campos: [
      { nome: 'PAG_LOC_ID', label: 'Locacao', tipo: 'select', origem: 'locacoes', value: 'LOC_ID', text: 'LOC_ID', prefixo: 'Locacao #', obrigatorio: true },
      { nome: 'PAG_VALOR', label: 'Valor pago', tipo: 'number', step: '0.01', obrigatorio: true },
      { nome: 'PAG_FORMA', label: 'Forma', tipo: 'select-estatico', opcoes: 'formaPagamento', valorPadrao: 'DINHEIRO' },
      { nome: 'PAG_OBSERVACAO', label: 'Observacao', tipo: 'text' }
    ]
  },
  disponiveis: {
    titulo: 'Filmes disponiveis',
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
    titulo: 'Locacoes em aberto',
    endpoint: '/api/relatorios/locacoes-abertas',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  atrasos: {
    titulo: 'Relatorio de atrasos',
    endpoint: '/api/relatorios/atrasos',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  multas: {
    titulo: 'Relatorio de multas',
    endpoint: '/api/relatorios/multas',
    id: null,
    campos: [],
    somenteLeitura: true
  },
  relatorio: {
    titulo: 'Relatorio geral de locacoes',
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
const statusConexao = document.querySelector('#status');
const menuItens = document.querySelectorAll('.menu-item');
const formArea = document.querySelector('#form-area');
const reportTabs = document.querySelectorAll('[data-relatorio]');

function formatarCampo(campo) {
  const nomes = {
    CLI_ID: 'Cod. cliente',
    CLI_NOME: 'Cliente',
    CLI_DOCUMENTO: 'Documento',
    CLI_EMAIL: 'E-mail',
    CLI_TELEFONE: 'Telefone',
    CLI_DATA_CAD: 'Cadastro',
    CLI_SALDO: 'Saldo',
    CLI_ATIVO: 'Ativo',
    CAT_ID: 'Cod. categoria',
    CAT_NOME: 'Categoria',
    CAT_DATA_CAD: 'Cadastro',
    FIL_ID: 'Cod. filme',
    FIL_NOME: 'Filme',
    FIL_CAT_ID: 'Cod. categoria',
    FIL_ANO: 'Ano',
    FIL_CLASSIFICACAO: 'Classificacao',
    FIL_DURACAO_MIN: 'Duracao',
    FIL_VALOR_PADRAO: 'Valor padrao',
    QTD_DISPONIVEL: 'Disponiveis',
    QTD_ALUGADA: 'Alugados',
    FIL_ATIVO: 'Ativo',
    FIL_DATA_CAD: 'Cadastro',
    EXA_ID: 'Cod. exemplar',
    EXA_FIL_ID: 'Cod. filme',
    EXA_CODIGO: 'Exemplar',
    EXA_TIPO: 'Tipo',
    EXA_STATUS: 'Status',
    EXA_DATA_CAD: 'Cadastro',
    LOC_ID: 'Cod. locacao',
    LOC_CLI_ID: 'Cod. cliente',
    LOC_DATA_CAD: 'Data da locacao',
    LOC_DATA_PREVISTA: 'Devolucao prevista',
    LOC_DATA_DEVOLUCAO: 'Devolucao real',
    LOC_STATUS: 'Status',
    LOC_VALOR_TOTAL: 'Valor total',
    LOC_MULTA_TOTAL: 'Multa',
    LOC_PAGO_TOTAL: 'Pago',
    SALDO_DEVEDOR: 'Saldo devedor',
    ITN_ID: 'Cod. item',
    ITN_LOC_ID: 'Cod. locacao',
    ITN_FIL_ID: 'Cod. filme',
    ITN_EXA_ID: 'Cod. exemplar',
    ITN_VALOR_LOC: 'Valor',
    ITN_VALOR_MULTA: 'Multa',
    ITN_DATA_DEVOLUCAO: 'Devolucao',
    ITN_STATUS: 'Status',
    PAG_ID: 'Cod. pagamento',
    PAG_LOC_ID: 'Cod. locacao',
    PAG_VALOR: 'Valor',
    PAG_FORMA: 'Forma',
    PAG_DATA: 'Data',
    PAG_OBSERVACAO: 'Observacao',
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

function exibirFeedback(texto, tipo = 'ok') {
  feedback.textContent = texto;
  feedback.className = `feedback ${tipo}`;
}

async function fetchJson(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes
  });
  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.erro || dados.detalhe || 'Erro na operacao.');
  }

  return dados;
}

async function carregarCache() {
  const [clientes, categorias, filmes, exemplares, locacoes] = await Promise.all([
    fetchJson('/api/clientes'),
    fetchJson('/api/categorias'),
    fetchJson('/api/filmes'),
    fetchJson('/api/exemplares'),
    fetchJson('/api/locacoes')
  ]);

  estado.cache = { clientes, categorias, filmes, exemplares, locacoes };
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
    input.value = input.type === 'date' && valor ? String(valor).slice(0, 10) : valor;
  });

  exibirFeedback(`Registro #${registro[config.id]} selecionado para edicao.`, 'info');
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
    exibirFeedback('Apenas locacoes abertas podem ser devolvidas.', 'erro');
    return;
  }

  const confirmar = confirm(`Registrar devolucao da locacao #${registro.LOC_ID}?`);
  if (!confirmar) return;

  try {
    const resposta = await fetchJson(`/api/locacoes/${registro.LOC_ID}/devolver`, { method: 'POST' });
    exibirFeedback(resposta.mensagem || 'Devolucao registrada.', 'ok');
    await carregarDados();
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
      <title>Recibo de locacao #${registro.LOC_ID}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 32px; color: #182033; }
        h1 { margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        td { border: 1px solid #d9e1ec; padding: 10px; }
        strong { display: inline-block; min-width: 180px; }
      </style>
    </head>
    <body>
      <h1>Recibo de locacao</h1>
      <table>
        <tr><td><strong>Locacao:</strong> #${formatarValor(registro.LOC_ID)}</td></tr>
        <tr><td><strong>Cliente:</strong> ${formatarValor(registro.CLI_NOME)}</td></tr>
        <tr><td><strong>Data da locacao:</strong> ${formatarValor(registro.LOC_DATA_CAD)}</td></tr>
        <tr><td><strong>Devolucao prevista:</strong> ${formatarValor(registro.LOC_DATA_PREVISTA)}</td></tr>
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
  tabela.innerHTML = '';
  contador.textContent = `${dados.length} registro${dados.length === 1 ? '' : 's'}`;

  if (!dados.length) {
    tabela.innerHTML = '<tbody><tr><td>Nenhum registro encontrado.</td></tr></tbody>';
    return;
  }

  const colunas = Object.keys(dados[0]);
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');

  colunas.forEach(coluna => {
    const th = document.createElement('th');
    th.textContent = formatarCampo(coluna);
    trHead.appendChild(th);
  });

  if (!config.somenteLeitura || config.acaoEspecial) {
    const thAcao = document.createElement('th');
    thAcao.textContent = 'Acao';
    trHead.appendChild(thAcao);
  }

  thead.appendChild(trHead);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');
  dados.forEach(registro => {
    const tr = document.createElement('tr');
    colunas.forEach(coluna => {
      const td = document.createElement('td');
      td.textContent = formatarValor(registro[coluna], coluna);
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
  subtitulo.textContent = config.somenteLeitura ? 'Consulta e relatorio' : 'Formulario de manutencao';

  await carregarCache();
  renderizarFormulario();
  estado.dados = await fetchJson(config.endpoint);
  aplicarFiltro();
  limparFormulario();
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

    exibirFeedback(resposta.mensagem || 'Registro salvo com sucesso.', 'ok');
    await carregarDados();
  } catch (erro) {
    exibirFeedback(erro.message, 'erro');
  }
}

async function excluirRegistro() {
  const config = configuracoes[estado.entidadeAtual];
  if (!estado.registroSelecionado || config.somenteLeitura) return;

  const id = estado.registroSelecionado[config.id];
  const confirmar = confirm(`Deseja realmente excluir o registro #${id}?`);
  if (!confirmar) return;

  try {
    const resposta = await fetchJson(`${config.endpoint}/${id}`, { method: 'DELETE' });
    exibirFeedback(resposta.mensagem || 'Registro excluido com sucesso.', 'ok');
    await carregarDados();
  } catch (erro) {
    exibirFeedback(`${erro.message} Verifique se o registro nao esta sendo usado por outra tabela.`, 'erro');
  }
}

async function verificarConexao() {
  try {
    await fetchJson('/api/status');
    statusConexao.textContent = 'Backend e Supabase conectados';
    statusConexao.className = 'status ok';
  } catch {
    statusConexao.textContent = 'Falha na conexao com o backend/Supabase';
    statusConexao.className = 'status erro';
  }
}

function trocarEntidade(entidade) {
  estado.entidadeAtual = entidade;
  estado.registroSelecionado = null;
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

menuItens.forEach(item => {
  item.addEventListener('click', () => trocarEntidade(item.dataset.entidade));
});

reportTabs.forEach(botao => {
  botao.addEventListener('click', () => {
    reportTabs.forEach(item => item.classList.toggle('active', item === botao));
    trocarEntidade(botao.dataset.relatorio);
  });
});

verificarConexao();
if (estado.entidadeAtual) trocarEntidade(estado.entidadeAtual);
