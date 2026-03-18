import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiFetch, getToken, RAGComparisonRow } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// ─── Search ───────────────────────────────────────────────────────────────────

export function useSearchPapers(query: string) {
  return useQuery({
    queryKey: [api.papers.search.path, query],
    queryFn: async () => {
      if (!query) return [];
      const res = await apiFetch(api.papers.search.path, {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Failed to search papers");
      const data = await res.json();
      return data.papers;
    },
    enabled: !!query,
  });
}

// ─── Upload PDF (step 1 of compare flow) ──────────────────────────────────────

export function useUploadPdf() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ file_path: string; filename: string; paper_id: string }> => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${(api.papers.upload as any).path.startsWith("http")
          ? api.papers.upload.path
          : `https://citecraft-production.up.railway.app${api.papers.upload.path}`}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed for ${file.name}`);
      }

      return api.papers.upload.responses[200].parse(await res.json());
    },
  });
}

// ─── Index PDFs (step 2 of compare flow) ──────────────────────────────────────

export function useIndexPapers() {
  return useMutation({
    mutationFn: async (payload: { paper_ids: string[]; file_paths: string[] }) => {
      const res = await apiFetch(api.papers.index.path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Indexing failed");
      }
      return res.json();
    },
  });
}

// ─── RAG Compare (step 3 of compare flow) ────────────────────────────────────

export interface ComparePayload {
  paper_ids: string[];
  dimensions?: string[];
  custom_question?: string;
  comparison_name?: string;
}

export interface CompareResult {
  comparison_id: string;
  rows: RAGComparisonRow[];
}

export function useComparePapers() {
  return useMutation({
    mutationFn: async (payload: ComparePayload): Promise<CompareResult> => {
      const res = await apiFetch(api.papers.compare.path, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Comparison failed");
      }
      return api.papers.compare.responses[200].parse(await res.json());
    },
  });
}

// ─── Ask / Understand paper ───────────────────────────────────────────────────

export interface AskPayload {
  question: string;
  section_filter?: string;
}

export function useAskPaper(paperId: string) {
  return useMutation({
    mutationFn: async (payload: AskPayload): Promise<{ answer: string }> => {
      const res = await apiFetch(`/papers/${paperId}/ask`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to get answer");
      }
      return api.papers.ask.responses[200].parse(await res.json());
    },
  });
}

// ─── Save paper ───────────────────────────────────────────────────────────────

export function useSavePaper() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paper: any) => {
      const res = await apiFetch(api.papers.save.path, {
        method: "POST",
        body: JSON.stringify({ query: paper.title }),
      });
      if (!res.ok) throw new Error("Failed to save paper");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.collections.list.path] });
      toast({ title: "Paper Saved", description: "Paper has been added to your library." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save paper.", variant: "destructive" });
    },
  });
}

// ─── Comparisons list ─────────────────────────────────────────────────────────

export function useComparisons() {
  return useQuery({
    queryKey: [api.collections.list.path],
    queryFn: async () => {
      const res = await apiFetch(api.collections.list.path);
      if (!res.ok) throw new Error("Failed to fetch comparisons");
      const data = await res.json();
      return data.comparisons;
    },
  });
}