const estado = {
  entidadeAtual: 'clientes',
  registroSelecionado: null,
  dados: [],
  cache: {
    clientes: [],
    categorias: [],
    filmes: [],
    locacoes: []
  }
};

const configuracoes = {
  clientes: {
    titulo: 'Clientes',
    endpoint: '/api/clientes',
    id: 'CLI_ID',
    campos: [
      { nome: 'CLI_NOME', label: 'Nome do cliente', tipo: 'text', obrigatorio: true },
      { nome: 'CLI_TELEFONE', label: 'Telefone', tipo: 'text', placeholder: '(62) 99999-9999' },
      { nome: 'CLI_SALDO', label: 'Saldo', tipo: 'number', step: '0.01', valorPadrao: '0' }
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
      { nome: 'FIL_CAT_ID', label: 'Categoria', tipo: 'select', origem: 'categorias', value: 'CAT_ID', text: 'CAT_NOME', obrigatorio: true }
    ]
  },
  locacoes: {
    titulo: 'Locacoes',
    endpoint: '/api/locacoes',
    id: 'LOC_ID',
    campos: [
      { nome: 'LOC_CLI_ID', label: 'Cliente', tipo: 'select', origem: 'clientes', value: 'CLI_ID', text: 'CLI_NOME', obrigatorio: true }
    ]
  },
  itens: {
    titulo: 'Itens da locacao',
    endpoint: '/api/itens',
    id: 'ITN_ID',
    campos: [
      { nome: 'ITN_LOC_ID', label: 'Locacao', tipo: 'select', origem: 'locacoes', value: 'LOC_ID', text: 'LOC_ID', prefixo: 'Locacao #' , obrigatorio: true },
      { nome: 'ITN_FIL_ID', label: 'Filme', tipo: 'select', origem: 'filmes', value: 'FIL_ID', text: 'FIL_NOME', obrigatorio: true },
      { nome: 'ITN_VALOR_LOC', label: 'Valor da locacao', tipo: 'number', step: '0.01', obrigatorio: true }
    ]
  },
  relatorio: {
    titulo: 'Relatorio geral de locacoes',
    endpoint: '/api/locacoes/detalhes',
    id: null,
    campos: []
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
const busca = document.querySelector('#busca');
const statusConexao = document.querySelector('#status');
const menuItens = document.querySelectorAll('.menu-item');
const formArea = document.querySelector('#form-area');

function formatarCampo(campo) {
  const nomes = {
    CLI_ID: 'Cod. cliente',
    CLI_NOME: 'Cliente',
    CLI_TELEFONE: 'Telefone',
    CLI_DATA_CAD: 'Cadastro',
    CLI_SALDO: 'Saldo',
    CAT_ID: 'Cod. categoria',
    CAT_NOME: 'Categoria',
    CAT_DATA_CAD: 'Cadastro',
    FIL_ID: 'Cod. filme',
    FIL_NOME: 'Filme',
    FIL_CAT_ID: 'Cod. categoria',
    FIL_DATA_CAD: 'Cadastro',
    LOC_ID: 'Cod. locacao',
    LOC_CLI_ID: 'Cod. cliente',
    LOC_DATA_CAD: 'Data da locacao',
    ITN_ID: 'Cod. item',
    ITN_LOC_ID: 'Cod. locacao',
    ITN_FIL_ID: 'Cod. filme',
    ITN_VALOR_LOC: 'Valor',
    CAT_NOME: 'Categoria'
  };

  return nomes[campo] || campo.replaceAll('_', ' ').toLowerCase();
}

function formatarValor(valor, campo = '') {
  if (valor === null || valor === undefined) return '';

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString('pt-BR');
  }

  if (campo.includes('VALOR') || campo.includes('SALDO')) {
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
  const [clientes, categorias, filmes, locacoes] = await Promise.all([
    fetchJson('/api/clientes'),
    fetchJson('/api/categorias'),
    fetchJson('/api/filmes'),
    fetchJson('/api/locacoes')
  ]);

  estado.cache = { clientes, categorias, filmes, locacoes };
}

function criarCampo(campo) {
  const grupo = document.createElement('label');
  grupo.className = 'field';
  grupo.textContent = campo.label;

  let input;

  if (campo.tipo === 'select') {
    input = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Selecione...';
    input.appendChild(placeholder);

    const opcoes = estado.cache[campo.origem] || [];
    opcoes.forEach(item => {
      const option = document.createElement('option');
      option.value = item[campo.value];
      option.textContent = `${campo.prefixo || ''}${item[campo.text]}`;
      input.appendChild(option);
    });
  } else {
    input = document.createElement('input');
    input.type = campo.tipo;
    if (campo.step) input.step = campo.step;
    if (campo.placeholder) input.placeholder = campo.placeholder;
    if (campo.valorPadrao !== undefined) input.value = campo.valorPadrao;
  }

  input.name = campo.nome;
  if (campo.obrigatorio) input.required = true;
  grupo.appendChild(input);
  return grupo;
}

function renderizarFormulario() {
  const config = configuracoes[estado.entidadeAtual];
  form.innerHTML = '';
  feedback.textContent = '';

  if (estado.entidadeAtual === 'relatorio') {
    formArea.hidden = true;
    return;
  }

  formArea.hidden = false;

  config.campos.forEach(campo => {
    form.appendChild(criarCampo(campo));
  });
}

function preencherFormulario(registro) {
  const config = configuracoes[estado.entidadeAtual];
  estado.registroSelecionado = registro;
  btnExcluir.disabled = false;

  config.campos.forEach(campo => {
    const input = form.elements[campo.nome];
    if (input) input.value = registro[campo.nome] ?? '';
  });

  exibirFeedback(`Registro #${registro[config.id]} selecionado para edicao.`, 'info');
}

function limparFormulario() {
  estado.registroSelecionado = null;
  btnExcluir.disabled = true;
  form.reset();

  const config = configuracoes[estado.entidadeAtual];
  config.campos.forEach(campo => {
    if (campo.valorPadrao !== undefined && form.elements[campo.nome]) {
      form.elements[campo.nome].value = campo.valorPadrao;
    }
  });

  feedback.textContent = '';
}

function renderizarTabela(dados) {
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

  if (estado.entidadeAtual !== 'relatorio') {
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

    if (estado.entidadeAtual !== 'relatorio') {
      const tdAcao = document.createElement('td');
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'table-button';
      botao.textContent = 'Selecionar';
      botao.addEventListener('click', () => preencherFormulario(registro));
      tdAcao.appendChild(botao);
      tr.appendChild(tdAcao);
    }

    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
}

async function carregarDados() {
  const config = configuracoes[estado.entidadeAtual];
  tituloEntidade.textContent = config.titulo;
  subtitulo.textContent = estado.entidadeAtual === 'relatorio' ? 'Consulta para impressao' : 'Formulario de manutencao';

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

  for (const [chave, valor] of dados.entries()) {
    payload[chave] = valor;
  }

  return payload;
}

async function salvarRegistro(evento) {
  evento.preventDefault();

  if (estado.entidadeAtual === 'relatorio') return;

  const config = configuracoes[estado.entidadeAtual];
  const payload = obterPayload();
  const editando = Boolean(estado.registroSelecionado);
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
  if (!estado.registroSelecionado) return;

  const config = configuracoes[estado.entidadeAtual];
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

form.addEventListener('submit', salvarRegistro);
btnLimpar.addEventListener('click', limparFormulario);
btnExcluir.addEventListener('click', excluirRegistro);
busca.addEventListener('input', aplicarFiltro);
btnImprimir.addEventListener('click', () => window.print());

menuItens.forEach(item => {
  item.addEventListener('click', () => trocarEntidade(item.dataset.entidade));
});

verificarConexao();
trocarEntidade('clientes');
