-- Migração não destrutiva para habilitar a integração com TMDB.
-- Execute no SQL Editor do Supabase se o banco já existe e você não quer resetar os dados.

BEGIN;

ALTER TABLE categorias
  ADD COLUMN IF NOT EXISTS cat_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE filmes
  ADD COLUMN IF NOT EXISTS fil_tmdb_id INTEGER,
  ADD COLUMN IF NOT EXISTS fil_ano INTEGER,
  ADD COLUMN IF NOT EXISTS fil_classificacao VARCHAR(10),
  ADD COLUMN IF NOT EXISTS fil_duracao_min INTEGER,
  ADD COLUMN IF NOT EXISTS fil_sinopse TEXT,
  ADD COLUMN IF NOT EXISTS fil_poster_path VARCHAR(255),
  ADD COLUMN IF NOT EXISTS fil_valor_padrao NUMERIC(10,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS fil_ativo BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS fil_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE filmes
SET
  fil_valor_padrao = COALESCE(fil_valor_padrao, 10.00),
  fil_ativo = COALESCE(fil_ativo, true),
  fil_data_cad = COALESCE(fil_data_cad, NOW());

ALTER TABLE filmes
  ALTER COLUMN fil_valor_padrao SET DEFAULT 10.00,
  ALTER COLUMN fil_valor_padrao SET NOT NULL,
  ALTER COLUMN fil_ativo SET DEFAULT true,
  ALTER COLUMN fil_ativo SET NOT NULL,
  ALTER COLUMN fil_data_cad SET DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_filmes_tmdb_id
  ON filmes(fil_tmdb_id)
  WHERE fil_tmdb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_filmes_tmdb
  ON filmes(fil_tmdb_id);

UPDATE filmes
SET
  fil_tmdb_id = 872585,
  fil_duracao_min = COALESCE(fil_duracao_min, 180),
  fil_sinopse = COALESCE(fil_sinopse, 'A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica.'),
  fil_poster_path = COALESCE(fil_poster_path, '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg')
WHERE fil_nome = 'Oppenheimer'
  AND fil_tmdb_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM filmes existente WHERE existente.fil_tmdb_id = 872585);

UPDATE filmes
SET
  fil_tmdb_id = 693134,
  fil_duracao_min = COALESCE(fil_duracao_min, 166),
  fil_sinopse = COALESCE(fil_sinopse, 'Paul Atreides se une a Chani e aos Fremen em busca de vingança e justiça.'),
  fil_poster_path = COALESCE(fil_poster_path, '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg')
WHERE fil_nome = 'Duna: Parte 2'
  AND fil_tmdb_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM filmes existente WHERE existente.fil_tmdb_id = 693134);

UPDATE filmes
SET
  fil_tmdb_id = 533535,
  fil_duracao_min = COALESCE(fil_duracao_min, 128),
  fil_sinopse = COALESCE(fil_sinopse, 'Deadpool se une a Wolverine em uma missão caótica e cheia de ação.'),
  fil_poster_path = COALESCE(fil_poster_path, '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg')
WHERE fil_nome = 'Deadpool & Wolverine'
  AND fil_tmdb_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM filmes existente WHERE existente.fil_tmdb_id = 533535);

UPDATE filmes
SET
  fil_tmdb_id = 1022789,
  fil_duracao_min = COALESCE(fil_duracao_min, 96),
  fil_sinopse = COALESCE(fil_sinopse, 'Riley cresce e novas emoções chegam à sala de controle.'),
  fil_poster_path = COALESCE(fil_poster_path, '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg')
WHERE fil_nome = 'Divertida Mente 2'
  AND fil_tmdb_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM filmes existente WHERE existente.fil_tmdb_id = 1022789);

UPDATE filmes
SET
  fil_tmdb_id = 792307,
  fil_duracao_min = COALESCE(fil_duracao_min, 141),
  fil_sinopse = COALESCE(fil_sinopse, 'A jornada fantástica de Bella Baxter por liberdade, descoberta e autonomia.'),
  fil_poster_path = COALESCE(fil_poster_path, '/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg')
WHERE fil_nome = 'Pobres Criaturas'
  AND fil_tmdb_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM filmes existente WHERE existente.fil_tmdb_id = 792307);

ALTER TABLE exemplares
  ADD COLUMN IF NOT EXISTS exa_tipo VARCHAR(20) DEFAULT 'FISICO' NOT NULL,
  ADD COLUMN IF NOT EXISTS exa_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE locacoes
  ADD COLUMN IF NOT EXISTS loc_data_devolucao TIMESTAMP WITH TIME ZONE;

ALTER TABLE itens
  ADD COLUMN IF NOT EXISTS itn_data_devolucao TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_filmes_categoria ON filmes(fil_cat_id);
CREATE INDEX IF NOT EXISTS idx_exemplares_filme ON exemplares(exa_fil_id);
CREATE INDEX IF NOT EXISTS idx_exemplares_status ON exemplares(exa_status);
CREATE INDEX IF NOT EXISTS idx_locacoes_cliente ON locacoes(loc_cli_id);
CREATE INDEX IF NOT EXISTS idx_locacoes_status ON locacoes(loc_status);
CREATE INDEX IF NOT EXISTS idx_itens_locacao ON itens(itn_loc_id);
CREATE INDEX IF NOT EXISTS idx_itens_exemplar ON itens(itn_exa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_locacao ON pagamentos(pag_loc_id);

COMMIT;
