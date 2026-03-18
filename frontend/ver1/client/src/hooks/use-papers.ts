import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiFetch, getToken, API_BASE, RAGComparisonRow } from "@shared/routes";
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

// ─── RAG Compare ─────────────────────────────────────────────────────────────

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
        throw new Error((err as any).detail || "Comparison failed");
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
        throw new Error((err as any).detail || "Failed to get answer");
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