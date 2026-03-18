import { z } from 'zod';

// ============================================
// CONFIG — change this to your deployed URL in prod
// ============================================
export const API_BASE = import.meta.env.VITE_API_URL ?? 'https://citecraft-production.up.railway.app';
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

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  localStorage.removeItem('token');
}

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
// PAPER SCHEMA
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
// RAG comparison row shape
// { dimension: "scope", values: { "paper-uuid-1": "...", "paper-uuid-2": "..." } }
// ============================================
export const RAGComparisonRowSchema = z.object({
  dimension: z.string(),
  values:    z.record(z.string(), z.string()),
});

export type RAGComparisonRow = z.infer<typeof RAGComparisonRowSchema>;

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: { method: 'POST' as const, path: '/auth/register' as const },
    login:    { method: 'POST' as const, path: '/auth/login'    as const },
  },

  papers: {
    search: {
      method: 'POST' as const,
      path: '/search_papers' as const,
      responses: {
        200: z.object({ papers: z.array(PaperSchema) }),
      },
    },

    // Step 1 of compare flow — upload a single PDF, get back paper_id + file_path
    upload: {
      method: 'POST' as const,
      path: '/upload_pdf' as const,
      responses: {
        200: z.object({
          file_path: z.string(),
          filename:  z.string(),
          paper_id:  z.string(),
        }),
      },
    },

    // Step 2 — index uploaded PDFs before comparing
    index: {
      method: 'POST' as const,
      path: '/papers/index' as const,
      responses: {
        200: z.object({ results: z.array(z.any()) }),
      },
    },

    // Step 3 — RAG-based comparison using paper_ids
    compare: {
      method: 'POST' as const,
      path: '/papers/compare' as const,
      responses: {
        200: z.object({
          comparison_id: z.string(),
          rows: z.array(RAGComparisonRowSchema),
        }),
      },
    },

    // Paper understanding — ask a question about a specific paper
    ask: {
      method: 'POST' as const,
      // paper_id is interpolated at call time: `/papers/${paper_id}/ask`
      pathTemplate: '/papers/:paper_id/ask' as const,
      responses: {
        200: z.object({ answer: z.string() }),
      },
    },

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