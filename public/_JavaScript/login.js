const formLogin = document.querySelector('#login-form');
const inputEmail = document.querySelector('#email');
const inputSenha = document.querySelector('#senha');
const botaoEntrar = document.querySelector('#login-submit');
const botaoMostrarSenha = document.querySelector('#toggle-password');
const feedbackLogin = document.querySelector('#login-feedback');

function proximaUrl() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get('next');
  return next && next.startsWith('/') ? next : '/';
}

function mostrarErro(mensagem) {
  feedbackLogin.textContent = mensagem;
  feedbackLogin.className = 'feedback login-feedback erro';
}

function limparErro() {
  feedbackLogin.textContent = '';
  feedbackLogin.className = 'feedback login-feedback';
}

async function verificarSessao() {
  try {
    const resposta = await fetch('/auth/session', {
      credentials: 'include'
    });
    if (resposta.ok) window.location.replace(proximaUrl());
  } catch {
    // Tela de login continua disponível mesmo se a sessão não puder ser consultada.
  }
}

async function enviarLogin(evento) {
  evento.preventDefault();
  limparErro();

  const email = inputEmail.value.trim().toLowerCase();
  const senha = inputSenha.value.trim();

  inputEmail.value = email;
  inputSenha.value = senha;

  if (!email || !senha) {
    mostrarErro('Informe e-mail e senha.');
    return;
  }

  if (!inputEmail.checkValidity()) {
    mostrarErro('Informe um e-mail válido.');
    return;
  }

  botaoEntrar.disabled = true;
  botaoEntrar.textContent = 'Entrando...';

  try {
    const resposta = await fetch('/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível autenticar.');
    }

    window.location.replace(proximaUrl());
  } catch (error) {
    mostrarErro(error.message || 'Falha de conexão. Tente novamente.');
  } finally {
    botaoEntrar.disabled = false;
    botaoEntrar.textContent = 'Entrar';
  }
}

botaoMostrarSenha.addEventListener('click', () => {
  const visivel = inputSenha.type === 'text';
  inputSenha.type = visivel ? 'password' : 'text';
  botaoMostrarSenha.textContent = visivel ? 'Mostrar' : 'Ocultar';
  botaoMostrarSenha.setAttribute('aria-pressed', String(!visivel));
});

formLogin.addEventListener('submit', enviarLogin);
verificarSessao();
