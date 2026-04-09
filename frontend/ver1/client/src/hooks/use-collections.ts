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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Failed to create collection");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      toast({ title: "Collection created." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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

// ✅ NEW: Rename a collection
export function useRenameCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ collectionId, name }: { collectionId: string; name: string }) => {
      const res = await apiFetch(`/collections/${collectionId}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Failed to rename collection");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/collections", variables.collectionId] });
      toast({ title: "Collection renamed." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

// ✅ NEW: Delete a collection
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (collectionId: string) => {
      const res = await apiFetch(`/collections/${collectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Failed to delete collection");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      toast({ title: "Collection deleted." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

// ✅ NEW: Remove paper from collection
export function useRemovePaperFromCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ collectionId, paperId }: { collectionId: string; paperId: string }) => {
      const res = await apiFetch(`/collections/${collectionId}/papers/${paperId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Failed to remove paper");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/collections", variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
      toast({ title: "Paper removed from collection." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}