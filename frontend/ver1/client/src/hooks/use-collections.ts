import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useCollections() {
  return useQuery({
    queryKey: ["/collections"],
    queryFn: async () => {
      const res = await apiFetch("/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      const data = await res.json();
      // handle both { collections: [] } and bare array
      return Array.isArray(data) ? data : (data.collections ?? []);
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiFetch("/collections", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create collection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      toast({ title: "Collection created." });
    },
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ["/collections", id],
    queryFn: async () => {
      const res = await apiFetch(`/collections/${id}`);
      if (!res.ok) throw new Error("Failed to fetch collection");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useAddPaperToCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ collectionId, paperId }: { collectionId: string; paperId: string }) => {
      const res = await apiFetch(`/collections/${collectionId}/papers`, {
        method: "POST",
        body: JSON.stringify({ paper_id: paperId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Failed to add paper");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/collections", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      toast({ title: "Added to collection." });
    },
    onError: (err: any) => {
      toast({ title: "Could not add paper", description: err.message, variant: "destructive" });
    },
  });
}