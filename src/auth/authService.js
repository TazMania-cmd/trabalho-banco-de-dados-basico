const bcrypt = require('bcryptjs');

const AUTH_SCHEMA = Object.freeze({
  tabelaUsuarios: 'usuarios',
  colunaEmail: 'email',
  colunaHashSenha: 'senha_hash',
  colunaAtivo: 'ativo'
});

const USUARIO_SELECT = `id, nome, ${AUTH_SCHEMA.colunaEmail}, ${AUTH_SCHEMA.colunaHashSenha}, ${AUTH_SCHEMA.colunaAtivo}, created_at`;
const PUBLIC_USER_SELECT = `id, nome, ${AUTH_SCHEMA.colunaEmail}, ${AUTH_SCHEMA.colunaAtivo}, created_at`;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function registrarEtapa(logger, etapa, dados = {}) {
  if (typeof logger === 'function') logger(etapa, dados);
}

function erroComStatus(mensagem, statusCode, cause) {
  const erro = new Error(mensagem);
  erro.statusCode = statusCode;
  if (cause) erro.cause = cause;
  return erro;
}

function normalizarEmail(valor) {
  return String(valor || '').trim().toLowerCase();
}

function usuarioPublico(usuario) {
  if (!usuario) return null;
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    ativo: Boolean(usuario.ativo),
    created_at: usuario.created_at
  };
}

function validarCredenciaisEntrada({ email, senha }) {
  const emailNormalizado = normalizarEmail(email);
  const senhaTexto = String(senha || '').trim();

  if (!emailNormalizado || !senhaTexto) {
    return { erro: 'Informe usuario/e-mail e senha.' };
  }

  if (!EMAIL_REGEX.test(emailNormalizado)) {
    return { erro: 'Informe um e-mail valido.' };
  }

  return { email: emailNormalizado, senha: senhaTexto };
}

async function autenticarUsuario(supabase, { email, senha }, logger) {
  registrarEtapa(logger, '2.leitura_validacao_body', {
    emailInformado: typeof email === 'string' && email.trim().length > 0,
    senhaInformada: typeof senha === 'string' && senha.length > 0
  });

  const entrada = validarCredenciaisEntrada({ email, senha });
  if (entrada.erro) {
    registrarEtapa(logger, '2.body_invalido', { motivo: entrada.erro });
    throw erroComStatus(entrada.erro, 400);
  }

  registrarEtapa(logger, '2.body_valido', { emailValido: true, senhaInformada: true });
  registrarEtapa(logger, '3.busca_usuario_supabase', {
    tabela: AUTH_SCHEMA.tabelaUsuarios,
    colunaEmail: AUTH_SCHEMA.colunaEmail,
    colunaHashSenha: AUTH_SCHEMA.colunaHashSenha,
    colunaAtivo: AUTH_SCHEMA.colunaAtivo
  });

  const { data: usuario, error } = await supabase
    .from(AUTH_SCHEMA.tabelaUsuarios)
    .select(USUARIO_SELECT)
    .eq(AUTH_SCHEMA.colunaEmail, entrada.email)
    .eq(AUTH_SCHEMA.colunaAtivo, true)
    .maybeSingle();

  if (error) {
    registrarEtapa(logger, '4.erro_supabase', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    throw erroComStatus('Falha interna ao consultar usuario.', 500, error);
  }

  registrarEtapa(logger, '4.supabase_sem_erro', { ok: true });
  registrarEtapa(logger, '5.existencia_usuario', { usuarioEncontrado: Boolean(usuario) });

  if (!usuario) {
    throw erroComStatus('Usuario ou senha invalidos.', 401);
  }

  const hashSenha = usuario[AUTH_SCHEMA.colunaHashSenha];
  const hashPresente = typeof hashSenha === 'string' && hashSenha.length > 0;
  registrarEtapa(logger, '6.leitura_coluna_hash', {
    colunaHashSenha: AUTH_SCHEMA.colunaHashSenha,
    hashPresente
  });

  if (!hashPresente) {
    throw erroComStatus('Hash de senha ausente para usuario ativo.', 500);
  }

  registrarEtapa(logger, '7.comparacao_senha_bcryptjs', { biblioteca: 'bcryptjs' });
  let senhaValida = false;
  try {
    senhaValida = await bcrypt.compare(entrada.senha, hashSenha);
  } catch (error) {
    registrarEtapa(logger, '7.erro_bcryptjs', {
      name: error.name,
      message: error.message
    });
    throw erroComStatus('Falha interna ao comparar senha.', 500, error);
  }

  registrarEtapa(logger, '7.resultado_comparacao_senha', { senhaValida: Boolean(senhaValida) });

  if (!senhaValida) {
    throw erroComStatus('Usuario ou senha invalidos.', 401);
  }

  return usuarioPublico(usuario);
}

async function criarAdminInicial(supabase, env = process.env) {
  if (!supabase) return;

  const nome = String(env.ADMIN_NAME || '').trim();
  const email = normalizarEmail(env.ADMIN_EMAIL);
  const senha = String(env.ADMIN_PASSWORD || '').trim();

  if (!nome || !email || !senha) {
    console.warn('Admin inicial nao criado: defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD.');
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    console.warn('Admin inicial nao criado: ADMIN_EMAIL invalido.');
    return;
  }

  const { data: existente, error: buscaErro } = await supabase
    .from(AUTH_SCHEMA.tabelaUsuarios)
    .select(PUBLIC_USER_SELECT)
    .eq(AUTH_SCHEMA.colunaEmail, email)
    .maybeSingle();

  if (buscaErro) {
    console.warn('Admin inicial nao verificado. Execute a migracao de autenticacao.', buscaErro.message);
    return;
  }

  if (existente) return;

  const senhaHash = await bcrypt.hash(senha, 12);
  const { error } = await supabase.from(AUTH_SCHEMA.tabelaUsuarios).insert({
    nome,
    [AUTH_SCHEMA.colunaEmail]: email,
    [AUTH_SCHEMA.colunaHashSenha]: senhaHash,
    [AUTH_SCHEMA.colunaAtivo]: true
  });

  if (error) {
    console.warn('Admin inicial nao criado.', error.message);
    return;
  }

  console.log('Admin inicial criado.');
}

module.exports = {
  AUTH_SCHEMA,
  autenticarUsuario,
  criarAdminInicial,
  usuarioPublico
};
