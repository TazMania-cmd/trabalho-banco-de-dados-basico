function usuarioDaSessao(req) {
  return req.session?.usuario || null;
}

function estaAutenticado(req) {
  return Boolean(usuarioDaSessao(req));
}

function exigirAutenticacaoApi(req, res, next) {
  if (estaAutenticado(req)) return next();
  return res.status(401).json({ erro: 'Sessão ausente ou expirada.' });
}

function exigirAutenticacaoPagina(publicDir, file) {
  return (req, res) => {
    if (!estaAutenticado(req)) {
      return res.redirect(`/login.html?next=${encodeURIComponent(req.originalUrl)}`);
    }
    return res.sendFile(file, { root: publicDir });
  };
}

function redirecionarLoginAutenticado(publicDir) {
  return (req, res) => {
    if (estaAutenticado(req)) return res.redirect('/');
    return res.sendFile('login.html', { root: publicDir });
  };
}

module.exports = {
  exigirAutenticacaoApi,
  exigirAutenticacaoPagina,
  redirecionarLoginAutenticado,
  usuarioDaSessao
};
