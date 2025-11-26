/**
 * Cliente de banco de dados PostgreSQL (Neon)
 * Substitui o Supabase por conexão direta
 */

const API_URL = '/api';

interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

// Query builder com encadeamento
class QueryBuilder {
  private table: string;
  private params: URLSearchParams;
  private selectColumns: string = '*';
  private orderColumn: string | null = null;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private isSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
    this.params = new URLSearchParams();
  }

  select(columns = '*', options?: { count?: string }) {
    this.selectColumns = columns;
    this.params.set('select', columns);
    if (options?.count) {
      this.params.set('count', options.count);
    }
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderDirection = options?.ascending === false ? 'desc' : 'asc';
    this.params.set('order', `${column}.${this.orderDirection}`);
    return this;
  }

  eq(column: string, value: any) {
    this.params.set(column, `eq.${value}`);
    return this;
  }

  neq(column: string, value: any) {
    this.params.set(column, `neq.${value}`);
    return this;
  }

  gte(column: string, value: any) {
    this.params.set(column, `gte.${value}`);
    return this;
  }

  lte(column: string, value: any) {
    this.params.set(column, `lte.${value}`);
    return this;
  }

  gt(column: string, value: any) {
    this.params.set(column, `gt.${value}`);
    return this;
  }

  lt(column: string, value: any) {
    this.params.set(column, `lt.${value}`);
    return this;
  }

  not(column: string, operator: string, value: any) {
    this.params.set(column, `not.${operator}.${value}`);
    return this;
  }

  is(column: string, value: any) {
    this.params.set(column, `is.${value}`);
    return this;
  }

  limit(count: number) {
    this.params.set('limit', count.toString());
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  private async execute(): Promise<QueryResult> {
    try {
      const url = `${API_URL}/${this.table}?${this.params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      // Se o servidor retornou erro, tratar como erro
      if (data && data.error) {
        return { data: null, error: new Error(data.error), count: 0 };
      }

      // Se single(), retorna o primeiro item ou null
      if (this.isSingle) {
        const item = Array.isArray(data) ? data[0] : data;
        return { data: item || null, error: null, count: item ? 1 : 0 };
      }

      // Garantir que data seja sempre um array para queries
      const resultData = Array.isArray(data) ? data : (data ? [data] : []);
      return {
        data: resultData,
        error: null,
        count: resultData.length
      };
    } catch (error) {
      return { data: this.isSingle ? null : [], error: error as Error, count: 0 };
    }
  }

  async then<TResult>(
    onfulfilled?: ((value: QueryResult) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    const result = await this.execute();
    return onfulfilled ? onfulfilled(result) : result as any;
  }
}

// Simula a interface do Supabase para compatibilidade
export const db = {
  from: (table: string) => ({
    select: (columns = '*', options?: { count?: string }) => {
      const builder = new QueryBuilder(table);
      return builder.select(columns, options);
    },

    insert: (values: any) => {
      const doInsert = async () => {
        try {
          const response = await fetch(`${API_URL}/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const data = await response.json();
          if (data && data.error) {
            return { data: null, error: new Error(data.error) };
          }
          return { data, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      };

      return {
        select: (_columns?: string) => ({
          single: async () => {
            const result = await doInsert();
            return result;
          },
          then: async (resolve: any) => {
            const result = await doInsert();
            return resolve ? resolve(result) : result;
          },
        }),
        single: async () => {
          const result = await doInsert();
          return result;
        },
        then: async (resolve: any) => {
          const result = await doInsert();
          return resolve ? resolve(result) : result;
        },
      };
    },

    update: (values: any) => ({
      eq: async (column: string, value: any) => {
        try {
          const response = await fetch(`${API_URL}/${table}?${column}=eq.${value}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          });
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },
    }),

    delete: () => ({
      eq: async (column: string, value: any) => {
        try {
          const response = await fetch(`${API_URL}/${table}?${column}=eq.${value}`, {
            method: 'DELETE',
          });
          const data = await response.json();
          return { data, error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },
    }),
  }),

  auth: {
    signInWithPassword: async (credentials: { username: string; password: string }) => {
      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          throw new Error('Credenciais inválidas');
        }

        const data = await response.json();

        // Salvar sessão no localStorage
        localStorage.setItem('session', JSON.stringify(data.session));
        localStorage.setItem('user', JSON.stringify(data.user));

        return { data: { session: data.session, user: data.user }, error: null };
      } catch (error) {
        return { data: { session: null, user: null }, error: error as Error };
      }
    },

    signOut: async () => {
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      return { error: null };
    },

    getSession: async () => {
      const session = localStorage.getItem('session');
      const user = localStorage.getItem('user');

      if (session && user) {
        return {
          data: {
            session: JSON.parse(session),
            user: JSON.parse(user),
          },
          error: null,
        };
      }

      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      const user = localStorage.getItem('user');
      return {
        data: { user: user ? JSON.parse(user) : null },
        error: null,
      };
    },
  },
};

// Export para compatibilidade com código existente
export const supabase = db;
