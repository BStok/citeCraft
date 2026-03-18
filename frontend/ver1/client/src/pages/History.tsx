import { Sidebar } from "@/components/Sidebar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, ChevronRight, Loader2, Minus } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@shared/routes";
import { useQuery } from "@tanstack/react-query";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComparisonSummary {
  id: string;
  name: string;
  created_at: string;
}

interface ComparisonDetail {
  comparison_id: string;
  name: string;
  created_at: string;
  headers: { id: string; title: string }[];
  rows: { dimension: string; values: Record<string, string> }[];
}

interface TableData {
  name: string;
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

function dimensionLabel(dim: string): string {
  return DIMENSION_LABELS[dim] ?? dim.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(str: string): string {
  try {
    return new Date(str).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return str;
  }
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function downloadCSV(tableData: TableData) {
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
  a.download = `${tableData.name || "comparison"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function History() {
  const [activeDetail, setActiveDetail] = useState<TableData | null>(null);
  const [loadingId, setLoadingId]       = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch comparison list
  const { data: comparisons, isLoading } = useQuery<ComparisonSummary[]>({
    queryKey: ["/comparisons"],
    queryFn: async () => {
      const res = await apiFetch("/comparisons");
      if (!res.ok) throw new Error("Failed to fetch comparisons");
      const data = await res.json();
      return data.comparisons;
    },
  });

  // Load a specific comparison's detail
  const handleOpen = async (id: string) => {
    setLoadingId(id);
    try {
      const res = await apiFetch(`/comparisons/${id}`);
      if (!res.ok) throw new Error("Failed to load comparison");
      const data: ComparisonDetail = await res.json();

      setActiveDetail({
        name:    data.name,
        headers: data.headers,
        rows:    data.rows.map((r) => ({
          label:  dimensionLabel(r.dimension),
          values: r.values,
        })),
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingId(null);
    }
  };

  const removeColumn = (headerId: string) => {
    if (!activeDetail) return;
    if (activeDetail.headers.length <= 1) {
      toast({ title: "Cannot remove", description: "At least one paper must remain.", variant: "destructive" });
      return;
    }
    setActiveDetail({
      ...activeDetail,
      headers: activeDetail.headers.filter((h) => h.id !== headerId),
      rows:    activeDetail.rows.map((row) => {
        const v = { ...row.values };
        delete v[headerId];
        return { ...row, values: v };
      }),
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {activeDetail ? (
            <Button variant="ghost" size="icon" onClick={() => setActiveDetail(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
          )}
          <div>
            <h2 className="text-3xl font-display font-bold">
              {activeDetail ? activeDetail.name : "Comparison History"}
            </h2>
            <p className="text-muted-foreground">
              {activeDetail ? "Past comparison result" : "View and re-open past comparisons."}
            </p>
          </div>
          {activeDetail && (
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={() => downloadCSV(activeDetail)}>
                Download CSV
              </Button>
            </div>
          )}
        </div>

        {/* List view */}
        {!activeDetail && (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading comparisons...</span>
              </div>
            )}

            {!isLoading && (!comparisons || comparisons.length === 0) && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No comparisons yet</p>
                  <p className="text-sm text-muted-foreground">Run a comparison to see it here.</p>
                </div>
                <Link href="/compare">
                  <Button>Start a Comparison</Button>
                </Link>
              </div>
            )}

            {comparisons && comparisons.length > 0 && (
              <div className="space-y-2 max-w-2xl">
                {comparisons.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleOpen(c.id)}
                    disabled={loadingId === c.id}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-sm">{c.name || "Untitled Comparison"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(c.created_at)}</p>
                    </div>
                    {loadingId === c.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    }
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Detail view — comparison table */}
        {activeDetail && (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[200px] font-bold text-primary sticky left-0 bg-muted/50 z-10 border-r border-border">
                      Dimension
                    </TableHead>
                    {activeDetail.headers.map((header) => (
                      <TableHead key={header.id} className="min-w-[300px] align-top py-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-foreground text-base line-clamp-2">
                            {header.title}
                          </span>
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
                  {activeDetail.rows.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/5">
                      <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card z-10 border-r border-border align-top py-4">
                        {row.label}
                      </TableCell>
                      {activeDetail.headers.map((header) => (
                        <TableCell key={header.id} className="align-top py-4 text-sm leading-relaxed">
                          {row.values[header.id] || <span className="text-muted-foreground italic">Not specified</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}