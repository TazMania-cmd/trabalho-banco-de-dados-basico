const bcrypt = require('bcryptjs');

const USUARIO_SELECT = 'id, nome, email, senha_hash, ativo, created_at';
const PUBLIC_USER_SELECT = 'id, nome, email, ativo, created_at';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return { erro: 'Informe usuário/e-mail e senha.' };
  }

  if (!EMAIL_REGEX.test(emailNormalizado)) {
    return { erro: 'Informe um e-mail válido.' };
  }

  return { email: emailNormalizado, senha: senhaTexto };
}

async function autenticarUsuario(supabase, { email, senha }) {
  const entrada = validarCredenciaisEntrada({ email, senha });
  if (entrada.erro) {
    const erro = new Error(entrada.erro);
    erro.statusCode = 400;
    throw erro;
  }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select(USUARIO_SELECT)
    .eq('email', entrada.email)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;

  const senhaValida = usuario
    ? await bcrypt.compare(entrada.senha, usuario.senha_hash)
    : false;

  if (!usuario || !senhaValida) {
    const erro = new Error('Usuário ou senha inválidos.');
    erro.statusCode = 401;
    throw erro;
  }

  return usuarioPublico(usuario);
}

async function criarAdminInicial(supabase, env = process.env) {
  if (!supabase) return;

  const nome = String(env.ADMIN_NAME || '').trim();
  const email = normalizarEmail(env.ADMIN_EMAIL);
  const senha = String(env.ADMIN_PASSWORD || '').trim();

  if (!nome || !email || !senha) {
    console.warn('Admin inicial não criado: defina ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD.');
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    console.warn('Admin inicial não criado: ADMIN_EMAIL inválido.');
    return;
  }

  const { data: existente, error: buscaErro } = await supabase
    .from('usuarios')
    .select(PUBLIC_USER_SELECT)
    .eq('email', email)
    .maybeSingle();

  if (buscaErro) {
    console.warn('Admin inicial não verificado. Execute a migração de autenticação.', buscaErro.message);
    return;
  }

  if (existente) return;

  const senhaHash = await bcrypt.hash(senha, 12);
  const { error } = await supabase.from('usuarios').insert({
    nome,
    email,
    senha_hash: senhaHash,
    ativo: true
  });

  if (error) {
    console.warn('Admin inicial não criado.', error.message);
    return;
  }

  console.log(`Admin inicial criado: ${email}`);
}

module.exports = {
  autenticarUsuario,
  criarAdminInicial,
  usuarioPublico
};
