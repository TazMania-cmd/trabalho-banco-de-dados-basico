const session = require('express-session');

function erroSeguro(error) {
  return {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    details: error?.details
  };
}

class SupabaseSessionStore extends session.Store {
  constructor({ supabase, tableName = 'sessoes' }) {
    super();
    this.supabase = supabase;
    this.tableName = tableName;
  }

  get(sid, callback) {
    this.supabase
      .from(this.tableName)
      .select('sessao, expira_em')
      .eq('id', sid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('Falha ao ler sessao no Supabase:', erroSeguro(error));
          return callback(null, null);
        }
        if (!data) return callback(null, null);

        if (data.expira_em && new Date(data.expira_em).getTime() <= Date.now()) {
          this.destroy(sid, () => callback(null, null));
          return;
        }

        callback(null, data.sessao);
      })
      .catch(error => {
        console.error('Falha ao ler sessao no Supabase:', erroSeguro(error));
        callback(null, null);
      });
  }

  set(sid, sessao, callback = () => {}) {
    const maxAge = sessao.cookie?.originalMaxAge || sessao.cookie?.maxAge || 2 * 60 * 60 * 1000;
    const expiraEm = new Date(Date.now() + Number(maxAge)).toISOString();

    this.supabase
      .from(this.tableName)
      .upsert({
        id: sid,
        sessao,
        expira_em: expiraEm,
        updated_at: new Date().toISOString()
      })
      .then(({ error }) => {
        if (error) console.error('Falha ao gravar sessao no Supabase:', erroSeguro(error));
        callback(error || null);
      })
      .catch(error => {
        console.error('Falha ao gravar sessao no Supabase:', erroSeguro(error));
        callback(error);
      });
  }

  destroy(sid, callback = () => {}) {
    this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', sid)
      .then(({ error }) => {
        if (error) console.error('Falha ao remover sessao no Supabase:', erroSeguro(error));
        callback(error || null);
      })
      .catch(error => {
        console.error('Falha ao remover sessao no Supabase:', erroSeguro(error));
        callback(error);
      });
  }

  touch(sid, sessao, callback = () => {}) {
    this.set(sid, sessao, callback);
  }
}

module.exports = SupabaseSessionStore;
