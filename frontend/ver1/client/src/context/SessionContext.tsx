import { createContext, useContext, useState, ReactNode } from "react";

// ─── Retrieval state ──────────────────────────────────────────────────────────

interface Paper {
  db_id?: string;
  title?: string;
  doi?: string;
  publication_date?: string;
  abstract?: string;
  authors?: string;
  citation_count?: number;
  pdf_link?: string;
  source?: string;
}

interface RetrievalState {
  query: string;
  papers: Paper[];
}

// ─── Understanding state ──────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface UnderstandingState {
  paper: { paper_id: string; filename: string; file_path: string } | null;
  messages: Message[];
  sectionFilter: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SessionContextType {
  retrieval: RetrievalState;
  setRetrieval: (state: RetrievalState) => void;
  understanding: UnderstandingState;
  setUnderstanding: (state: UnderstandingState) => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [retrieval, setRetrieval] = useState<RetrievalState>({ query: "", papers: [] });
  const [understanding, setUnderstanding] = useState<UnderstandingState>({
    paper: null,
    messages: [],
    sectionFilter: "",
  });

  return (
    <SessionContext.Provider value={{ retrieval, setRetrieval, understanding, setUnderstanding }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}