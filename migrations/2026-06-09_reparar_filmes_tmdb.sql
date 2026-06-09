-- Reparo direto para bancos antigos que ainda não têm as colunas usadas pelo TMDB.
-- Execute no SQL Editor do Supabase conectado ao mesmo projeto do .env.local.
-- Este script não apaga dados.

BEGIN;

ALTER TABLE public.filmes
  ADD COLUMN IF NOT EXISTS fil_tmdb_id INTEGER,
  ADD COLUMN IF NOT EXISTS fil_ano INTEGER,
  ADD COLUMN IF NOT EXISTS fil_classificacao VARCHAR(10),
  ADD COLUMN IF NOT EXISTS fil_duracao_min INTEGER,
  ADD COLUMN IF NOT EXISTS fil_sinopse TEXT,
  ADD COLUMN IF NOT EXISTS fil_poster_path VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fil_valor_padrao NUMERIC(10,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS fil_ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fil_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.filmes
SET
  fil_valor_padrao = COALESCE(fil_valor_padrao, 10.00),
  fil_ativo = COALESCE(fil_ativo, true),
  fil_data_cad = COALESCE(fil_data_cad, NOW());

ALTER TABLE public.filmes
  ALTER COLUMN fil_valor_padrao SET DEFAULT 10.00,
  ALTER COLUMN fil_valor_padrao SET NOT NULL,
  ALTER COLUMN fil_ativo SET DEFAULT true,
  ALTER COLUMN fil_ativo SET NOT NULL,
  ALTER COLUMN fil_data_cad SET DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_filmes_tmdb_id
  ON public.filmes(fil_tmdb_id)
  WHERE fil_tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_filmes_tmdb
  ON public.filmes(fil_tmdb_id);

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'filmes'
  AND column_name IN (
    'fil_tmdb_id',
    'fil_duracao_min',
    'fil_sinopse',
    'fil_poster_path',
    'fil_valor_padrao',
    'fil_ativo'
  )
ORDER BY column_name;
