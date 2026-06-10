-- Sessoes persistentes para ambiente serverless.
-- Execute este arquivo no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS sessoes (
  id VARCHAR(255) PRIMARY KEY,
  sessao JSONB NOT NULL,
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessoes_expira_em ON sessoes (expira_em);
