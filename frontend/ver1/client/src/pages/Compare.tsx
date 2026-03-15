import { Sidebar } from "@/components/Sidebar";
import { useComparePapers } from "@/hooks/use-papers";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Minus, Upload, Play, FileText, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { apiFetch, getToken } from "@shared/routes";

export default function Compare() {
  const compareMutation = useComparePapers();
  const [filePaths, setFilePaths] = useState<{ path: string; filename: string }[]>([]);
  const [comparisonName, setComparisonName] = useState("");
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("http://localhost:5000/upload_pdf", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        });

        if (!res.ok) {
          toast({ title: "Upload failed", description: `Could not upload ${file.name}`, variant: "destructive" });
          continue;
        }

        const data = await res.json();
        setFilePaths((prev) => [...prev, { path: data.path, filename: data.filename }]);
        toast({ title: "Uploaded", description: `${file.name} ready for comparison.` });
      }
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  const removePath = (index: number) => {
    setFilePaths(filePaths.filter((_, i) => i !== index));
  };

  const handleCompare = () => {
    if (filePaths.length < 2) {
      toast({ title: "Add more files", description: "Please upload at least 2 PDFs to compare.", variant: "destructive" });
      return;
    }
    compareMutation.mutate(
      {
        file_paths: filePaths.map((f) => f.path),
        comparison_name: comparisonName || "Untitled Comparison",
      },
      {
        onSuccess: (data) => {
          const rows = data.comparison;
          const headers = rows.map((r: any, i: number) => ({
            id: String(i),
            title: r.authors ? `${r.authors} (${r.date ?? "?"})` : r.file,
          }));

          const fields = ["scope", "dataset", "methodology", "results", "additional_notes"];
          const tableRows = fields.map((field) => ({
            field: field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            values: Object.fromEntries(rows.map((r: any, i: number) => [String(i), r[field] ?? "—"])),
          }));

          setComparisonData({ headers, rows: tableRows });
        },
      }
    );
  };

  const removeColumn = (headerId: string) => {
    if (!comparisonData) return;
    if (comparisonData.headers.length <= 1) {
      toast({ title: "Cannot remove", description: "At least one paper must remain.", variant: "destructive" });
      return;
    }
    setComparisonData({
      headers: comparisonData.headers.filter((h: any) => h.id !== headerId),
      rows: comparisonData.rows.map((row: any) => {
        const newValues = { ...row.values };
        delete newValues[headerId];
        return { ...row, values: newValues };
      }),
    });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 w-full overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h2 className="text-3xl font-display font-bold">Paper Comparison</h2>
              <p className="text-muted-foreground">Analyze differences across key dimensions.</p>
            </div>
          </div>
        </div>

        {!comparisonData && (
          <div className="mb-8 space-y-4 max-w-2xl">
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
              />
              <label htmlFor="pdf-upload">
                <Button variant="outline" className="gap-2 cursor-pointer" disabled={uploading} asChild>
                  <span>
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading..." : "Upload PDFs"}
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-1">You can select multiple files at once</p>
            </div>

            {/* Uploaded files list */}
            {filePaths.length > 0 && (
              <div className="space-y-2">
                {filePaths.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 px-4 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>{f.filename}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePath(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  onClick={handleCompare}
                  disabled={compareMutation.isPending || filePaths.length < 2}
                  className="gap-2 w-full"
                >
                  <Play className="w-4 h-4" />
                  {compareMutation.isPending ? "Processing... (this may take a minute)" : "Run Comparison"}
                </Button>
              </div>
            )}
          </div>
        )}

        {compareMutation.isPending && (
          <Skeleton className="h-[500px] w-full rounded-xl" />
        )}

        {comparisonData && (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-[200px] font-bold text-primary sticky left-0 bg-muted/50 z-10 border-r border-border">
                      Dimension
                    </TableHead>
                    {comparisonData.headers.map((header: any) => (
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
                  {comparisonData.rows.map((row: any, i: number) => (
                    <TableRow key={i} className="hover:bg-muted/5">
                      <TableCell className="font-medium text-muted-foreground sticky left-0 bg-card z-10 border-r border-border align-top py-4">
                        {row.field}
                      </TableCell>
                      {comparisonData.headers.map((header: any) => (
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
              <Button variant="outline" onClick={() => { setComparisonData(null); setFilePaths([]); }}>
                New Comparison
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}