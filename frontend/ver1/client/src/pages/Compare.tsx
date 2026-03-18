import { Sidebar } from "@/components/Sidebar";
import { useComparePapers } from "@/hooks/use-papers";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Upload, Play, FileText, X, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { API_BASE, getToken } from "@shared/routes";

interface UploadedPaper {
  paper_id: string;
  file_path: string;
  filename: string;
}

interface TableData {
  headers: { id: string; title: string }[];
  rows: { label: string; values: Record<string, string> }[];
}

const DIMENSION_LABELS: Record<string, string> = {
  scope:            "Scope",
  dataset:          "Dataset",
  methodology:      "Methodology",
  results:          "Results",
  additional_notes: "Additional Notes",
};

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

export default function Compare() {
  const compareMutation = useComparePapers();
  const [papers, setPapers]                 = useState<UploadedPaper[]>([]);
  const [comparisonName, setComparisonName] = useState("");
  const [tableData, setTableData]           = useState<TableData | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [indexing, setIndexing]             = useState(false);
  const [indexed, setIndexed]               = useState(false);
  const { toast } = useToast();

  // ── Step 1: upload ──────────────────────────────────────────────────────────
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
        // backend returns: { file_path, filename, paper_id }
        setPapers((prev) => [...prev, {
          paper_id:  data.paper_id,
          file_path: data.file_path,
          filename:  data.filename,
        }]);
        setIndexed(false); // new file means we need to re-index
        toast({ title: "Uploaded", description: `${file.name} ready.` });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePaper = (index: number) => {
    setPapers(papers.filter((_, i) => i !== index));
    setIndexed(false);
  };

  // ── Step 2: index ───────────────────────────────────────────────────────────
  const handleIndex = async () => {
    if (papers.length < 2) {
      toast({ title: "Need more files", description: "Upload at least 2 PDFs.", variant: "destructive" });
      return;
    }
    setIndexing(true);
    try {
      const res = await fetch(`${API_BASE}/papers/index`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
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

  // ── Step 3: compare ─────────────────────────────────────────────────────────
  const handleCompare = () => {
    if (papers.length < 2) {
      toast({ title: "Add more files", description: "Upload at least 2 PDFs.", variant: "destructive" });
      return;
    }
    compareMutation.mutate(
      {
        paper_ids:       papers.map((p) => p.paper_id),
        comparison_name: comparisonName || "Untitled Comparison",
      },
      {
        onSuccess: (data) => {
          const headers = papers.map((p) => ({ id: p.paper_id, title: p.filename }));
          const rows = data.rows.map((r: any) => ({
            label:  DIMENSION_LABELS[r.dimension] ?? r.dimension.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
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
    setTableData(null);
    setPapers([]);
    setComparisonName("");
    setIndexed(false);
  };

  const isBusy      = uploading || indexing || compareMutation.isPending;
  const currentStep = indexed ? 3 : papers.length >= 2 ? 2 : 1;

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

        {/* Setup panel — hidden once results are ready */}
        {!tableData && (
          <div className="mb-8 space-y-6 max-w-2xl">

            {/* Step indicators */}
            <div className="flex items-center gap-4">
              <StepBadge step={1} label="Upload PDFs"  active={currentStep === 1} done={papers.length >= 2} />
              <div className="h-px flex-1 bg-border" />
              <StepBadge step={2} label="Index Papers" active={currentStep === 2} done={indexed} />
              <div className="h-px flex-1 bg-border" />
              <StepBadge step={3} label="Compare"      active={currentStep === 3} done={!!tableData} />
            </div>

            <Input
              placeholder="Comparison name (optional)"
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
            />

            {/* Upload button */}
            <div>
              <input
                type="file" accept=".pdf" multiple id="pdf-upload"
                className="hidden" onChange={handleFileUpload} disabled={isBusy}
              />
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
              <p className="text-xs text-muted-foreground mt-1">You can select multiple files at once</p>
            </div>

            {/* Uploaded files list */}
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

                {/* Index button */}
                {!indexed && (
                  <Button
                    onClick={handleIndex}
                    disabled={isBusy || papers.length < 2}
                    variant="outline"
                    className="gap-2 w-full"
                  >
                    {indexing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Indexing papers...</>
                      : "Index Papers for RAG"
                    }
                  </Button>
                )}

                {/* Compare button */}
                {indexed && (
                  <Button
                    onClick={handleCompare}
                    disabled={isBusy}
                    className="gap-2 w-full"
                  >
                    {compareMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Comparing... (this may take a minute)</>
                      : <><Play className="w-4 h-4" /> Run Comparison</>
                    }
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {compareMutation.isPending && !tableData && (
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
                          <span className="font-semibold text-foreground text-base line-clamp-2">{header.title}</span>
                          <Button
                            variant="ghost" size="icon"
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
                          {row.values[header.id] || <span className="text-muted-foreground italic">Not specified</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 border-t border-border">
              <Button variant="outline" onClick={handleReset}>New Comparison</Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}