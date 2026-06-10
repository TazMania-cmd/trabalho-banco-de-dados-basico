-- Script de reset e povoamento - Sistema Locadora
-- Execute este arquivo no SQL Editor do Supabase.

BEGIN;

DROP VIEW IF EXISTS
  vw_multas,
  vw_atrasos,
  vw_locacoes_abertas,
  vw_filmes_alugados,
  vw_filmes_disponiveis,
  vw_locacoes_detalhes,
  vw_clientes_locacoes;

DROP TABLE IF EXISTS usuarios, pagamentos, itens, locacoes, exemplares, filmes, categorias, clientes CASCADE;

CREATE TABLE clientes (
  cli_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cli_nome VARCHAR(80) NOT NULL,
  cli_documento VARCHAR(20) UNIQUE,
  cli_email VARCHAR(120),
  cli_telefone VARCHAR(25),
  cli_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cli_saldo NUMERIC(10,2) DEFAULT 0 NOT NULL,
  cli_ativo BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE categorias (
  cat_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cat_nome VARCHAR(150) UNIQUE NOT NULL,
  cat_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE filmes (
  fil_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fil_tmdb_id INTEGER UNIQUE,
  fil_nome VARCHAR(150) NOT NULL,
  fil_cat_id INTEGER NOT NULL REFERENCES categorias(cat_id),
  fil_ano INTEGER,
  fil_classificacao VARCHAR(10),
  fil_duracao_min INTEGER,
  fil_sinopse TEXT,
  fil_poster_path VARCHAR(255),
  fil_valor_padrao NUMERIC(10,2) DEFAULT 10.00 NOT NULL,
  fil_ativo BOOLEAN DEFAULT true NOT NULL,
  fil_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT ck_fil_ano CHECK (fil_ano IS NULL OR fil_ano BETWEEN 1888 AND 2100),
  CONSTRAINT ck_fil_duracao CHECK (fil_duracao_min IS NULL OR fil_duracao_min > 0),
  CONSTRAINT ck_fil_valor CHECK (fil_valor_padrao >= 0)
);

CREATE TABLE exemplares (
  exa_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exa_fil_id INTEGER NOT NULL REFERENCES filmes(fil_id),
  exa_codigo VARCHAR(30) UNIQUE NOT NULL,
  exa_tipo VARCHAR(20) DEFAULT 'FISICO' NOT NULL,
  exa_status VARCHAR(20) DEFAULT 'DISPONIVEL' NOT NULL,
  exa_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT ck_exa_tipo CHECK (exa_tipo IN ('FISICO', 'DIGITAL')),
  CONSTRAINT ck_exa_status CHECK (exa_status IN ('DISPONIVEL', 'ALUGADO', 'MANUTENCAO', 'INATIVO'))
);

CREATE TABLE locacoes (
  loc_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loc_cli_id INTEGER NOT NULL REFERENCES clientes(cli_id),
  loc_data_cad TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  loc_data_prevista DATE NOT NULL,
  loc_data_devolucao TIMESTAMP WITH TIME ZONE,
  loc_status VARCHAR(20) DEFAULT 'ABERTA' NOT NULL,
  loc_valor_total NUMERIC(10,2) DEFAULT 0 NOT NULL,
  loc_multa_total NUMERIC(10,2) DEFAULT 0 NOT NULL,
  loc_pago_total NUMERIC(10,2) DEFAULT 0 NOT NULL,
  CONSTRAINT ck_loc_status CHECK (loc_status IN ('ABERTA', 'DEVOLVIDA', 'CANCELADA')),
  CONSTRAINT ck_loc_totais CHECK (loc_valor_total >= 0 AND loc_multa_total >= 0 AND loc_pago_total >= 0)
);

CREATE TABLE itens (
  itn_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  itn_loc_id INTEGER NOT NULL REFERENCES locacoes(loc_id) ON DELETE CASCADE,
  itn_exa_id INTEGER NOT NULL REFERENCES exemplares(exa_id),
  itn_fil_id INTEGER NOT NULL REFERENCES filmes(fil_id),
  itn_valor_loc NUMERIC(10,2) NOT NULL,
  itn_valor_multa NUMERIC(10,2) DEFAULT 0 NOT NULL,
  itn_data_devolucao TIMESTAMP WITH TIME ZONE,
  itn_status VARCHAR(20) DEFAULT 'ALUGADO' NOT NULL,
  CONSTRAINT ck_itn_status CHECK (itn_status IN ('ALUGADO', 'DEVOLVIDO', 'CANCELADO')),
  CONSTRAINT ck_itn_valores CHECK (itn_valor_loc >= 0 AND itn_valor_multa >= 0)
);

CREATE TABLE pagamentos (
  pag_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pag_loc_id INTEGER NOT NULL REFERENCES locacoes(loc_id) ON DELETE CASCADE,
  pag_valor NUMERIC(10,2) NOT NULL,
  pag_forma VARCHAR(30) DEFAULT 'PIX' NOT NULL,
  pag_observacao TEXT,
  pag_data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT ck_pag_forma CHECK (pag_forma IN ('DINHEIRO', 'PIX', 'CARTAO', 'BOLETO')),
  CONSTRAINT ck_pag_valor CHECK (pag_valor > 0)
);

CREATE TABLE usuarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_filmes_categoria ON filmes(fil_cat_id);
CREATE INDEX idx_filmes_tmdb ON filmes(fil_tmdb_id);
CREATE INDEX idx_exemplares_filme ON exemplares(exa_fil_id);
CREATE INDEX idx_exemplares_status ON exemplares(exa_status);
CREATE INDEX idx_locacoes_cliente ON locacoes(loc_cli_id);
CREATE INDEX idx_locacoes_status ON locacoes(loc_status);
CREATE INDEX idx_itens_locacao ON itens(itn_loc_id);
CREATE INDEX idx_itens_exemplar ON itens(itn_exa_id);
CREATE INDEX idx_pagamentos_locacao ON pagamentos(pag_loc_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);

CREATE OR REPLACE FUNCTION fn_atualizar_totais() RETURNS TRIGGER AS $$
DECLARE
  v_id INTEGER;
BEGIN
  IF (TG_TABLE_NAME = 'itens') THEN
    v_id := COALESCE(NEW.itn_loc_id, OLD.itn_loc_id);
  ELSIF (TG_TABLE_NAME = 'pagamentos') THEN
    v_id := COALESCE(NEW.pag_loc_id, OLD.pag_loc_id);
  END IF;

  IF v_id IS NOT NULL THEN
    UPDATE locacoes
    SET
      loc_valor_total = (SELECT COALESCE(SUM(itn_valor_loc), 0) FROM itens WHERE itn_loc_id = v_id),
      loc_multa_total = (SELECT COALESCE(SUM(itn_valor_multa), 0) FROM itens WHERE itn_loc_id = v_id),
      loc_pago_total = (SELECT COALESCE(SUM(pag_valor), 0) FROM pagamentos WHERE pag_loc_id = v_id)
    WHERE loc_id = v_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_itens_totais
AFTER INSERT OR UPDATE OR DELETE ON itens
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_totais();

CREATE TRIGGER tg_pagamentos_totais
AFTER INSERT OR UPDATE OR DELETE ON pagamentos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_totais();

INSERT INTO clientes (cli_nome, cli_documento, cli_email, cli_telefone, cli_saldo) VALUES
('Ricardo Oliveira Santos', '452.189.330-12', 'ricardo.oliveira@gmail.com', '(11) 98822-1133', 0.00),
('Mariana Souza Lins', '112.556.789-00', 'mari.lins@outlook.com', '(21) 97755-4422', 15.50),
('Carlos Eduardo Ferreira', '887.443.221-55', 'cadu.ferreira@yahoo.com', '(31) 96633-8899', 0.00),
('Beatriz Mendes Silva', '334.221.009-88', 'bia.mendes@gmail.com', '(41) 95544-7766', 50.00),
('Felipe Albuquerque', '665.332.114-77', 'felipe.albu@hotmail.com', '(51) 94411-2233', 0.00);

INSERT INTO categorias (cat_nome) VALUES
('Ação'),
('Comédia'),
('Drama'),
('Ficção Científica'),
('Terror'),
('Documentário');

INSERT INTO filmes (fil_tmdb_id, fil_nome, fil_cat_id, fil_ano, fil_classificacao, fil_duracao_min, fil_sinopse, fil_poster_path, fil_valor_padrao) VALUES
(872585, 'Oppenheimer', 3, 2023, '16', 180, 'A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da bomba atômica.', '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 15.00),
(693134, 'Duna: Parte 2', 4, 2024, '14', 166, 'Paul Atreides se une a Chani e aos Fremen em busca de vingança e justiça.', '/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg', 18.00),
(533535, 'Deadpool & Wolverine', 1, 2024, '18', 128, 'Deadpool se une a Wolverine em uma missão caótica e cheia de ação.', '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', 20.00),
(1022789, 'Divertida Mente 2', 2, 2024, 'L', 96, 'Riley cresce e novas emoções chegam à sala de controle.', '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', 15.00),
(792307, 'Pobres Criaturas', 3, 2023, '18', 141, 'A jornada fantástica de Bella Baxter por liberdade, descoberta e autonomia.', '/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg', 12.00);

INSERT INTO exemplares (exa_fil_id, exa_codigo, exa_tipo, exa_status) VALUES
(1, 'OPP-001', 'FISICO', 'DISPONIVEL'),
(1, 'OPP-002', 'FISICO', 'ALUGADO'),
(2, 'DUN-001', 'FISICO', 'DISPONIVEL'),
(2, 'DUN-002', 'DIGITAL', 'DISPONIVEL'),
(3, 'D&W-001', 'FISICO', 'ALUGADO'),
(4, 'DIV-001', 'FISICO', 'DISPONIVEL'),
(5, 'POB-001', 'DIGITAL', 'DISPONIVEL');

INSERT INTO locacoes (loc_cli_id, loc_data_cad, loc_data_prevista, loc_data_devolucao, loc_status) VALUES
(1, NOW() - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', NULL, 'ABERTA'),
(2, NOW() - INTERVAL '8 days', CURRENT_DATE - INTERVAL '2 days', NULL, 'ABERTA'),
(3, NOW() - INTERVAL '12 days', CURRENT_DATE - INTERVAL '5 days', NOW() - INTERVAL '1 day', 'DEVOLVIDA');

INSERT INTO itens (itn_loc_id, itn_exa_id, itn_fil_id, itn_valor_loc, itn_status, itn_data_devolucao, itn_valor_multa) VALUES
(1, 2, 1, 15.00, 'ALUGADO', NULL, 0),
(2, 5, 3, 20.00, 'ALUGADO', NULL, 0),
(3, 3, 2, 18.00, 'DEVOLVIDO', NOW() - INTERVAL '1 day', 10.00);

INSERT INTO pagamentos (pag_loc_id, pag_valor, pag_forma, pag_observacao) VALUES
(1, 10.00, 'PIX', 'Pagamento parcial'),
(3, 28.00, 'CARTAO', 'Locação quitada com multa');

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE filmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplares ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All" ON clientes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON categorias FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON filmes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON exemplares FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON locacoes FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON itens FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON pagamentos FOR ALL TO public USING (true) WITH CHECK (true);

CREATE VIEW vw_filmes_disponiveis AS
SELECT
  f.fil_nome,
  c.cat_nome,
  COUNT(e.exa_id) FILTER (WHERE e.exa_status = 'DISPONIVEL') AS qtd_disponivel
FROM filmes f
JOIN categorias c ON c.cat_id = f.fil_cat_id
LEFT JOIN exemplares e ON e.exa_fil_id = f.fil_id
WHERE f.fil_ativo = true
GROUP BY f.fil_id, f.fil_nome, c.cat_nome
HAVING COUNT(e.exa_id) FILTER (WHERE e.exa_status = 'DISPONIVEL') > 0;

CREATE VIEW vw_filmes_alugados AS
SELECT
  l.loc_id,
  c.cli_nome,
  f.fil_nome,
  cat.cat_nome,
  e.exa_codigo,
  l.loc_data_prevista
FROM itens i
JOIN locacoes l ON l.loc_id = i.itn_loc_id
JOIN clientes c ON c.cli_id = l.loc_cli_id
JOIN filmes f ON f.fil_id = i.itn_fil_id
JOIN categorias cat ON cat.cat_id = f.fil_cat_id
JOIN exemplares e ON e.exa_id = i.itn_exa_id
WHERE i.itn_status = 'ALUGADO';

CREATE VIEW vw_locacoes_detalhes AS
SELECT
  l.loc_id,
  c.cli_nome,
  l.loc_status,
  l.loc_data_cad,
  l.loc_data_prevista,
  f.fil_nome,
  cat.cat_nome,
  e.exa_codigo,
  i.itn_valor_loc,
  i.itn_valor_multa
FROM itens i
JOIN locacoes l ON l.loc_id = i.itn_loc_id
JOIN clientes c ON c.cli_id = l.loc_cli_id
JOIN filmes f ON f.fil_id = i.itn_fil_id
JOIN categorias cat ON cat.cat_id = f.fil_cat_id
JOIN exemplares e ON e.exa_id = i.itn_exa_id;

CREATE VIEW vw_locacoes_abertas AS
SELECT
  l.*,
  c.cli_nome,
  (l.loc_valor_total + l.loc_multa_total - l.loc_pago_total) AS saldo_devedor
FROM locacoes l
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE l.loc_status = 'ABERTA';

CREATE VIEW vw_atrasos AS
SELECT
  l.loc_id,
  c.cli_nome,
  l.loc_data_prevista,
  (CURRENT_DATE - l.loc_data_prevista) AS dias_atraso,
  ((CURRENT_DATE - l.loc_data_prevista) * 2.00)::NUMERIC(10,2) AS multa_prevista
FROM locacoes l
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE l.loc_status = 'ABERTA'
  AND l.loc_data_prevista < CURRENT_DATE;

CREATE VIEW vw_multas AS
SELECT
  l.*,
  c.cli_nome,
  (l.loc_valor_total + l.loc_multa_total - l.loc_pago_total) AS saldo_devedor
FROM locacoes l
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE l.loc_multa_total > 0;

COMMIT;
