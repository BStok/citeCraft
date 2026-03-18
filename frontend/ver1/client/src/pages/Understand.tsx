import { Sidebar } from "@/components/Sidebar";
import { useAskPaper } from "@/hooks/use-papers";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, FileText, Send, Loader2, BookOpen, Lightbulb } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@shared/routes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface UploadedPaper {
  paper_id: string;
  filename: string;
  file_path: string;
}

// ─── Section filters ──────────────────────────────────────────────────────────

const SECTIONS = [
  { value: "",             label: "Whole paper"   },
  { value: "abstract",    label: "Abstract"       },
  { value: "introduction", label: "Introduction"  },
  { value: "methodology", label: "Methodology"    },
  { value: "results",     label: "Results"        },
  { value: "conclusion",  label: "Conclusion"     },
];

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  "What is the main contribution of this paper?",
  "What datasets were used and how large are they?",
  "What are the key limitations?",
  "How does this compare to prior work?",
  "Summarize the methodology in simple terms.",
];

// ─── Chat message bubble ──────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
        ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {isUser ? "You" : "AI"}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
        ${isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted/60 text-foreground rounded-tl-sm border border-border"
        }`}>
        {message.text}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Understand() {
  const [paper, setPaper]           = useState<UploadedPaper | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Hook is called with paper_id; re-instantiated when paper changes
  const askMutation = useAskPaper(paper?.paper_id ?? "");

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("https://citecraft-production.up.railway.app/upload_pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setPaper({ paper_id: data.paper_id, filename: data.filename, file_path: data.file_path });
      setMessages([]);

      // Auto-index after upload so ask endpoint can find chunks
      const indexRes = await fetch("https://citecraft-production.up.railway.app/papers/index", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          paper_ids:  [data.paper_id],
          file_paths: [data.file_path],
        }),
      });

      if (!indexRes.ok) throw new Error("Indexing failed");

      toast({ title: "Paper ready", description: `${file.name} has been loaded and indexed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── Ask ─────────────────────────────────────────────────────────────────────

  const handleAsk = (question?: string) => {
    const q = question ?? input.trim();
    if (!q || !paper) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");

    askMutation.mutate(
      { question: q, section_filter: sectionFilter || undefined },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: "assistant", text: data.answer }]);
        },
        onError: (err: any) => {
          setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center gap-4 p-8 pb-4 border-b border-border shrink-0">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-3xl font-display font-bold">Paper Understanding</h2>
            <p className="text-muted-foreground">Upload a paper and ask anything about it.</p>
          </div>

          {/* Current paper badge */}
          {paper && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm max-w-xs">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate font-medium">{paper.filename}</span>
            </div>
          )}
        </div>

        {/* Body — split: upload/idle state OR chat */}
        {!paper ? (
          // ── No paper loaded yet ──────────────────────────────────────────
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2">Load a research paper</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Upload a PDF and then ask questions — the AI will answer based on the paper's content.
              </p>
            </div>
            <input type="file" accept=".pdf" id="understand-upload" className="hidden" onChange={handleUpload} />
            <label htmlFor="understand-upload">
              <Button className="gap-2 cursor-pointer" disabled={uploading} asChild>
                <span>
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading paper...</>
                    : <><Upload className="w-4 h-4" /> Upload PDF</>
                  }
                </span>
              </Button>
            </label>
          </div>
        ) : (
          // ── Chat interface ───────────────────────────────────────────────
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Section filter row */}
            <div className="px-8 py-3 border-b border-border shrink-0 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Focus on:</span>
              <div className="flex gap-2 flex-wrap">
                {SECTIONS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSectionFilter(s.value)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors
                      ${sectionFilter === s.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {/* Swap paper */}
              <div className="ml-auto">
                <input type="file" accept=".pdf" id="understand-swap" className="hidden" onChange={handleUpload} />
                <label htmlFor="understand-swap">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs cursor-pointer" disabled={uploading} asChild>
                    <span>
                      <Upload className="w-3 h-3" />
                      {uploading ? "Loading..." : "Change paper"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Lightbulb className="w-4 h-4" />
                    <span>Suggested questions</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleAsk(q)}
                        className="text-left text-sm px-4 py-3 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {askMutation.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                  <div className="bg-muted/60 border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted-foreground italic">
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input bar */}
            <div className="px-8 py-4 border-t border-border shrink-0">
              <div className="flex gap-3">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about the paper..."
                  disabled={askMutation.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleAsk()}
                  disabled={!input.trim() || askMutation.isPending}
                  size="icon"
                >
                  {askMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Press Enter to send · answers are based solely on the uploaded paper</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}