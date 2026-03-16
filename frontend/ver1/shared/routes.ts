import { z } from 'zod';

// ============================================
// CONFIG — change this to your deployed URL in prod
// ============================================
const API_BASE = 'https://citecraft-production.up.railway.app/docs';

// ============================================
// HELPERS
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${API_BASE}${path}`;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// Token helpers — stored in localStorage after login
export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

// Authenticated fetch — automatically attaches Bearer token
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

// ============================================
// PAPER SCHEMA (matches FastAPI Paper model)
// ============================================
export const PaperSchema = z.object({
  db_id:            z.string().optional(),
  title:            z.string().nullable().optional(),
  doi:              z.string().nullable().optional(),
  publication_date: z.string().nullable().optional(),
  abstract:         z.string().nullable().optional(),
  authors:          z.string().nullable().optional(),
  citation_count:   z.number().nullable().optional(),
  pdf_link:         z.string().nullable().optional(),
  source:           z.string().nullable().optional(),
});

export type Paper = z.infer<typeof PaperSchema>;

// ============================================
// API CONTRACT — mirrors FastAPI routes
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/auth/register' as const,
    },
    login: {
      method: 'POST' as const,
      path: '/auth/login' as const,
    },
  },

  papers: {
    // Maps to FastAPI POST /search_papers
    search: {
      method: 'POST' as const,
      path: '/search_papers' as const,
      responses: {
        200: z.object({ papers: z.array(PaperSchema) }),
      },
    },
    // Maps to FastAPI POST /compare_papers
    compare: {
      method: 'POST' as const,
      path: '/compare_papers' as const,
      responses: {
        200: z.object({
          comparison_id: z.string(),
          comparison: z.array(z.object({
            file:             z.string(),
            authors:          z.string().nullable().optional(),
            date:             z.string().nullable().optional(),
            scope:            z.string().nullable().optional(),
            dataset:          z.string().nullable().optional(),
            methodology:      z.string().nullable().optional(),
            results:          z.string().nullable().optional(),
            additional_notes: z.string().nullable().optional(),
          })),
        }),
      },
    },
    // Maps to FastAPI POST /search_papers (save is implicit on search)
    save: {
      method: 'POST' as const,
      path: '/search_papers' as const,
      responses: {
        200: z.object({ papers: z.array(PaperSchema) }),
      },
    },
  },

  collections: {
    list: {
      method: 'GET' as const,
      path: '/comparisons' as const,
      responses: {
        200: z.object({
          comparisons: z.array(z.object({
            id:         z.string(),
            name:       z.string(),
            created_at: z.string(),
          })),
        }),
      },
    },
  },
};
