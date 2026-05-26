DROP TABLE IF EXISTS itens CASCADE;
DROP TABLE IF EXISTS locacoes CASCADE;
DROP TABLE IF EXISTS filmes CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

CREATE TABLE clientes (
  cli_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cli_nome VARCHAR(50) NOT NULL,
  cli_telefone VARCHAR(25),
  cli_data_cad TIMESTAMP DEFAULT NOW(),
  cli_saldo NUMERIC(10,2) CHECK (cli_saldo >= 0)
);

CREATE TABLE categorias (
  cat_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cat_nome VARCHAR(150) NOT NULL,
  cat_data_cad TIMESTAMP DEFAULT NOW()
);

CREATE TABLE filmes (
  fil_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fil_nome VARCHAR(150) NOT NULL,
  fil_cat_id INTEGER,
  fil_data_cad TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_filmes_categorias
    FOREIGN KEY (fil_cat_id)
    REFERENCES categorias(cat_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE locacoes (
  loc_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  loc_cli_id INTEGER,
  loc_data_cad TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_locacoes_clientes
    FOREIGN KEY (loc_cli_id)
    REFERENCES clientes(cli_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

CREATE TABLE itens (
  itn_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  itn_loc_id INTEGER,
  itn_fil_id INTEGER,
  itn_valor_loc NUMERIC(10,2) CHECK (itn_valor_loc >= 0),
  CONSTRAINT fk_itens_locacoes
    FOREIGN KEY (itn_loc_id)
    REFERENCES locacoes(loc_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_itens_filmes
    FOREIGN KEY (itn_fil_id)
    REFERENCES filmes(fil_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

INSERT INTO clientes
(cli_nome, cli_telefone, cli_data_cad, cli_saldo)
VALUES
('JOAO BATISTA', '(62) 99999-9999', NOW(), 100.00),
('JOSE CARLOS', '(62) 98888-8888', NOW(), 150.00),
('MANOEL CARLOS', '(62) 97777-7777', NOW(), 90.00),
('PEDRO PAULO', '(62) 96666-6666', NOW(), 200.00),
('JOAQUIM NABUCO', '(62) 95555-5555', NOW(), 250.00);

INSERT INTO categorias
(cat_nome, cat_data_cad)
VALUES
('ACAO', NOW()),
('ANIMACAO', NOW()),
('COMEDIA', NOW()),
('DOCUMENTARIO', NOW()),
('DRAMA', NOW()),
('FANTASIA', NOW()),
('FAROESTE/WESTERN', NOW()),
('FICCAO CIENTIFICA (Sci-Fi)', NOW()),
('ROMANCE', NOW()),
('SUSPENSE/THRILLER', NOW()),
('TERROR/HORROR', NOW());

INSERT INTO filmes
(fil_nome, fil_cat_id, fil_data_cad)
VALUES
('MATRIX', 1, NOW()),
('MATRIX RELOADED', 1, NOW()),
('MATRIX REVOLUTIONS', 1, NOW()),
('O REI LEAO', 2, NOW()),
('O SENHOR DOS ANEIS - A SOCIEDADE DO ANEL', 6, NOW()),
('TOY STORY', 2, NOW()),
('AUTO DA COMPADECIDA', 3, NOW()),
('O GRANDE DITADOR', 3, NOW()),
('COSMOS', 4, NOW()),
('PLANETA TERRA', 4, NOW()),
('CENTRAL DO BRASIL', 5, NOW()),
('O PODEROSO CHEFAO', 5, NOW()),
('HARRY POTTER E A PEDRA FILOSOFAL', 6, NOW()),
('TRES HOMENS EM CONFLITO', 7, NOW()),
('OS IMPERDOAVEIS', 7, NOW()),
('INTERESTELAR', 8, NOW()),
('BLADE RUNNER', 8, NOW()),
('TITANIC', 9, NOW()),
('DIARIO DE UMA PAIXAO', 9, NOW()),
('ILHA DO MEDO', 10, NOW()),
('O SILENCIO DOS INOCENTES', 10, NOW()),
('O ILUMINADO', 11, NOW()),
('PSICOSE', 11, NOW());

INSERT INTO locacoes
(loc_cli_id, loc_data_cad)
VALUES
(1, NOW()),
(2, NOW()),
(3, NOW()),
(4, NOW()),
(5, NOW());

INSERT INTO itens
(itn_loc_id, itn_fil_id, itn_valor_loc)
VALUES
(1, 1, 10.50),
(1, 2, 10.50),
(1, 3, 12.50),
(1, 5, 15.00),
(2, 4, 8.00),
(2, 6, 8.00),
(3, 7, 9.50),
(3, 11, 11.00),
(4, 16, 14.00),
(4, 17, 14.00),
(5, 20, 12.00),
(5, 22, 13.50);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE filmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura publica clientes" ON clientes FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica clientes" ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica clientes" ON clientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusao publica clientes" ON clientes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura publica categorias" ON categorias FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica categorias" ON categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica categorias" ON categorias FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusao publica categorias" ON categorias FOR DELETE USING (true);

CREATE POLICY "Permitir leitura publica filmes" ON filmes FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica filmes" ON filmes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica filmes" ON filmes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusao publica filmes" ON filmes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura publica locacoes" ON locacoes FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica locacoes" ON locacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica locacoes" ON locacoes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusao publica locacoes" ON locacoes FOR DELETE USING (true);

CREATE POLICY "Permitir leitura publica itens" ON itens FOR SELECT USING (true);
CREATE POLICY "Permitir insercao publica itens" ON itens FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao publica itens" ON itens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir exclusao publica itens" ON itens FOR DELETE USING (true);
