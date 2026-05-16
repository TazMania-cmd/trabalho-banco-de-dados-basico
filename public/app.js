const tabela = document.querySelector('#tabela');
const titulo = document.querySelector('#titulo');
const contador = document.querySelector('#contador');
const mensagem = document.querySelector('#mensagem');
const statusConexao = document.querySelector('#status');
const botoes = document.querySelectorAll('[data-rota]');
const formCliente = document.querySelector('#form-cliente');

const titulos = {
  '/api/clientes': 'Clientes',
  '/api/categorias': 'Categorias',
  '/api/filmes': 'Filmes com categorias',
  '/api/locacoes': 'Locacoes',
  '/api/locacoes/detalhes': 'Locacoes detalhadas'
};

function formatarCampo(campo) {
  return campo
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

function formatarValor(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }

  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
    return new Date(valor).toLocaleString('pt-BR');
  }

  return valor;
}

function limparTabela() {
  tabela.innerHTML = '';
  contador.textContent = '0 registros';
}

function renderizarTabela(dados) {
  limparTabela();

  if (!dados.length) {
    mensagem.hidden = false;
    mensagem.textContent = 'Nenhum registro encontrado para esta consulta.';
    return;
  }

  mensagem.hidden = true;
  contador.textContent = `${dados.length} registro${dados.length === 1 ? '' : 's'}`;

  const campos = Object.keys(dados[0]);
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');

  campos.forEach(campo => {
    const th = document.createElement('th');
    th.textContent = formatarCampo(campo);
    trHead.appendChild(th);
  });

  thead.appendChild(trHead);
  tabela.appendChild(thead);

  const tbody = document.createElement('tbody');
  dados.forEach(registro => {
    const tr = document.createElement('tr');
    campos.forEach(campo => {
      const td = document.createElement('td');
      td.textContent = formatarValor(registro[campo]);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  tabela.appendChild(tbody);
}

async function buscarDados(rota, tituloConsulta = titulos[rota] || 'Resultado') {
  titulo.textContent = tituloConsulta;
  mensagem.hidden = false;
  mensagem.textContent = 'Carregando dados...';
  limparTabela();

  try {
    const resposta = await fetch(rota);
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Erro ao consultar o backend.');
    }

    renderizarTabela(dados);
  } catch (erro) {
    limparTabela();
    mensagem.hidden = false;
    mensagem.textContent = erro.message;
  }
}

async function verificarConexao() {
  try {
    const resposta = await fetch('/api/status');
    if (!resposta.ok) {
      throw new Error();
    }
    statusConexao.textContent = 'Backend conectado';
    statusConexao.classList.add('ok');
  } catch {
    statusConexao.textContent = 'Verifique o backend/MySQL';
    statusConexao.classList.add('erro');
  }
}

botoes.forEach(botao => {
  botao.addEventListener('click', () => {
    buscarDados(botao.dataset.rota);
  });
});

formCliente.addEventListener('submit', evento => {
  evento.preventDefault();
  const clienteId = new FormData(formCliente).get('clienteId');
  buscarDados(`/api/clientes/${clienteId}/locacoes`, `Locacoes do cliente ${clienteId}`);
});

verificarConexao();
