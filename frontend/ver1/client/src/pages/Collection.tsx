import { Sidebar } from "@/components/Sidebar";
import { useCollection } from "@/hooks/use-collections";
import { useRoute, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, User, Scale, BookOpen } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, getToken } from "@shared/routes";

export default function Collection() {
  const [, params]       = useRoute("/collections/:id");
  const collectionId     = params?.id ?? "";
  const { data, isLoading } = useCollection(collectionId);
  const { understanding, setUnderstanding } = useSession();
  const [, navigate]     = useLocation();
  const { toast }        = useToast();

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

  // ── Use in Understanding ────────────────────────────────────────────────────
  const handleUnderstand = async (paper: any) => {
    if (!paper.id) return;

    // If already indexed, just set it in session and navigate
    if (paper.is_indexed) {
      setUnderstanding({
        ...understanding,
        paper: { paper_id: paper.id, filename: paper.title || paper.id, file_path: paper.pdf_link || "" },
        messages: [],
      });
      navigate("/understand");
      return;
    }

    // Not indexed — need to index first
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

  // ── Use in Compare — navigate and pass paper_ids via session ───────────────
  const handleCompare = (paper: any) => {
    if (!paper.is_indexed) {
      toast({
        title: "Paper not indexed",
        description: "Add this paper to a collection first so it gets indexed, then try again.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Go to Comparison",
      description: `"${paper.title}" is ready. On the Compare page, use "Pick from Collection" to add it.`,
    });
    navigate("/compare");
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full max-w-7xl mx-auto">

        <div className="mb-8 border-b border-border pb-6">
          <h2 className="text-3xl font-display font-bold text-primary">{data.collection.name}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {papers.length} / 5 papers
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {papers.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
              <h3 className="text-lg font-medium">Empty Collection</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Add papers from search results using the <span className="font-medium">bookmark</span> icon.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
                Go to Search
              </Button>
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

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm" variant="outline" className="gap-2"
                    onClick={() => handleUnderstand(paper)}
                  >
                    <BookOpen className="w-3 h-3" /> Use in Understanding
                  </Button>
                  <Button
                    size="sm" variant="outline" className="gap-2"
                    onClick={() => handleCompare(paper)}
                  >
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