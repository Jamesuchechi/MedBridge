"use client";

import { useState, useCallback, useEffect } from "react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentList } from "@/components/documents/DocumentList";
import { useAuthStore } from "@/store/auth.store";
import { ResultView } from "@/components/documents/ResultView";
import { MedDocument } from "@/types/documents";
import { api } from "@/lib/api";
import { I } from "@/components/ui/icons"; // Assuming icons are here or I'll define them

export default function DocumentsPage() {
  const user = useAuthStore(s => s.user);
  const [view, setView] = useState<"list" | "upload" | "result">("list");
  const [docs, setDocs] = useState<MedDocument[]>([]);
  const [currentDoc, setCurrentDoc] = useState<MedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<MedDocument[]>("/api/v1/documents", {
        headers: { "x-user-id": user.id }
      });
      setDocs(data);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSelectDoc = (doc: MedDocument) => {
    setCurrentDoc(doc);
    setView("result");
  };

  const handleUploadComplete = (newDoc: MedDocument) => {
    setDocs(prev => [newDoc, ...prev]);
    setCurrentDoc(newDoc);
    setView("result");
  };

  return (
    <div className="da-page max-w-5xl mx-auto p-6">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <div className="da-eyebrow flex items-center gap-2 mb-2">
            <div className="da-dot w-2 h-2 rounded-full bg-accent animate-pulse" />
            AI DOCUMENT ANALYSIS
          </div>
          <h1 className="da-title text-3xl font-bold font-syne">
            Medical <span>Documents</span>
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Upload and analyze your medical records. Get instant AI interpretations and risk assessments.
          </p>
        </div>
        
        {view !== "upload" && (
          <button 
            onClick={() => setView("upload")}
            className="da-abtn bg-accent text-accent-foreground px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105"
          >
            <I.Up /> Upload New
          </button>
        )}
        {view === "upload" && (
          <button 
            onClick={() => setView("list")}
            className="da-nb flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <I.ChL /> Back to List
          </button>
        )}
      </header>

      <main>
        {view === "list" && (
          <DocumentList 
            docs={docs} 
            isLoading={isLoading} 
            onSelect={handleSelectDoc} 
          />
        )}
        
        {view === "upload" && (
          <UploadZone onComplete={handleUploadComplete} />
        )}

        {view === "result" && currentDoc && (
          <ResultView 
            doc={currentDoc} 
            onBack={() => {
              setView("list");
              fetchDocs(); // Refresh list to get latest status
            }} 
          />
        )}
      </main>
    </div>
  );
}
