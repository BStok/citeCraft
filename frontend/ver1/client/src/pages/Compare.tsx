import { Sidebar } from "@/components/Sidebar";
import { useUploadPdf, useIndexPapers, useComparePapers } from "@/hooks/use-papers";
import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Upload, Play, FileText, X, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { RAGComparisonRow } from "@shared/routes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedPaper {
  paper_id: string;
  file_path: string;
  filename: string;
}

interface TableData {
  // headers: one entry per paper
  headers: { id: string; title: string }[];
  // rows: one per dimension
  rows: { dimension: string; label: string; values: Record<string, string> }[];
}

// ─── Dimension display labels ─────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  scope:            "Scope",
  dataset:          "Dataset",
  methodology:      "Methodology",
  results:          "Results",
  additional_notes: "Additional Notes",
};

function dimensionLabel(dim: string): string {
  return DIMENSION_LABELS[dim] ?? dim.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Step indicator ───────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function Compare() {
  const uploadMutation  = useUploadPdf();
  const indexMutation   = useIndexPapers();
  const compareMutation = useComparePapers();

  const [papers, setPapers]             = useState<UploadedPaper[]>([]);
  const [comparisonName, setComparisonName] = useState("");
  const [tableData, setTableData]       = useState<TableData | null>(null);
  const [currentStep, setCurrentStep]   = useState<1 | 2 | 3>(1);

  const { toast } = useToast();

  // ── Step 1: upload files ──────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      try {
        const result = await uploadMutation.mutateAsync(file);
        setPapers((prev) => [...prev, {
          paper_id:  result.paper_id,
          file_path: result.file_path,
          filename:  result.filename,
        }]);
        toast({ title: "Uploaded", description: `${file.name} is ready.` });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }

    e.target.value = "";
  };

  const removePaper = (index: number) => {
    setPapers(papers.filter((_, i) => i !== index));
  };

  // ── Step 2: index ─────────────────────────────────────────────────────────

  const handleIndex = async () => {
    if (papers.length < 2) {
      toast({ title: "Need more files", description: "Upload at least 2 PDFs.", variant: "destructive" });
      return;
    }
    try {
      await indexMutation.mutateAsync({
        paper_ids:  papers.map((p) => p.paper_id),
        file_paths: papers.map((p) => p.file_path),
      });
      setCurrentStep(3);
      toast({ title: "Indexed", description: "Papers are indexed and ready to compare." });
    } catch (err: any) {
      toast({ title: "Indexing failed", description: err.message, variant: "destructive" });
    }
  };

  // ── Step 3: compare ───────────────────────────────────────────────────────

  const handleCompare = () => {
    compareMutation.mutate(
      {
        paper_ids:       papers.map((p) => p.paper_id),
        comparison_name: comparisonName || "Untitled Comparison",
      },
      {
        onSuccess: (data) => {
          // Build table headers from paper list (we know filenames)
          const headers = papers.map((p) => ({ id: p.paper_id, title: p.filename }));

          // Build rows from RAG rows
          const rows = data.rows.map((r: RAGComparisonRow) => ({
            dimension: r.dimension,
            label:     dimensionLabel(r.dimension),
            values:    r.values,
          }));

          setTableData({ headers, rows });
        },
        onError: (err: any) => {
          toast({ title: "Comparison failed", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  // ── Remove a column from the result table ─────────────────────────────────

  const removeColumn = (headerId: string) => {
    if (!tableData) return;
    if (tableData.headers.length <= 1) {
      toast({ title: "Cannot remove", description: "At least one paper must remain.", variant: "destructive" });
      return;
    }
    setTableData({
      headers: tableData.headers.filter((h) => h.id !== headerId),
      rows:    tableData.rows.map((row) => {
        const newValues = { ...row.values };
        delete newValues[headerId];
        return { ...row, values: newValues };
      }),
    });
  };

  const handleReset = () => {
    setTableData(null);
    setPapers([]);
    setComparisonName("");
    setCurrentStep(1);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const isUploading = uploadMutation.isPending;
  const isIndexing  = indexMutation.isPending;
  const isComparing = compareMutation.isPending;
  const isBusy      = isUploading || isIndexing || isComparing;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h2 className="text-3xl font-display font-bold">Paper Comparison</h2>
            <p className="text-muted-foreground">Analyze differences across key dimensions.</p>
          </div>
        </div>

        {/* Setup panel — hide once we have results */}
        {!tableData && (
          <div className="mb-8 space-y-6 max-w-2xl">

            {/* Step indicators */}
            <div className="flex items-center gap-6">
              <StepBadge step={1} label="Upload PDFs"  active={currentStep === 1} done={papers.length >= 2} />
              <div className="h-px flex-1 bg-border" />
              <StepBadge step={2} label="Index Papers" active={currentStep === 1 && papers.length >= 2} done={currentStep === 3} />
              <div className="h-px flex-1 bg-border" />
              <StepBadge step={3} label="Compare"      active={currentStep === 3} done={!!tableData} />
            </div>

            {/* Comparison name */}
            <Input
              placeholder="Comparison name (optional)"
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
            />

            {/* Upload button */}
            <div>
              <input
                type="file"
                accept=".pdf"
                multiple
                id="pdf-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isBusy}
              />
              <label htmlFor="pdf-upload">
                <Button variant="outline" className="gap-2 cursor-pointer" disabled={isBusy} asChild>
                  <span>
                    {isUploading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      : <><Upload className="w-4 h-4" /> Upload PDFs</>
                    }
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-1">Select multiple files at once</p>
            </div>

            {/* Uploaded papers list */}
            {papers.length > 0 && (
              <div className="space-y-2">
                {papers.map((p, i) => (
                  <div key={p.paper_id} className="flex items-center justify-between bg-muted/30 px-4 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{p.filename}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        #{p.paper_id.slice(0, 8)}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePaper(i)} disabled={isBusy}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {/* Index button — shown when ≥2 papers uploaded and not yet indexed */}
                {currentStep === 1 && (
                  <Button
                    onClick={handleIndex}
                    disabled={isBusy || papers.length < 2}
                    variant="outline"
                    className="gap-2 w-full"
                  >
                    {isIndexing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Indexing papers...</>
                      : "Index Papers for RAG"
                    }
                  </Button>
                )}

                {/* Compare button — shown after indexing */}
                {currentStep === 3 && (
                  <Button
                    onClick={handleCompare}
                    disabled={isBusy}
                    className="gap-2 w-full"
                  >
                    {isComparing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing... (this may take a minute)</>
                      : <><Play className="w-4 h-4" /> Run Comparison</>
                    }
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {isComparing && !tableData && (
          <Skeleton className="h-[500px] w-full rounded-xl" />
        )}

        {/* Results table */}
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
                          <span className="font-semibold text-foreground text-base line-clamp-2">
                            {header.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeColumn(header.id)}
                          >
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
                          {row.values[header.id]
                            ? row.values[header.id]
                            : <span className="text-muted-foreground italic">Not specified</span>
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="outline" onClick={handleReset}>
                New Comparison
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}