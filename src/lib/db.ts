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

  async then<TResult>(
    onfulfilled?: ((value: QueryResult) => TResult | PromiseLike<TResult>) | null
  ): Promise<TResult> {
    try {
      const url = `${API_URL}/${this.table}?${this.params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      const result: QueryResult = {
        data,
        error: null,
        count: Array.isArray(data) ? data.length : undefined
      };
      return onfulfilled ? onfulfilled(result) : result as any;
    } catch (error) {
      const result: QueryResult = { data: null, error: error as Error, count: 0 };
      return onfulfilled ? onfulfilled(result) : result as any;
    }
  }
}

// Simula a interface do Supabase para compatibilidade
export const db = {
  from: (table: string) => ({
    select: (columns = '*', options?: { count?: string }) => {
      const builder = new QueryBuilder(table);
      return builder.select(columns, options);
    },

    insert: async (values: any) => {
      try {
        const response = await fetch(`${API_URL}/${table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
        const data = await response.json();
        return { data, error: null };
      } catch (error) {
        return { data: null, error: error as Error };
      }
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
