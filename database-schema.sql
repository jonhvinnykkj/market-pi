-- ============================================
-- SCHEMA COMPLETO DO SISTEMA - NEON DATABASE
-- ============================================

-- Limpar banco (se existir)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;

-- ============================================
-- TIPOS ENUM
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'gestor');
CREATE TYPE movement_type AS ENUM ('entrada', 'saida', 'ajuste', 'inventario');

-- ============================================
-- TABELA: users (usuários do sistema)
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'gestor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABELA: categories
-- ============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABELA: suppliers
-- ============================================

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABELA: products
-- ============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  barcode VARCHAR(100) UNIQUE,
  qr_code VARCHAR(255) NOT NULL UNIQUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(255),
  expiration_date DATE,
  batch_number VARCHAR(100),
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABELA: stock_movements
-- ============================================

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABELA: audit_logs
-- ============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_qr_code ON products(qr_code);
CREATE INDEX idx_products_barcode ON products(barcode);

-- Stock Movements
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar estoque do produto após movimentação
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET current_stock = NEW.new_stock,
      updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar estoque
CREATE TRIGGER trigger_update_product_stock
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_product_stock();

-- Função helper para criar logs de auditoria
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_table_name VARCHAR(100),
  p_record_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, changes)
  VALUES (p_user_id, p_action, p_table_name, p_record_id, p_changes)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- USUÁRIOS DE TESTE
-- Senha para todos: "teste123"
INSERT INTO users (username, password, full_name, role) VALUES
  ('admin', 'teste123', 'Administrador do Sistema', 'admin'),
  ('gestor', 'teste123', 'Gestor de Estoque', 'gestor');

-- CATEGORIAS PADRÃO
INSERT INTO categories (name, description) VALUES
  ('Hortifrúti', 'Frutas, verduras e legumes'),
  ('Laticínios', 'Leite, queijos, iogurtes'),
  ('Bebidas', 'Refrigerantes, sucos, águas'),
  ('Limpeza', 'Produtos de limpeza'),
  ('Higiene', 'Produtos de higiene pessoal'),
  ('Mercearia', 'Produtos secos e enlatados'),
  ('Padaria', 'Pães e produtos de padaria'),
  ('Açougue', 'Carnes e derivados'),
  ('Congelados', 'Produtos congelados'),
  ('Doces', 'Doces e sobremesas');

-- FORNECEDORES DE EXEMPLO
INSERT INTO suppliers (name, contact_name, email, phone, address) VALUES
  ('Distribuidora ABC', 'João Silva', 'joao@abc.com', '(11) 98765-4321', 'Rua A, 123'),
  ('Fornecedor XYZ', 'Maria Santos', 'maria@xyz.com', '(11) 91234-5678', 'Av. B, 456'),
  ('Atacado Total', 'Pedro Oliveira', 'pedro@total.com', '(11) 99999-8888', 'Rua C, 789');

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE users IS 'Usuários do sistema com autenticação simples';
COMMENT ON TABLE categories IS 'Categorias de produtos';
COMMENT ON TABLE suppliers IS 'Fornecedores';
COMMENT ON TABLE products IS 'Produtos do estoque';
COMMENT ON TABLE stock_movements IS 'Movimentações de estoque (entrada/saída/ajuste)';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria de todas as ações no sistema';

COMMENT ON COLUMN users.role IS 'Tipo de usuário: admin (acesso total) ou gestor (acesso limitado)';
COMMENT ON COLUMN products.qr_code IS 'Código QR único do produto';
COMMENT ON COLUMN stock_movements.type IS 'Tipo de movimentação: entrada, saida, ajuste, inventario';
COMMENT ON COLUMN audit_logs.action IS 'Ação realizada: create, update, delete, login, logout';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT 'Schema criado com sucesso!' as status;
SELECT 'Usuários de teste:' as info;
SELECT username, full_name, role FROM users;
