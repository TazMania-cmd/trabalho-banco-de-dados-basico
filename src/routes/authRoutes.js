const express = require('express');
const rateLimit = require('express-rate-limit');
const { autenticarUsuario } = require('../auth/authService');
const { usuarioDaSessao } = require('../middlewares/authMiddleware');

function criarAuthRoutes({ supabase }) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas de login. Tente novamente em alguns minutos.' }
  });

  router.post('/login', loginLimiter, async (req, res) => {
    if (!supabase) return res.status(500).json({ erro: 'Supabase não configurado.' });

    try {
      const usuario = await autenticarUsuario(supabase, req.body || {});

      req.session.regenerate(error => {
        if (error) return res.status(500).json({ erro: 'Não foi possível iniciar a sessão.' });
        req.session.usuario = usuario;
        req.session.save(saveError => {
          if (saveError) return res.status(500).json({ erro: 'Não foi possível salvar a sessão.' });
          return res.status(200).json({ usuario });
        });
      });
    } catch (error) {
      if (error.statusCode === 400) return res.status(400).json({ erro: error.message });
      if (error.statusCode === 401) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
      console.error('Falha inesperada no login.', error);
      return res.status(500).json({ erro: 'Falha interna ao autenticar.' });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(error => {
      res.clearCookie('locadora.sid');
      if (error) return res.status(500).json({ erro: 'Não foi possível encerrar a sessão.' });
      return res.status(200).json({ ok: true });
    });
  });

  router.get('/session', (req, res) => {
    const usuario = usuarioDaSessao(req);
    if (!usuario) return res.status(401).json({ erro: 'Sessão ausente ou expirada.' });
    return res.status(200).json({ usuario });
  });

  return router;
}

module.exports = criarAuthRoutes;
