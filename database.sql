-- Setup completo para o Sistema Locadora.
-- Banco alvo: PostgreSQL / Supabase.
--
-- Como usar:
-- 1. Abra o SQL Editor no Supabase.
-- 2. Cole este arquivo inteiro.
-- 3. Execute.
--
-- Atencao: este script apaga e recria as tabelas do projeto.

BEGIN;

DROP VIEW IF EXISTS vw_multas;
DROP VIEW IF EXISTS vw_atrasos;
DROP VIEW IF EXISTS vw_locacoes_abertas;
DROP VIEW IF EXISTS vw_filmes_alugados;
DROP VIEW IF EXISTS vw_filmes_disponiveis;
DROP VIEW IF EXISTS vw_locacoes_detalhes;
DROP VIEW IF EXISTS vw_clientes_locacoes;

DROP TABLE IF EXISTS pagamentos CASCADE;
DROP TABLE IF EXISTS itens CASCADE;
DROP TABLE IF EXISTS locacoes CASCADE;
DROP TABLE IF EXISTS exemplares CASCADE;
DROP TABLE IF EXISTS filmes CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

CREATE TABLE clientes (
  cli_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cli_nome VARCHAR(80) NOT NULL,
  cli_documento VARCHAR(20),
  cli_email VARCHAR(120),
  cli_telefone VARCHAR(25),
  cli_data_cad TIMESTAMP NOT NULL DEFAULT NOW(),
  cli_saldo NUMERIC(10,2) NOT NULL DEFAULT 0,
  cli_ativo BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT ck_clientes_saldo_positivo CHECK (cli_saldo >= 0),
  CONSTRAINT ck_clientes_nome_nao_vazio CHECK (BTRIM(cli_nome) <> ''),
  CONSTRAINT uq_clientes_documento UNIQUE (cli_documento)
);

CREATE TABLE categorias (
  cat_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cat_nome VARCHAR(150) NOT NULL,
  cat_data_cad TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_categorias_nome UNIQUE (cat_nome),
  CONSTRAINT ck_categorias_nome_nao_vazio CHECK (BTRIM(cat_nome) <> '')
);

CREATE TABLE filmes (
  fil_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fil_nome VARCHAR(150) NOT NULL,
  fil_cat_id INTEGER NOT NULL,
  fil_ano INTEGER,
  fil_classificacao VARCHAR(10),
  fil_duracao_min INTEGER,
  fil_valor_padrao NUMERIC(10,2) NOT NULL DEFAULT 10.00,
  fil_ativo BOOLEAN NOT NULL DEFAULT true,
  fil_data_cad TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_filmes_categorias
    FOREIGN KEY (fil_cat_id)
    REFERENCES categorias(cat_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT uq_filmes_nome_ano UNIQUE (fil_nome, fil_ano),
  CONSTRAINT ck_filmes_nome_nao_vazio CHECK (BTRIM(fil_nome) <> ''),
  CONSTRAINT ck_filmes_ano CHECK (fil_ano IS NULL OR fil_ano BETWEEN 1888 AND 2100),
  CONSTRAINT ck_filmes_duracao CHECK (fil_duracao_min IS NULL OR fil_duracao_min > 0),
  CONSTRAINT ck_filmes_valor CHECK (fil_valor_padrao >= 0)
);

CREATE TABLE exemplares (
  exa_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exa_fil_id INTEGER NOT NULL,
  exa_codigo VARCHAR(30) NOT NULL,
  exa_tipo VARCHAR(20) NOT NULL DEFAULT 'FISICO',
  exa_status VARCHAR(20) NOT NULL DEFAULT 'DISPONIVEL',
  exa_data_cad TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_exemplares_filmes
    FOREIGN KEY (exa_fil_id)
    REFERENCES filmes(fil_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT uq_exemplares_codigo UNIQUE (exa_codigo),
  CONSTRAINT ck_exemplares_tipo CHECK (exa_tipo IN ('FISICO', 'DIGITAL')),
  CONSTRAINT ck_exemplares_status CHECK (exa_status IN ('DISPONIVEL', 'ALUGADO', 'MANUTENCAO', 'INATIVO'))
);

CREATE TABLE locacoes (
  loc_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loc_cli_id INTEGER NOT NULL,
  loc_data_cad TIMESTAMP NOT NULL DEFAULT NOW(),
  loc_data_prevista DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  loc_data_devolucao TIMESTAMP,
  loc_status VARCHAR(20) NOT NULL DEFAULT 'ABERTA',
  loc_valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  loc_multa_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  loc_pago_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_locacoes_clientes
    FOREIGN KEY (loc_cli_id)
    REFERENCES clientes(cli_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_locacoes_status CHECK (loc_status IN ('ABERTA', 'DEVOLVIDA', 'CANCELADA')),
  CONSTRAINT ck_locacoes_valores CHECK (loc_valor_total >= 0 AND loc_multa_total >= 0 AND loc_pago_total >= 0)
);

CREATE TABLE itens (
  itn_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  itn_loc_id INTEGER NOT NULL,
  itn_fil_id INTEGER NOT NULL,
  itn_exa_id INTEGER NOT NULL,
  itn_valor_loc NUMERIC(10,2) NOT NULL,
  itn_valor_multa NUMERIC(10,2) NOT NULL DEFAULT 0,
  itn_data_devolucao TIMESTAMP,
  itn_status VARCHAR(20) NOT NULL DEFAULT 'ALUGADO',
  CONSTRAINT fk_itens_locacoes
    FOREIGN KEY (itn_loc_id)
    REFERENCES locacoes(loc_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_itens_filmes
    FOREIGN KEY (itn_fil_id)
    REFERENCES filmes(fil_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_itens_exemplares
    FOREIGN KEY (itn_exa_id)
    REFERENCES exemplares(exa_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_itens_valores CHECK (itn_valor_loc >= 0 AND itn_valor_multa >= 0),
  CONSTRAINT ck_itens_status CHECK (itn_status IN ('ALUGADO', 'DEVOLVIDO')),
  CONSTRAINT uq_itens_locacao_exemplar UNIQUE (itn_loc_id, itn_exa_id)
);

CREATE TABLE pagamentos (
  pag_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pag_loc_id INTEGER NOT NULL,
  pag_valor NUMERIC(10,2) NOT NULL,
  pag_forma VARCHAR(30) NOT NULL DEFAULT 'DINHEIRO',
  pag_data TIMESTAMP NOT NULL DEFAULT NOW(),
  pag_observacao VARCHAR(200),
  CONSTRAINT fk_pagamentos_locacoes
    FOREIGN KEY (pag_loc_id)
    REFERENCES locacoes(loc_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_pagamentos_valor CHECK (pag_valor > 0),
  CONSTRAINT ck_pagamentos_forma CHECK (pag_forma IN ('DINHEIRO', 'PIX', 'CARTAO', 'BOLETO'))
);

CREATE INDEX idx_clientes_nome ON clientes(cli_nome);
CREATE INDEX idx_filmes_categoria ON filmes(fil_cat_id);
CREATE INDEX idx_filmes_nome ON filmes(fil_nome);
CREATE INDEX idx_exemplares_filme ON exemplares(exa_fil_id);
CREATE INDEX idx_exemplares_status ON exemplares(exa_status);
CREATE INDEX idx_locacoes_cliente ON locacoes(loc_cli_id);
CREATE INDEX idx_locacoes_status ON locacoes(loc_status);
CREATE INDEX idx_itens_locacao ON itens(itn_loc_id);
CREATE INDEX idx_itens_filme ON itens(itn_fil_id);
CREATE INDEX idx_itens_exemplar ON itens(itn_exa_id);
CREATE INDEX idx_pagamentos_locacao ON pagamentos(pag_loc_id);

INSERT INTO clientes
  (cli_nome, cli_documento, cli_email, cli_telefone, cli_data_cad, cli_saldo)
VALUES
  ('JOAO BATISTA', '11111111111', 'joao@email.com', '(62) 99999-9999', NOW() - INTERVAL '20 days', 100.00),
  ('JOSE CARLOS', '22222222222', 'jose@email.com', '(62) 98888-8888', NOW() - INTERVAL '18 days', 150.00),
  ('MANOEL CARLOS', '33333333333', 'manoel@email.com', '(62) 97777-7777', NOW() - INTERVAL '15 days', 90.00),
  ('PEDRO PAULO', '44444444444', 'pedro@email.com', '(62) 96666-6666', NOW() - INTERVAL '10 days', 200.00),
  ('JOAQUIM NABUCO', '55555555555', 'joaquim@email.com', '(62) 95555-5555', NOW() - INTERVAL '7 days', 250.00),
  ('MARIA APARECIDA', '66666666666', 'maria@email.com', '(62) 94444-4444', NOW() - INTERVAL '4 days', 75.50),
  ('ANA CLARA', '77777777777', 'ana@email.com', '(62) 93333-3333', NOW() - INTERVAL '2 days', 130.00);

INSERT INTO categorias (cat_nome, cat_data_cad)
VALUES
  ('ACAO', NOW() - INTERVAL '30 days'),
  ('ANIMACAO', NOW() - INTERVAL '30 days'),
  ('COMEDIA', NOW() - INTERVAL '30 days'),
  ('DOCUMENTARIO', NOW() - INTERVAL '30 days'),
  ('DRAMA', NOW() - INTERVAL '30 days'),
  ('FANTASIA', NOW() - INTERVAL '30 days'),
  ('FAROESTE/WESTERN', NOW() - INTERVAL '30 days'),
  ('FICCAO CIENTIFICA', NOW() - INTERVAL '30 days'),
  ('ROMANCE', NOW() - INTERVAL '30 days'),
  ('SUSPENSE/THRILLER', NOW() - INTERVAL '30 days'),
  ('TERROR/HORROR', NOW() - INTERVAL '30 days');

INSERT INTO filmes
  (fil_nome, fil_cat_id, fil_ano, fil_classificacao, fil_duracao_min, fil_valor_padrao, fil_data_cad)
VALUES
  ('MATRIX', 1, 1999, '14', 136, 10.50, NOW() - INTERVAL '29 days'),
  ('MATRIX RELOADED', 1, 2003, '14', 138, 10.50, NOW() - INTERVAL '29 days'),
  ('MATRIX REVOLUTIONS', 1, 2003, '14', 129, 12.50, NOW() - INTERVAL '29 days'),
  ('O REI LEAO', 2, 1994, 'L', 88, 8.00, NOW() - INTERVAL '28 days'),
  ('O SENHOR DOS ANEIS - A SOCIEDADE DO ANEL', 6, 2001, '12', 178, 15.00, NOW() - INTERVAL '28 days'),
  ('TOY STORY', 2, 1995, 'L', 81, 8.00, NOW() - INTERVAL '27 days'),
  ('AUTO DA COMPADECIDA', 3, 2000, '12', 104, 9.50, NOW() - INTERVAL '27 days'),
  ('CENTRAL DO BRASIL', 5, 1998, '12', 113, 11.00, NOW() - INTERVAL '25 days'),
  ('INTERESTELAR', 8, 2014, '10', 169, 14.00, NOW() - INTERVAL '22 days'),
  ('BLADE RUNNER', 8, 1982, '14', 117, 14.00, NOW() - INTERVAL '22 days'),
  ('TITANIC', 9, 1997, '12', 195, 12.50, NOW() - INTERVAL '21 days'),
  ('ILHA DO MEDO', 10, 2010, '16', 138, 12.00, NOW() - INTERVAL '20 days'),
  ('O ILUMINADO', 11, 1980, '16', 146, 13.50, NOW() - INTERVAL '19 days'),
  ('A CHEGADA', 8, 2016, '10', 116, 13.00, NOW() - INTERVAL '18 days'),
  ('MINHA MAE E UMA PECA', 3, 2013, '12', 84, 9.00, NOW() - INTERVAL '18 days');

INSERT INTO exemplares (exa_fil_id, exa_codigo, exa_tipo, exa_status)
VALUES
  (1, 'MAT-001', 'FISICO', 'ALUGADO'),
  (1, 'MAT-002', 'DIGITAL', 'DISPONIVEL'),
  (2, 'MRL-001', 'FISICO', 'ALUGADO'),
  (3, 'MRV-001', 'FISICO', 'DISPONIVEL'),
  (4, 'REI-001', 'FISICO', 'DISPONIVEL'),
  (5, 'SDA-001', 'FISICO', 'ALUGADO'),
  (6, 'TOY-001', 'DIGITAL', 'DISPONIVEL'),
  (7, 'ADC-001', 'FISICO', 'DISPONIVEL'),
  (8, 'CDB-001', 'FISICO', 'DISPONIVEL'),
  (9, 'INT-001', 'FISICO', 'ALUGADO'),
  (9, 'INT-002', 'DIGITAL', 'DISPONIVEL'),
  (10, 'BRU-001', 'FISICO', 'ALUGADO'),
  (11, 'TIT-001', 'FISICO', 'DISPONIVEL'),
  (12, 'ILH-001', 'FISICO', 'DISPONIVEL'),
  (13, 'ILU-001', 'FISICO', 'ALUGADO'),
  (14, 'ACH-001', 'DIGITAL', 'DISPONIVEL'),
  (15, 'MMP-001', 'FISICO', 'ALUGADO'),
  (15, 'MMP-002', 'DIGITAL', 'DISPONIVEL');

INSERT INTO locacoes
  (loc_cli_id, loc_data_cad, loc_data_prevista, loc_data_devolucao, loc_status, loc_valor_total, loc_multa_total, loc_pago_total)
VALUES
  (1, NOW() - INTERVAL '6 days', CURRENT_DATE - INTERVAL '3 days', NULL, 'ABERTA', 21.00, 0.00, 0.00),
  (2, NOW() - INTERVAL '5 days', CURRENT_DATE - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'DEVOLVIDA', 15.00, 2.00, 17.00),
  (3, NOW() - INTERVAL '4 days', CURRENT_DATE + INTERVAL '1 day', NULL, 'ABERTA', 15.00, 0.00, 0.00),
  (4, NOW() - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', NULL, 'ABERTA', 28.00, 0.00, 10.00),
  (5, NOW() - INTERVAL '9 days', CURRENT_DATE - INTERVAL '6 days', NOW() - INTERVAL '2 days', 'DEVOLVIDA', 13.50, 8.00, 21.50);

INSERT INTO itens
  (itn_loc_id, itn_fil_id, itn_exa_id, itn_valor_loc, itn_valor_multa, itn_data_devolucao, itn_status)
VALUES
  (1, 1, 1, 10.50, 0.00, NULL, 'ALUGADO'),
  (1, 2, 3, 10.50, 0.00, NULL, 'ALUGADO'),
  (2, 7, 8, 9.50, 2.00, NOW() - INTERVAL '1 day', 'DEVOLVIDO'),
  (2, 4, 5, 5.50, 0.00, NOW() - INTERVAL '1 day', 'DEVOLVIDO'),
  (3, 5, 6, 15.00, 0.00, NULL, 'ALUGADO'),
  (4, 9, 10, 14.00, 0.00, NULL, 'ALUGADO'),
  (4, 10, 12, 14.00, 0.00, NULL, 'ALUGADO'),
  (5, 13, 15, 13.50, 8.00, NOW() - INTERVAL '2 days', 'DEVOLVIDO'),
  (5, 15, 17, 9.00, 0.00, NOW() - INTERVAL '2 days', 'DEVOLVIDO');

INSERT INTO pagamentos (pag_loc_id, pag_valor, pag_forma, pag_data, pag_observacao)
VALUES
  (2, 17.00, 'PIX', NOW() - INTERVAL '1 day', 'Pagamento da locacao com multa.'),
  (4, 10.00, 'DINHEIRO', NOW() - INTERVAL '2 days', 'Pagamento parcial.'),
  (5, 21.50, 'CARTAO', NOW() - INTERVAL '2 days', 'Locacao quitada.');

CREATE VIEW vw_locacoes_detalhes AS
SELECT
  c.cli_id,
  c.cli_nome,
  c.cli_saldo,
  l.loc_id,
  l.loc_data_cad,
  l.loc_data_prevista,
  l.loc_data_devolucao,
  l.loc_status,
  f.fil_id,
  f.fil_nome,
  f.fil_ano,
  cat.cat_id,
  cat.cat_nome,
  e.exa_id,
  e.exa_codigo,
  e.exa_tipo,
  i.itn_id,
  i.itn_valor_loc,
  i.itn_valor_multa,
  i.itn_status
FROM itens i
JOIN locacoes l ON l.loc_id = i.itn_loc_id
JOIN clientes c ON c.cli_id = l.loc_cli_id
JOIN filmes f ON f.fil_id = i.itn_fil_id
JOIN categorias cat ON cat.cat_id = f.fil_cat_id
JOIN exemplares e ON e.exa_id = i.itn_exa_id;

CREATE VIEW vw_filmes_disponiveis AS
SELECT
  f.fil_id,
  f.fil_nome,
  f.fil_ano,
  cat.cat_nome,
  COUNT(e.exa_id) AS qtd_disponivel
FROM filmes f
JOIN categorias cat ON cat.cat_id = f.fil_cat_id
JOIN exemplares e ON e.exa_fil_id = f.fil_id
WHERE f.fil_ativo = true
  AND e.exa_status = 'DISPONIVEL'
GROUP BY f.fil_id, f.fil_nome, f.fil_ano, cat.cat_nome;

CREATE VIEW vw_filmes_alugados AS
SELECT
  f.fil_id,
  f.fil_nome,
  cat.cat_nome,
  e.exa_id,
  e.exa_codigo,
  c.cli_nome,
  l.loc_id,
  l.loc_data_prevista
FROM itens i
JOIN exemplares e ON e.exa_id = i.itn_exa_id
JOIN filmes f ON f.fil_id = i.itn_fil_id
JOIN categorias cat ON cat.cat_id = f.fil_cat_id
JOIN locacoes l ON l.loc_id = i.itn_loc_id
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE i.itn_status = 'ALUGADO';

CREATE VIEW vw_locacoes_abertas AS
SELECT
  l.loc_id,
  c.cli_nome,
  l.loc_data_cad,
  l.loc_data_prevista,
  l.loc_valor_total,
  l.loc_multa_total,
  l.loc_pago_total,
  (l.loc_valor_total + l.loc_multa_total - l.loc_pago_total) AS saldo_devedor
FROM locacoes l
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE l.loc_status = 'ABERTA';

CREATE VIEW vw_atrasos AS
SELECT
  l.loc_id,
  c.cli_nome,
  l.loc_data_prevista,
  CURRENT_DATE - l.loc_data_prevista AS dias_atraso,
  l.loc_valor_total,
  ((CURRENT_DATE - l.loc_data_prevista) * 2.00) AS multa_prevista
FROM locacoes l
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE l.loc_status = 'ABERTA'
  AND l.loc_data_prevista < CURRENT_DATE;

CREATE VIEW vw_multas AS
SELECT
  l.loc_id,
  c.cli_nome,
  l.loc_status,
  l.loc_multa_total,
  l.loc_pago_total,
  (l.loc_valor_total + l.loc_multa_total - l.loc_pago_total) AS saldo_devedor
FROM locacoes l
JOIN clientes c ON c.cli_id = l.loc_cli_id
WHERE l.loc_multa_total > 0;

CREATE VIEW vw_clientes_locacoes AS
SELECT
  c.cli_id,
  c.cli_nome,
  l.loc_id,
  l.loc_data_cad,
  l.loc_data_prevista,
  l.loc_status,
  COUNT(i.itn_id) AS qtd_itens,
  COALESCE(SUM(i.itn_valor_loc), 0) AS valor_total,
  COALESCE(SUM(i.itn_valor_multa), 0) AS multa_total
FROM clientes c
LEFT JOIN locacoes l ON l.loc_cli_id = c.cli_id
LEFT JOIN itens i ON i.itn_loc_id = l.loc_id
GROUP BY c.cli_id, c.cli_nome, l.loc_id, l.loc_data_cad, l.loc_data_prevista, l.loc_status;

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE filmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplares ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crud clientes" ON clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crud categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crud filmes" ON filmes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crud exemplares" ON exemplares FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crud locacoes" ON locacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crud itens" ON itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crud pagamentos" ON pagamentos FOR ALL USING (true) WITH CHECK (true);

COMMIT;

SELECT 'clientes' AS tabela, COUNT(*) AS total FROM clientes
UNION ALL
SELECT 'categorias', COUNT(*) FROM categorias
UNION ALL
SELECT 'filmes', COUNT(*) FROM filmes
UNION ALL
SELECT 'exemplares', COUNT(*) FROM exemplares
UNION ALL
SELECT 'locacoes', COUNT(*) FROM locacoes
UNION ALL
SELECT 'itens', COUNT(*) FROM itens
UNION ALL
SELECT 'pagamentos', COUNT(*) FROM pagamentos;

SELECT * FROM vw_filmes_disponiveis ORDER BY fil_nome;
SELECT * FROM vw_atrasos ORDER BY dias_atraso DESC;
