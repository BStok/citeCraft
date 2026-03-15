import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

// List Collections
export function useCollections() {
  return useQuery({
    queryKey: ["/collections"],
    queryFn: async () => {
      const res = await apiFetch("/collections");
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json(); // returns array of { id, name, created_at }
    },
  });
}

// Create Collection
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
      toast({ title: "Success", description: "Collection created." });
    },
  });
}

// Get Collection with its papers
export function useCollection(id: string) {
  return useQuery({
    queryKey: ["/collections", id],
    queryFn: async () => {
      const res = await apiFetch(`/collections/${id}`);
      if (!res.ok) throw new Error("Failed to fetch collection");
      return res.json(); // returns { collection, papers[] }
    },
    enabled: !!id,
  });
}

// Add Paper to Collection
export function useAddPaperToCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ collectionId, paperId }: { collectionId: string; paperId: string }) => {
      const res = await apiFetch(`/collections/${collectionId}/papers`, {
        method: "POST",
        body: JSON.stringify({ paper_id: paperId }),
      });
      if (!res.ok) throw new Error("Failed to add paper to collection");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/collections", variables.collectionId] });
      toast({ title: "Added", description: "Paper added to collection." });
    },
  });
}