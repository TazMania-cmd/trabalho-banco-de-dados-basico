const express = require('express');
const rateLimit = require('express-rate-limit');
const { autenticarUsuario } = require('../auth/authService');
const { usuarioDaSessao } = require('../middlewares/authMiddleware');

function tipoCorpo(body) {
  if (Array.isArray(body)) return 'array';
  return typeof body;
}

function erroSeguro(error) {
  if (!error) return null;

  const info = {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
    details: error.details
  };

  if (error.cause) {
    info.cause = {
      name: error.cause.name,
      message: error.cause.message,
      code: error.cause.code,
      details: error.cause.details
    };
  }

  return info;
}

function criarLoggerLogin(req) {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  return (etapa, dados = {}) => {
    console.info('[auth/login]', {
      requestId,
      etapa,
      method: req.method,
      path: req.originalUrl,
      ...dados
    });
  };
}

function regenerarSessao(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate(error => {
      if (error) return reject(error);
      return resolve();
    });
  });
}

function salvarSessao(req) {
  return new Promise((resolve, reject) => {
    req.session.save(error => {
      if (error) return reject(error);
      return resolve();
    });
  });
}

function criarAuthRoutes({ supabase, garantirAdminInicial }) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const logLogin = criarLoggerLogin(req);

    logLogin('1.recebimento_requisicao', {
      contentType: req.get('content-type') || null,
      bodyRecebido: req.body !== undefined
    });

    try {
      const body = req.body;

      logLogin('2.leitura_validacao_body', {
        bodyTipo: tipoCorpo(body),
        emailInformado: typeof body?.email === 'string' && body.email.trim().length > 0,
        senhaInformada: typeof body?.senha === 'string' && body.senha.length > 0
      });

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        logLogin('2.body_invalido', { motivo: 'corpo precisa ser um objeto JSON', statusCode: 400 });
        return res.status(400).json({ erro: 'Corpo invalido.' });
      }

      const { email, senha } = req.body;

      if (!supabase) {
        logLogin('3.busca_usuario_supabase', { supabaseConfigurado: false });
        logLogin('10.resposta_json', { statusCode: 500 });
        return res.status(500).json({ erro: 'Supabase nao configurado.' });
      }

      if (garantirAdminInicial) {
        logLogin('2.garantir_admin_inicial', { executando: true });
        await garantirAdminInicial();
      }

      const usuario = await autenticarUsuario(supabase, { email, senha }, logLogin);

      if (!req.session) {
        throw Object.assign(new Error('Session middleware indisponivel.'), { statusCode: 500 });
      }

      logLogin('8.criacao_sessao', { status: 'iniciando' });
      try {
        await regenerarSessao(req);
      } catch (error) {
        logLogin('8.erro_criacao_sessao', { erro: erroSeguro(error) });
        throw Object.assign(new Error('Nao foi possivel iniciar a sessao.'), { statusCode: 500, cause: error });
      }

      req.session.usuario = usuario;
      logLogin('8.criacao_sessao', { status: 'usuario_atribuido' });

      const cookie = req.session.cookie || {};
      logLogin('9.definicao_cookie', {
        cookieName: 'locadora.sid',
        httpOnly: Boolean(cookie.httpOnly),
        sameSite: cookie.sameSite || null,
        secure: Boolean(cookie.secure),
        maxAgeMs: cookie.maxAge || cookie.originalMaxAge || null
      });

      try {
        await salvarSessao(req);
      } catch (error) {
        logLogin('9.erro_salvar_sessao', { erro: erroSeguro(error) });
        throw Object.assign(new Error('Nao foi possivel salvar a sessao.'), { statusCode: 500, cause: error });
      }

      logLogin('10.resposta_json', { statusCode: 200 });
      return res.status(200).json({ usuario });
    } catch (error) {
      if (error.statusCode === 400) {
        logLogin('10.resposta_json', { statusCode: 400, erro: erroSeguro(error) });
        return res.status(400).json({ erro: error.message });
      }

      if (error.statusCode === 401) {
        logLogin('10.resposta_json', { statusCode: 401, erro: erroSeguro(error) });
        return res.status(401).json({ erro: 'Usuario ou senha invalidos.' });
      }

      const erro = erroSeguro(error);
      logLogin('10.resposta_json', { statusCode: 500, erro });
      console.error('Falha inesperada no login.', erro);
      return res.status(500).json({ erro: 'Falha interna ao autenticar.' });
    }
  });

  router.post('/logout', (req, res) => {
    if (!req.session?.usuario) {
      res.clearCookie('locadora.sid');
      return res.status(200).json({ ok: true });
    }

    req.session.destroy(error => {
      res.clearCookie('locadora.sid');
      if (error) {
        console.error('Falha ao encerrar sessao.', erroSeguro(error));
        return res.status(500).json({ erro: 'Nao foi possivel encerrar a sessao.' });
      }
      return res.status(200).json({ ok: true });
    });
  });

  router.get('/session', (req, res) => {
    const usuario = usuarioDaSessao(req);
    if (!usuario) return res.status(401).json({ erro: 'Sessao ausente ou expirada.' });
    return res.status(200).json({ usuario });
  });

  return router;
}

module.exports = criarAuthRoutes;
