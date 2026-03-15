import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiFetch } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

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

export function useComparePapers() {
  return useMutation({
    mutationFn: async ({ file_paths, comparison_name }: { file_paths: string[]; comparison_name?: string }) => {
      const res = await apiFetch(api.papers.compare.path, {
        method: "POST",
        body: JSON.stringify({ file_paths, comparison_name }),
      });
      if (!res.ok) throw new Error("Failed to compare papers");
      return api.papers.compare.responses[200].parse(await res.json());
    },
  });
}

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