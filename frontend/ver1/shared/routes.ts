import { auth } from "../client/src/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { z } from 'zod';

export const API_BASE = import.meta.env.VITE_API_URL ||'https://citecraft.onrender.com';

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = `${API_BASE}${path}`;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}

export function getToken(): string | null { return localStorage.getItem('token'); }
export function setToken(token: string): void { localStorage.setItem('token', token); }
export function clearToken(): void { localStorage.removeItem('token'); }

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);

  const firebaseToken = await result.user.getIdToken();

  const res = await fetch(`${API_BASE}/auth/firebase`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firebaseToken}`,
    },
  });

  const data = await res.json();

  setToken(data.token); // use your existing helper
  return data;
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

// ─── Schemas ──────────────────────────────────────────────────────────────────

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

export const SourceChunkSchema = z.object({
  section:     z.string(),
  text:        z.string(),
  score:       z.number(),
  chunk_index: z.number(),
});
export type SourceChunk = z.infer<typeof SourceChunkSchema>;

export const RAGComparisonRowSchema = z.object({
  dimension: z.string(),
  values: z.record(z.string(), z.object({
    answer:  z.string(),
    sources: z.array(SourceChunkSchema).optional(),
  })),
});
export type RAGComparisonRow = z.infer<typeof RAGComparisonRowSchema>;

// ─── API contract ─────────────────────────────────────────────────────────────

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

    index: {
      method: 'POST' as const,
      path: '/papers/index' as const,
      responses: {
        200: z.object({ results: z.array(z.any()) }),
      },
    },

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

    ask: {
      method: 'POST' as const,
      pathTemplate: '/papers/:paper_id/ask' as const,
      responses: {
        200: z.object({
          answer:  z.string(),
          sources: z.array(SourceChunkSchema).optional(),
        }),
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