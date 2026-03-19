import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Download, ExternalLink, User, Loader2, Copy, Check, ChevronDown, BookmarkPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@shared/routes";
import { useSession } from "@/context/SessionContext";
import { useCollections, useAddPaperToCollection } from "@/hooks/use-collections";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ─── Citation formats ─────────────────────────────────────────────────────────

type CitationFormat = "APA" | "MLA" | "IEEE" | "BibTeX";

function formatAuthorsAPA(authors: string): string {
  if (!authors) return "Unknown Author";
  const list = authors.split(",").map((a) => a.trim());
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} & ${list[1]}`;
  return `${list[0]} et al.`;
}

function formatAuthorsMLA(authors: string): string {
  if (!authors) return "Unknown Author";
  const list = authors.split(",").map((a) => a.trim());
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]}, and ${list[1]}`;
  return `${list[0]}, et al.`;
}

function formatAuthorsIEEE(authors: string): string {
  if (!authors) return "Unknown Author";
  const list = authors.split(",").map((a) => a.trim());
  if (list.length <= 3) return list.join(", ");
  return `${list.slice(0, 3).join(", ")} et al.`;
}

function slugify(title: string): string {
  return (title || "untitled").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20);
}

function generateCitation(paper: any, format: CitationFormat): string {
  const title   = paper.title || "Untitled";
  const authors = paper.authors || "";
  const year    = paper.publication_date
    ? new Date(paper.publication_date).getFullYear() || paper.publication_date
    : "n.d.";
  const doi     = paper.doi ? `https://doi.org/${paper.doi}` : (paper.pdf_link || "");
  const source  = paper.source || "Unknown Source";

  switch (format) {
    case "APA":
      return `${formatAuthorsAPA(authors)} (${year}). ${title}. ${source}.${doi ? ` ${doi}` : ""}`;
    case "MLA":
      return `${formatAuthorsMLA(authors)}. "${title}." ${source}, ${year}.${doi ? ` ${doi}` : ""}`;
    case "IEEE":
      return `${formatAuthorsIEEE(authors)}, "${title}," ${source}, ${year}.${doi ? ` DOI: ${doi}` : ""}`;
    case "BibTeX": {
      const key = `${(authors.split(",")[0] || "unknown").trim().split(" ").pop()?.toLowerCase()}${year}${slugify(title)}`;
      return `@article{${key},\n  author = {${authors}},\n  title = {${title}},\n  year = {${year}},\n  journal = {${source}}${doi ? `,\n  url = {${doi}}` : ""}\n}`;
    }
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={handleCopy} className="ml-1 shrink-0 text-muted-foreground hover:text-primary transition-colors">
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ─── Streaming loading messages ───────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Searching academic databases...",
  "Scanning Semantic Scholar...",
  "Checking arXiv...",
  "Ranking results by relevance...",
  "Almost there...",
];

function useStreamingMessage(isLoading: boolean) {
  const [msgIndex, setMsgIndex] = useState(0);
  useEffect(() => {
    if (!isLoading) { setMsgIndex(0); return; }
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);
  return LOADING_MESSAGES[msgIndex];
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(papers: any[]) {
  const headers = ["Title", "Authors", "Publication Date", "DOI", "Abstract", "PDF Link", "Source"];
  const rows = papers.map((p) => [
    `"${(p.title || "").replace(/"/g, '""')}"`,
    `"${(p.authors || "").replace(/"/g, '""')}"`,
    p.publication_date || "",
    p.doi || "",
    `"${(p.abstract || "").replace(/"/g, '""')}"`,
    p.pdf_link || "",
    p.source || "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "papers.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Add to Collection button ─────────────────────────────────────────────────

function AddToCollectionButton({ paper }: { paper: any }) {
  const { data: collectionsData } = useCollections();
  const addMutation = useAddPaperToCollection();
  const { toast } = useToast();

  const collections = collectionsData?.collections ?? collectionsData ?? [];

  const handleAdd = (collectionId: string) => {
    if (!paper.db_id) {
      toast({ title: "Cannot add", description: "Paper has no DB id.", variant: "destructive" });
      return;
    }
    addMutation.mutate({ collectionId, paperId: paper.db_id });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={addMutation.isPending}>
          {addMutation.isPending
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <BookmarkPlus className="w-3 h-3" />
          }
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Add to collection</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {collections.length === 0 ? (
          <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
        ) : (
          collections.map((c: any) => (
            <DropdownMenuItem key={c.id} onClick={() => handleAdd(c.id)}>
              {c.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { retrieval, setRetrieval }         = useSession();
  const [query, setQuery]                   = useState(retrieval.query);
  const [isLoading, setIsLoading]           = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
  const [citationFormat, setCitationFormat] = useState<CitationFormat>("APA");
  const { toast }      = useToast();
  const loadingMessage = useStreamingMessage(isLoading);
  const papers         = retrieval.papers;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setSelectedPapers(new Set());
    try {
      const res = await apiFetch("/search_papers", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setRetrieval({ query, papers: data.papers || [] });
    } catch (err: any) {
      toast({ title: "Search failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (index: number) => {
    const newSelected = new Set(selectedPapers);
    if (newSelected.has(index)) newSelected.delete(index);
    else newSelected.add(index);
    setSelectedPapers(newSelected);
  };

  const handleCompare = () => {
    if (selectedPapers.size < 2) {
      toast({ title: "Select more papers", description: "Please select at least 2 papers.", variant: "destructive" });
      return;
    }
    toast({
      title: "Coming soon",
      description: "Comparing directly from search results is not available yet. Upload PDFs on the Comparison page instead.",
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 max-w-7xl mx-auto w-full">

        <div className="mb-10 space-y-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-display font-bold">Paper Retrieval</h2>
            <p className="text-muted-foreground">Search across millions of research papers, save to collections, and analyze findings.</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-4 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Describe your research topic (e.g., 'Transformers in Computer Vision')..."
                className="pl-10 py-6 text-lg rounded-xl shadow-sm border-border/60"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="rounded-xl px-8" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          {papers.length > 0 && !isLoading && (
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <span className="font-medium text-sm text-muted-foreground">{papers.length} results found</span>
                {selectedPapers.size > 0 && (
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {selectedPapers.size} selected
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportCSV(papers)}>
                  <Download className="w-4 h-4" /> Export CSV
                </Button>
                <Button onClick={handleCompare} disabled={selectedPapers.size < 2} className="gap-2">
                  Compare Selected <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm animate-pulse">{loadingMessage}</p>
            </div>
          )}

          {!isLoading && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead>DOI</TableHead>
                    <TableHead>Publication Date</TableHead>
                    <TableHead className="min-w-[300px]">Abstract</TableHead>
                    <TableHead>PDF Link</TableHead>
                    <TableHead>Authors</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <span>Citation</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs font-normal text-muted-foreground hover:text-foreground">
                              {citationFormat} <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {(["APA", "MLA", "IEEE", "BibTeX"] as CitationFormat[]).map((fmt) => (
                              <DropdownMenuItem key={fmt} onClick={() => setCitationFormat(fmt)}
                                className={citationFormat === fmt ? "text-primary font-medium" : ""}>
                                {fmt}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {papers.map((paper: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/5">
                      <TableCell>
                        <Checkbox checked={selectedPapers.has(idx)} onCheckedChange={() => toggleSelection(idx)} />
                      </TableCell>
                      <TableCell className="font-semibold">{paper.title}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{paper.doi}</TableCell>
                      <TableCell className="text-xs">{paper.publication_date}</TableCell>
                      <TableCell className="text-sm">
                        <div className="line-clamp-3" title={paper.abstract}>{paper.abstract}</div>
                      </TableCell>
                      <TableCell>
                        {paper.pdf_link && (
                          <a href={paper.pdf_link} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1">
                            PDF <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-sm italic">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {paper.authors}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{paper.source}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                        <div className="flex items-start gap-1">
                          <span className={`${citationFormat === "BibTeX" ? "font-mono whitespace-pre" : "line-clamp-3"} flex-1`}>
                            {generateCitation(paper, citationFormat)}
                          </span>
                          <CopyButton text={generateCitation(paper, citationFormat)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <AddToCollectionButton paper={paper} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {retrieval.query && papers.length === 0 && (
                <div className="text-center py-20 bg-muted/20">
                  <h3 className="text-lg font-medium">No results found</h3>
                  <p className="text-muted-foreground">Try adjusting your search terms.</p>
                </div>
              )}
              {!retrieval.query && papers.length === 0 && (
                <div className="text-center py-20">
                  <h3 className="text-lg font-medium">Start your research</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Enter a topic above to search through our database of academic papers.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}