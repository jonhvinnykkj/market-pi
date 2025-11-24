import { z } from "zod";

// ==================== PRODUTOS ====================

export const productSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),

  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),

  barcode: z
    .string()
    .max(50, "Código de barras inválido")
    .optional()
    .nullable(),

  category_id: z
    .string()
    .uuid("Categoria inválida")
    .optional()
    .nullable(),

  supplier_id: z
    .string()
    .uuid("Fornecedor inválido")
    .optional()
    .nullable(),

  cost_price: z
    .number()
    .min(0, "Preço de custo deve ser positivo")
    .default(0),

  sale_price: z
    .number()
    .min(0, "Preço de venda deve ser positivo")
    .default(0),

  current_stock: z
    .number()
    .int("Estoque deve ser um número inteiro")
    .min(0, "Estoque não pode ser negativo")
    .default(0),

  minimum_stock: z
    .number()
    .int("Estoque mínimo deve ser um número inteiro")
    .min(0, "Estoque mínimo não pode ser negativo")
    .default(0),

  location: z
    .string()
    .max(100, "Localização deve ter no máximo 100 caracteres")
    .optional()
    .nullable(),

  expiration_date: z
    .string()
    .optional()
    .nullable(),

  batch_number: z
    .string()
    .max(50, "Número de lote deve ter no máximo 50 caracteres")
    .optional()
    .nullable(),

  status: z
    .enum(["ativo", "inativo"])
    .default("ativo"),

  image_url: z
    .string()
    .url("URL de imagem inválida")
    .optional()
    .nullable(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Schema para criação (sem campos auto-gerados)
export const createProductSchema = productSchema;

// Schema para atualização (todos os campos opcionais)
export const updateProductSchema = productSchema.partial();

// ==================== FORNECEDORES ====================

export const supplierSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),

  contact_name: z
    .string()
    .max(100, "Nome do contato deve ter no máximo 100 caracteres")
    .optional()
    .nullable(),

  email: z
    .string()
    .email("Email inválido")
    .optional()
    .nullable()
    .or(z.literal("")),

  phone: z
    .string()
    .max(20, "Telefone deve ter no máximo 20 caracteres")
    .optional()
    .nullable(),

  address: z
    .string()
    .max(200, "Endereço deve ter no máximo 200 caracteres")
    .optional()
    .nullable(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

// ==================== CATEGORIAS ====================

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome deve ter no máximo 50 caracteres"),

  description: z
    .string()
    .max(200, "Descrição deve ter no máximo 200 caracteres")
    .optional()
    .nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// ==================== MOVIMENTAÇÕES ====================

export const movementSchema = z.object({
  product_id: z
    .string()
    .uuid("Produto inválido"),

  type: z.enum(["entrada", "saida", "ajuste", "inventario"], {
    errorMap: () => ({ message: "Tipo de movimentação inválido" }),
  }),

  quantity: z
    .number()
    .int("Quantidade deve ser um número inteiro")
    .min(1, "Quantidade deve ser maior que zero"),

  reason: z
    .string()
    .max(500, "Justificativa deve ter no máximo 500 caracteres")
    .optional()
    .nullable(),
});

export type MovementFormData = z.infer<typeof movementSchema>;

// Schema customizado para validação de saída (não pode ser maior que estoque)
export const createMovementSchema = movementSchema.refine(
  (data) => {
    // Validação adicional será feita no componente com estoque atual
    return true;
  },
  {
    message: "Validação de estoque necessária",
  }
);

// ==================== AUTENTICAÇÃO ====================

export const loginSchema = z.object({
  email: z
    .string()
    .email("Email inválido"),

  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),

  email: z
    .string()
    .email("Email inválido"),

  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(50, "Senha deve ter no máximo 50 caracteres"),

  confirmPassword: z
    .string()
    .min(6, "Confirme sua senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// ==================== FILTROS ====================

export const productFilterSchema = z.object({
  search: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  status: z.enum(["ativo", "inativo", "todos"]).optional(),
  stock_status: z.enum(["todos", "em_estoque", "estoque_baixo", "sem_estoque"]).optional(),
});

export type ProductFilterData = z.infer<typeof productFilterSchema>;

export const movementFilterSchema = z.object({
  product_id: z.string().uuid().optional().nullable(),
  type: z.enum(["todos", "entrada", "saida", "ajuste", "inventario"]).optional(),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
});

export type MovementFilterData = z.infer<typeof movementFilterSchema>;
