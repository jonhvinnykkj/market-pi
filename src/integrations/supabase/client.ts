/**
 * Cliente Mock para substituir Supabase
 * Usa dados em memória e localStorage para autenticação
 */

// Mock de dados em memória
const mockData: Record<string, any[]> = {
  profiles: [],
  categories: [],
  suppliers: [],
  products: [],
  stock_movements: [],
  audit_logs: [],
};

// Carregar dados do localStorage
const loadMockData = () => {
  const saved = localStorage.getItem('mockData');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.assign(mockData, parsed);
    } catch (e) {
      console.error('Error loading mock data:', e);
    }
  }
};

// Salvar dados no localStorage
const saveMockData = () => {
  localStorage.setItem('mockData', JSON.stringify(mockData));
};

// Inicializar dados
if (typeof window !== 'undefined') {
  loadMockData();
}

// Helper para gerar UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Helper para pegar usuário atual
const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Query builder mock
class MockQueryBuilder {
  private table: string;
  private selectColumns: string = '*';
  private filterColumn?: string;
  private filterValue?: any;
  private filterOperator: string = 'eq';
  private orderColumn?: string;
  private orderAscending: boolean = true;
  private limitValue?: number;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }) {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'eq';
    return this;
  }

  neq(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'neq';
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = `not_${operator}`;
    return this;
  }

  lte(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'lte';
    return this;
  }

  gte(column: string, value: any) {
    this.filterColumn = column;
    this.filterValue = value;
    this.filterOperator = 'gte';
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  async single() {
    const result = await this.then((res: any) => res);
    return {
      data: Array.isArray(result.data) ? result.data[0] || null : result.data,
      error: result.error,
      count: result.count,
    };
  }

  async then(resolve: Function, reject?: Function) {
    try {
      let data = [...(mockData[this.table] || [])];

      // Aplicar filtros
      if (this.filterColumn) {
        data = data.filter(row => {
          const value = row[this.filterColumn!];
          switch (this.filterOperator) {
            case 'eq': return value === this.filterValue;
            case 'neq': return value !== this.filterValue;
            case 'lte': return value <= this.filterValue;
            case 'gte': return value >= this.filterValue;
            case 'not_is': return value !== null;
            default: return true;
          }
        });
      }

      // Aplicar ordenação
      if (this.orderColumn) {
        data.sort((a, b) => {
          const aVal = a[this.orderColumn!];
          const bVal = b[this.orderColumn!];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return this.orderAscending ? comparison : -comparison;
        });
      }

      // Aplicar limite
      if (this.limitValue) {
        data = data.slice(0, this.limitValue);
      }

      const result = { data, error: null, count: data.length };
      resolve(result);
      return result;
    } catch (error) {
      const result = { data: null, error, count: 0 };
      if (reject) reject(result);
      return result;
    }
  }
}

// Mock Supabase client
export const supabase = {
  from: (table: string) => ({
    select: (columns?: string, options?: any) => {
      return new MockQueryBuilder(table).select(columns, options);
    },

    insert: (values: any) => {
      const data = Array.isArray(values) ? values : [values];
      const newRecords = data.map(v => ({
        ...v,
        id: v.id || generateUUID(),
        created_at: v.created_at || new Date().toISOString(),
        updated_at: v.updated_at || new Date().toISOString(),
      }));

      mockData[table] = [...(mockData[table] || []), ...newRecords];
      saveMockData();

      return {
        data: newRecords,
        error: null,
        then: async (resolve: Function) => resolve({ data: newRecords, error: null, count: newRecords.length }),
        single: async () => ({ data: newRecords[0] || null, error: null, count: 1 }),
        select: () => ({
          single: async () => ({ data: newRecords[0], error: null, count: 1 }),
          then: async (resolve: Function) => resolve({ data: newRecords, error: null, count: newRecords.length }),
        }),
      };
    },

    update: (values: any) => ({
      eq: async (column: string, value: any) => {
        const index = mockData[table]?.findIndex(row => row[column] === value);
        if (index !== undefined && index >= 0) {
          mockData[table][index] = {
            ...mockData[table][index],
            ...values,
            updated_at: new Date().toISOString(),
          };
          saveMockData();
          return {
            data: mockData[table][index],
            error: null,
            select: () => ({
              single: async () => ({ data: mockData[table][index], error: null, count: 1 }),
            }),
          };
        }
        return { data: null, error: new Error('Record not found') };
      },
    }),

    delete: () => ({
      eq: async (column: string, value: any) => {
        const current = mockData[table] || [];
        const remaining = current.filter(row => row[column] !== value);
        const removed = current.filter(row => row[column] === value);
        mockData[table] = remaining;
        saveMockData();
        return {
          data: removed,
          error: null,
          select: () => ({
            single: async () => ({ data: removed[0] || null, error: null, count: removed.length }),
          }),
        };
      },
    }),
  }),

  auth: {
    signInWithPassword: async (credentials: { email?: string; username?: string; password: string }) => {
      // Mock - já tratado na página Auth
      return { data: { session: null, user: null }, error: null };
    },

    signOut: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      }
      return { error: null };
    },

    getSession: async () => {
      if (typeof window === 'undefined') {
        return { data: { session: null }, error: null };
      }
      const session = localStorage.getItem('session');
      if (session) {
        return { data: { session: JSON.parse(session) }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      const user = getCurrentUser();
      return { data: { user }, error: null };
    },

    onAuthStateChange: (callback: Function) => {
      // Mock - não faz nada
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },

  storage: {
    from: (bucket: string) => {
      const makePublicUrl = (path: string) => ({
        data: { publicUrl: `https://mock-storage/${bucket}/${path}` },
        error: null,
      });

      return {
        upload: async (path: string, _file: File) => {
          // Emula upload bem-sucedido
          return { data: { path }, error: null };
        },
        update: async (path: string, _file: File) => {
          return { data: { path }, error: null };
        },
        remove: async (_paths: string[]) => {
          return { data: null, error: null };
        },
        getPublicUrl: (path: string) => makePublicUrl(path),
      };
    },
  },

  rpc: async (fnName: string, params: any) => {
    // Mock de funções RPC
    if (fnName === 'log_audit_event') {
      const logEntry = {
        id: generateUUID(),
        user_id: params.p_user_id || getCurrentUser()?.id,
        action: params.p_action,
        table_name: params.p_table_name,
        record_id: params.p_record_id,
        changes: params.p_changes,
        created_at: new Date().toISOString(),
      };

      mockData.audit_logs = [...(mockData.audit_logs || []), logEntry];
      saveMockData();

      return { data: logEntry.id, error: null };
    }

    return { data: null, error: new Error('RPC function not implemented') };
  },
};

// Export para compatibilidade
export default supabase;
