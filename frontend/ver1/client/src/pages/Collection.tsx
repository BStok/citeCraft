import { Sidebar } from "@/components/Sidebar";
import { useCollection } from "@/hooks/use-collections";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User } from "lucide-react";

export default function Collection() {
  const [, params] = useRoute("/collections/:id");
  const collectionId = params?.id ?? "";
  const { data, isLoading } = useCollection(collectionId);

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

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full max-w-7xl mx-auto">
        <div className="mb-8 border-b border-border pb-6">
          <h2 className="text-3xl font-display font-bold text-primary">{data.collection.name}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {data.papers?.length ?? 0} papers
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {data.papers?.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border">
              <h3 className="text-lg font-medium">Empty Collection</h3>
              <p className="text-muted-foreground">Add papers from search results to this collection.</p>
            </div>
          ) : (
            data.papers.map((paper: any) => (
              <div key={paper.id} className="rounded-xl border border-border bg-card p-5 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-base">{paper.title || "Untitled"}</h3>
                  <Badge variant="secondary">{paper.source}</Badge>
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
                  <a
                    href={paper.pdf_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    View PDF <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}