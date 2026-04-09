import { Sidebar } from "@/components/Sidebar";
import { useCollection, useRenameCollection, useDeleteCollection, useRemovePaperFromCollection } from "@/hooks/use-collections";
import { useRoute, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ExternalLink, User, Scale, BookOpen, Upload, Loader2, 
  Edit2, Trash2, X as XIcon, Check 
} from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, getToken } from "@shared/routes";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export default function Collection() {
  const [, params]       = useRoute("/collections/:id");
  const collectionId     = params?.id ?? "";
  const { data, isLoading } = useCollection(collectionId);
  const { understanding, setUnderstanding } = useSession();
  const [, navigate]     = useLocation();
  const { toast }        = useToast();
  const queryClient      = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const renameCollection = useRenameCollection();
  const deleteCollection = useDeleteCollection();
  const removePaper = useRemovePaperFromCollection();

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 w-full space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </main>
      </div>
    );
  }

  if (!data) return <div className="p-8">Collection not found</div>;

  const papers = data.papers ?? [];
  const collection = data.collection;

  // ── Upload PDF directly to collection ──────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/collections/${collectionId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail || "Upload failed");
      }

      toast({ title: "Uploaded", description: `${file.name} added and indexed.` });
      queryClient.invalidateQueries({ queryKey: ["/collections", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/collections"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── Rename collection ─────────────────────────────────────────────────────
  const handleRename = async () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Name cannot be empty", variant: "destructive" });
      return;
    }
    renameCollection.mutate(
      { collectionId, name: newName.trim() },
      {
        onSuccess: () => {
          setRenamingId(null);
          setNewName("");
        },
      }
    );
  };

  // ── Delete collection ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this collection? This cannot be undone.")) return;
    deleteCollection.mutate(collectionId, {
      onSuccess: () => {
        navigate("/");
      },
    });
  };

  // ── Remove paper from collection ──────────────────────────────────────────
  const handleRemovePaper = (paperId: string, paperTitle: string) => {
    if (!confirm(`Remove "${paperTitle}" from this collection?`)) return;
    removePaper.mutate({ collectionId, paperId });
  };

  // ── Use in Understanding ────────────────────────────────────────────────────
  const handleUnderstand = async (paper: any) => {
    if (!paper.id) return;

    if (paper.is_indexed) {
      setUnderstanding({
        ...understanding,
        paper: { paper_id: paper.id, filename: paper.title || paper.id, file_path: paper.pdf_link || "" },
        messages: [],
      });
      navigate("/understand");
      return;
    }

    if (!paper.pdf_link) {
      toast({ title: "No PDF available", description: "This paper has no PDF link for indexing.", variant: "destructive" });
      return;
    }

    toast({ title: "Indexing paper...", description: "This may take a moment." });
    try {
      const res = await fetch(`${API_BASE}/papers/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ paper_ids: [paper.id], file_paths: [paper.pdf_link] }),
      });
      if (!res.ok) throw new Error("Indexing failed");

      setUnderstanding({
        ...understanding,
        paper: { paper_id: paper.id, filename: paper.title || paper.id, file_path: paper.pdf_link },
        messages: [],
      });
      navigate("/understand");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // ── Use in Compare ──────────────────────────────────────────────────────────
  const handleCompare = (paper: any) => {
    if (!paper.is_indexed) {
      toast({
        title: "Paper not indexed",
        description: "This paper isn't indexed yet. Try clicking 'Use in Understanding' first to trigger indexing.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Go to Comparison",
      description: `"${paper.title}" is ready. Use "Pick from Collection" on the Compare page to add it.`,
    });
    navigate("/compare");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full max-w-7xl mx-auto">

        {/* Header with rename and delete */}
        <div className="mb-8 border-b border-border pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {renamingId === collectionId ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={collection.name}
                    className="w-64"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleRename}
                    disabled={renameCollection.isPending}
                  >
                    {renameCollection.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenamingId(null);
                      setNewName("");
                    }}
                  >
                    <XIcon className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-display font-bold text-primary">{collection.name}</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRenamingId(collectionId);
                      setNewName(collection.name);
                    }}
                    disabled={renamingId !== null}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCollection.isPending}
              className="gap-2"
            >
              {deleteCollection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete Collection
            </Button>
          </div>

          <p className="text-muted-foreground mt-2 text-sm">{papers.length} / 5 papers</p>
        </div>

        {/* Upload PDF to collection */}
        {papers.length < 5 && (
          <div className="mb-6">
            <input
              type="file" accept=".pdf" id="collection-upload"
              className="hidden" onChange={handleUpload} disabled={uploading}
            />
            <label htmlFor="collection-upload">
              <Button variant="outline" className="gap-2 cursor-pointer" disabled={uploading} asChild>
                <span>
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                    : <><Upload className="w-4 h-4" /> Upload PDF to Collection</>
                  }
                </span>
              </Button>
            </label>
          </div>
        )}

        {/* Papers list */}
        <div className="grid grid-cols-1 gap-4">
          {papers.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
              <h3 className="text-lg font-medium">Empty Collection</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                Upload a PDF directly, or add papers from search results using the bookmark icon.
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <label htmlFor="collection-upload">
                  <Button variant="outline" className="gap-2 cursor-pointer" disabled={uploading} asChild>
                    <span>
                      {uploading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                        : <><Upload className="w-4 h-4" /> Upload PDF</>
                      }
                    </span>
                  </Button>
                </label>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Go to Search
                </Button>
              </div>
            </div>
          ) : (
            papers.map((paper: any) => (
              <div key={paper.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-base">{paper.title || "Untitled"}</h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={paper.is_indexed ? "default" : "secondary"}>
                      {paper.is_indexed ? "Indexed" : "Not indexed"}
                    </Badge>
                    <Badge variant="secondary">{paper.source}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemovePaper(paper.id, paper.title || "Untitled")}
                      disabled={removePaper.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      {removePaper.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                  <User className="w-3 h-3" />
                  {paper.authors || "Unknown authors"}
                </div>

                {paper.publication_date && (
                  <p className="text-xs text-muted-foreground">{paper.publication_date}</p>
                )}

                {paper.abstract && (
                  <p className="text-sm line-clamp-3">{paper.abstract}</p>
                )}

                {paper.pdf_link && (
                  <a href={paper.pdf_link} target="_blank" rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm">
                    View PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleUnderstand(paper)}>
                    <BookOpen className="w-3 h-3" /> Use in Understanding
                  </Button>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleCompare(paper)}>
                    <Scale className="w-3 h-3" /> Use in Compare
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}