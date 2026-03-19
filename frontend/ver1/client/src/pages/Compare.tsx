import { Sidebar } from "@/components/Sidebar";
import { useComparePapers } from "@/hooks/use-papers";
import { useCollections, useCollection } from "@/hooks/use-collections";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Upload, Play, FileText, X, Loader2, Library, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { API_BASE, getToken } from "@shared/routes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface UploadedPaper {
  paper_id: string;
  file_path: string;
  filename: string;
}

interface TableData {
  headers: { id: string; title: string }[];
  rows: { label: string; values: Record<string, string> }[];
}

const ALL_DIMENSIONS: { value: string; label: string }[] = [
  { value: "scope",            label: "Scope"            },
  { value: "dataset",          label: "Dataset"          },
  { value: "methodology",      label: "Methodology"      },
  { value: "results",          label: "Results"          },
  { value: "additional_notes", label: "Additional Notes" },
];

function dimensionLabel(dim: string): string {
  return ALL_DIMENSIONS.find((d) => d.value === dim)?.label
    ?? dim.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function downloadCSV(tableData: TableData, name: string) {
  const headers = ["Dimension", ...tableData.headers.map((h) => h.title)];
  const rows = tableData.rows.map((row) => [
    row.label,
    ...tableData.headers.map((h) => `"${(row.values[h.id] || "").replace(/"/g, '""')}"`),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "comparison"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StepBadge({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2
        ${done ? "bg-primary border-primary text-primary-foreground"
          : active ? "border-primary text-primary"
          : "border-muted-foreground/30"}`}>
        {done ? "✓" : step}
      </div>
      <span className={active ? "font-medium" : ""}>{label}</span>
    </div>
  );
}

// ─── Collection picker dropdown ───────────────────────────────────────────────

function CollectionPicker({ onAdd }: { onAdd: (paper: UploadedPaper) => void }) {
  const { data: collectionsData } = useCollections();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const { data: collectionDetail } = useCollection(selectedCollectionId);
  const { toast } = useToast();

  const collections = collectionsData?.collections ?? collectionsData ?? [];
  const collectionPapers = collectionDetail?.papers ?? [];

  const handlePick = (paper: any) => {
    if (!paper.is_indexed) {
      toast({
        title: "Not indexed",
        description: "This paper hasn't been indexed yet. Open its collection page to index it first.",
        variant: "destructive",
      });
      return;
    }
    onAdd({ paper_id: paper.id, file_path: paper.pdf_link || "", filename: paper.title || paper.id });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Pick collection */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Library className="w-4 h-4" />
            {selectedCollectionId && collectionDetail
              ? collectionDetail.collection.name
              : "Pick from Collection"
            }
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs text-muted-foreground">Your collections</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {collections.length === 0
            ? <DropdownMenuItem disabled>No collections yet</DropdownMenuItem>
            : collections.map((c: any) => (
                <DropdownMenuItem key={c.id} onClick={() => setSelectedCollectionId(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))
          }
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Pick paper from selected collection */}
      {selectedCollectionId && collectionPapers.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Add paper <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Papers in collection</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {collectionPapers.map((p: any) => (
              <DropdownMenuItem key={p.id} onClick={() => handlePick(p)}
                className={!p.is_indexed ? "text-muted-foreground" : ""}>
                {p.title || "Untitled"}
                {!p.is_indexed && " (not indexed)"}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Compare() {
  const compareMutation = useComparePapers();
  const [papers, setPapers]                 = useState<UploadedPaper[]>([]);
  const [comparisonName, setComparisonName] = useState("");
  const [tableData, setTableData]           = useState<TableData | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [indexing, setIndexing]             = useState(false);
  const [indexed, setIndexed]               = useState(false);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(ALL_DIMENSIONS.map((d) => d.value));
  const [customQuestion, setCustomQuestion] = useState("");
  const { toast } = useToast();

  const toggleDimension = (value: string) => {
    setSelectedDimensions((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_BASE}/upload_pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        if (!res.ok) {
          toast({ title: "Upload failed", description: `Could not upload ${file.name}`, variant: "destructive" });
          continue;
        }
        const data = await res.json();
        setPapers((prev) => [...prev, { paper_id: data.paper_id, file_path: data.file_path, filename: data.filename }]);
        setIndexed(false);
        toast({ title: "Uploaded", description: `${file.name} ready.` });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── Add from collection (already indexed, skip index step) ─────────────────
  const handleAddFromCollection = (paper: UploadedPaper) => {
    if (papers.find((p) => p.paper_id === paper.paper_id)) {
      toast({ title: "Already added", description: "This paper is already in the list." });
      return;
    }
    setPapers((prev) => [...prev, paper]);
    // Collection papers are already indexed — if all papers are from collection, mark as indexed
    setIndexed(false);
    toast({ title: "Added", description: `${paper.filename} added from collection.` });
  };

  const removePaper = (index: number) => {
    setPapers(papers.filter((_, i) => i !== index));
    setIndexed(false);
  };

  // ── Index ───────────────────────────────────────────────────────────────────
  const handleIndex = async () => {
    if (papers.length < 2) {
      toast({ title: "Need more files", description: "Add at least 2 papers.", variant: "destructive" });
      return;
    }
    // Papers from collections are already indexed — only index non-indexed ones
    const toIndex = papers.filter((p) => p.file_path && !p.file_path.startsWith("http"));
    if (toIndex.length === 0) {
      // All from collections, skip indexing
      setIndexed(true);
      toast({ title: "Ready", description: "All papers already indexed." });
      return;
    }
    setIndexing(true);
    try {
      const res = await fetch(`${API_BASE}/papers/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          paper_ids:  papers.map((p) => p.paper_id),
          file_paths: papers.map((p) => p.file_path),
        }),
      });
      if (!res.ok) throw new Error("Indexing failed");
      setIndexed(true);
      toast({ title: "Indexed", description: "Papers are ready to compare." });
    } catch (err: any) {
      toast({ title: "Indexing failed", description: err.message, variant: "destructive" });
    } finally {
      setIndexing(false);
    }
  };

  // ── Compare ─────────────────────────────────────────────────────────────────
  const handleCompare = () => {
    if (selectedDimensions.length === 0) {
      toast({ title: "Select dimensions", description: "Pick at least one dimension.", variant: "destructive" });
      return;
    }
    compareMutation.mutate(
      {
        paper_ids:       papers.map((p) => p.paper_id),
        dimensions:      selectedDimensions,
        custom_question: customQuestion.trim() || undefined,
        comparison_name: comparisonName || "Untitled Comparison",
      },
      {
        onSuccess: (data) => {
          const headers = papers.map((p) => ({ id: p.paper_id, title: p.filename }));
          const rows = data.rows.map((r: any) => ({
            label:  dimensionLabel(r.dimension),
            values: r.values,
          }));
          setTableData({ headers, rows });
        },
        onError: (err: any) => {
          toast({ title: "Comparison failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  const removeColumn = (headerId: string) => {
    if (!tableData) return;
    if (tableData.headers.length <= 1) {
      toast({ title: "Cannot remove", description: "At least one paper must remain.", variant: "destructive" });
      return;
    }
    setTableData({
      headers: tableData.headers.filter((h) => h.id !== headerId),
      rows:    tableData.rows.map((row) => {
        const v = { ...row.values };
        delete v[headerId];
        return { ...row, values: v };
      }),
    });
  };

  const handleReset = () => {
    setTableData(null); setPapers([]); setComparisonName("");
    setIndexed(false); setCustomQuestion("");
    setSelectedDimensions(ALL_DIMENSIONS.map((d) => d.value));
  };

  const isBusy      = uploading || indexing || compareMutation.isPending;
  const currentStep = indexed ? 3 : papers.length >= 2 ? 2 : 1;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full overflow-hidden">

        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h2 className="text-3xl font-display font-bold">Paper Comparison</h2>
            <p className="text-muted-foreground">Analyze differences across key dimensions.</p>
          </div>
        </div>

        {!tableData && (
          <div className="mb-8 space-y-6 max-w-2xl">

            <div className="flex items-center gap-4">
              <StepBadge step={1} label="Add Papers"   active={currentStep === 1} done={papers.length >= 2} />
              <div className="h-px flex-1 bg-border" />
              <StepBadge step={2} label="Index Papers" active={currentStep === 2} done={indexed} />
              <div className="h-px flex-1 bg-border" />
              <StepBadge step={3} label="Compare"      active={currentStep === 3} done={!!tableData} />
            </div>

            <Input placeholder="Comparison name (optional)" value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)} />

            {/* Dimensions */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Dimensions to compare</p>
              <div className="flex flex-wrap gap-2">
                {ALL_DIMENSIONS.map((dim) => (
                  <button key={dim.value} onClick={() => toggleDimension(dim.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                      ${selectedDimensions.includes(dim.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}>
                    {dim.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom question */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Custom question <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Input placeholder="e.g. Which paper is more suitable for real-time applications?"
                value={customQuestion} onChange={(e) => setCustomQuestion(e.target.value)} />
            </div>

            {/* Add papers — upload OR collection */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Add papers</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <input type="file" accept=".pdf" multiple id="pdf-upload"
                    className="hidden" onChange={handleFileUpload} disabled={isBusy} />
                  <label htmlFor="pdf-upload">
                    <Button variant="outline" className="gap-2 cursor-pointer" disabled={isBusy} asChild>
                      <span>
                        {uploading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                          : <><Upload className="w-4 h-4" /> Upload PDFs</>
                        }
                      </span>
                    </Button>
                  </label>
                </div>
                <span className="text-xs text-muted-foreground">or</span>
                <CollectionPicker onAdd={handleAddFromCollection} />
              </div>
              <p className="text-xs text-muted-foreground">Papers from collections are already indexed — no need to re-index.</p>
            </div>

            {/* Paper list */}
            {papers.length > 0 && (
              <div className="space-y-2">
                {papers.map((p, i) => (
                  <div key={p.paper_id} className="flex items-center justify-between bg-muted/30 px-4 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{p.filename}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePaper(i)} disabled={isBusy}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {!indexed && (
                  <Button onClick={handleIndex} disabled={isBusy || papers.length < 2}
                    variant="outline" className="gap-2 w-full">
                    {indexing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Indexing...</>
                      : "Index Papers for RAG"
                    }
                  </Button>
                )}

                {indexed && (
                  <Button onClick={handleCompare} disabled={isBusy || selectedDimensions.length === 0}
                    className="gap-2 w-full">
                    {compareMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing...</>
                      : <><Play className="w-4 h-4" /> Run Comparison</>
                    }
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {compareMutation.isPending && !tableData && <Skeleton className="h-[500px] w-full rounded-xl" />}

        {tableData && (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[200px] font-bold text-primary sticky left-0 bg-muted/50 z-10 border-r border-border">
                      Dimension
                    </TableHead>
                    {tableData.headers.map((header) => (
                      <TableHead key={header.id} className="min-w-[300px] align-top py-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground text-base line-clamp-2">{header.title}</span>
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeColumn(header.id)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/5">
                      <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card z-10 border-r border-border align-top py-4">
                        {row.label}
                      </TableCell>
                      {tableData.headers.map((header) => (
                        <TableCell key={header.id} className="align-top py-4 text-sm leading-relaxed">
                          {row.values[header.id] || <span className="text-muted-foreground italic">Not specified</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="outline" onClick={handleReset}>New Comparison</Button>
              <Button variant="outline" onClick={() => downloadCSV(tableData, comparisonName)}>Download CSV</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}