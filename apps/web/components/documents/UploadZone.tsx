"use client";

import { useState, useRef } from "react";
import { UploadFile, DocType, MedDocument } from "@/types/documents";
import { api } from "@/lib/api";
import { I } from "@/components/ui/icons";
import { useAuthStore } from "@/store/auth.store";

const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_MB = 10;

const DOC_META: Record<DocType, { label: string; icon: string; color: string }> = {
  lab_result: { label: "Lab result", color: "#00e5a0", icon: "🧪" },
  prescription: { label: "Prescription", color: "#3d9bff", icon: "💊" },
  radiology: { label: "Radiology", color: "#c77dff", icon: "🩻" },
  report: { label: "Medical report", color: "#ff9f43", icon: "📋" },
  unknown: { label: "Document", color: "#888", icon: "📄" },
};

export function UploadZone({ onComplete }: { onComplete: (doc: MedDocument) => void }) {
  const user = useAuthStore(s => s.user);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const add = (files: FileList | null) => {
    if (!files) return;
    const valid: UploadFile[] = [];
    Array.from(files).forEach((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) return;
      if (f.size > MAX_MB * (1 << 20)) return;
      valid.push({ 
        file: f, 
        id: Math.random().toString(36).slice(2), 
        docType: "unknown",
        status: "idle"
      });
    });
    setQueue((prev) => [...prev, ...valid]);
  };

  const rem = (id: string) => setQueue((prev) => prev.filter((f) => f.id !== id));
  const setType = (id: string, t: DocType) =>
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, docType: t } : f)));

  const handleAnalyze = async () => {
    if (queue.length === 0 || !user) return;
    setIsUploading(true);

    const pending = queue.filter(q => q.docType !== "unknown" && q.status !== "success");
    let lastDoc: MedDocument | null = null;

    for (const qf of pending) {
      try {
        setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: "uploading" } : f));
        
        // 1. Get pre-signed URL from our API
        const { uploadUrl, fileUrl } = await api.get<{ uploadUrl: string; fileUrl: string; path: string }>(
          `/api/v1/documents/upload-url?fileName=${encodeURIComponent(qf.file.name)}`,
          { headers: { "x-user-id": user.id } }
        );

        // 2. Upload file directly to Supabase Storage
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: qf.file,
          headers: { "Content-Type": qf.file.type },
        });

        if (!uploadRes.ok) throw new Error("File upload failed");

        // 3. Notify backend to create document record and start analysis
        const doc = await api.post<MedDocument>("/api/v1/documents", {
          fileName: qf.file.name,
          fileType: qf.file.type,
          docType: qf.docType,
          fileUrl: fileUrl,
        }, { headers: { "x-user-id": user.id } });

        setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: "success" } : f));
        lastDoc = doc;
      } catch (err) {
        console.error("Upload error:", err);
        setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: "error", error: "Upload failed" } : f));
      }
    }

    setIsUploading(false);
    if (lastDoc) {
      onComplete(lastDoc);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  const icon = (t: string) => (t === "application/pdf" ? "📄" : t.startsWith("image/") ? "🖼️" : "📎");
  const canAnalyze = queue.length > 0 && queue.some((q) => q.docType !== "unknown");

  return (
    <div className="space-y-6">
      <div
        className={`da-dz border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${
          dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/50 hover:bg-accent/5"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !queue.length && fileRef.current?.click()}
      >
        <div className="da-di w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
          <I.Up />
        </div>
        <div className="da-dt text-xl font-bold font-syne">{dragging ? "Drop to add" : "Upload medical document"}</div>
        <div className="da-ds text-sm text-muted-foreground max-w-sm text-center">
          Drag & drop lab results, prescriptions, or reports — or click to browse
        </div>
        <div className="da-dtypes flex gap-2 flex-wrap justify-center">
          {ACCEPTED_EXT.map((e) => (
            <span key={e} className="da-tp text-[10px] font-mono font-bold px-2 py-1 bg-muted rounded border border-border">
              {e}
            </span>
          ))}
          <span className="da-tp text-[10px] font-mono font-bold px-2 py-1 bg-muted rounded border border-border">Max {MAX_MB}MB</span>
        </div>
        <button
          className="da-dbtn bg-accent text-accent-foreground px-6 py-2 rounded-xl font-bold mt-2"
          onClick={(e) => {
            e.stopPropagation();
            fileRef.current?.click();
          }}
        >
          Choose files
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => add(e.target.files)}
        />
      </div>

      {queue.length > 0 && (
        <div className="space-y-4">
          <div className="da-queue space-y-2">
            {queue.map((qf) => (
              <div key={qf.id} className="da-qi flex items-start gap-4 p-4 bg-muted/50 border border-border rounded-xl">
                <div className="da-qic w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center text-lg relative">
                  {icon(qf.file.type)}
                  {qf.status === "uploading" && (
                     <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                       <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                     </div>
                  )}
                  {qf.status === "success" && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-black rounded-full flex items-center justify-center text-[10px] font-bold">
                       ✓
                     </div>
                  )}
                  {qf.status === "error" && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                       !
                     </div>
                  )}
                </div>
                <div className="da-qin flex-1 min-w-0">
                  <div className="da-qnm font-bold truncate">{qf.file.name}</div>
                  <div className="da-qmt text-[10px] font-mono text-muted-foreground">
                    {(qf.file.size / 1024).toFixed(1)} KB · {qf.file.type.split("/")[1].toUpperCase()}
                  </div>
                  <div className="da-tsel flex flex-wrap gap-2 mt-3">
                    {Object.entries(DOC_META)
                      .filter(([k]) => k !== "unknown")
                      .map(([key, meta]) => (
                        <button
                          key={key}
                          type="button"
                          className={`da-tbtn text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all flex items-center gap-2 ${
                            qf.docType === key
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border bg-muted/50 text-muted-foreground hover:border-accent/50 hover:text-foreground"
                          }`}
                          onClick={() => setType(qf.id, key as DocType)}
                        >
                          <span>{meta.icon}</span>
                          {meta.label}
                        </button>
                      ))}
                  </div>
                </div>
                <button
                  className="da-qrm w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/20"
                  onClick={() => rem(qf.id)}
                >
                  <I.Tr />
                </button>
              </div>
            ))}
          </div>
          <button
            className="da-abtn w-full py-4 rounded-2xl bg-gradient-to-br from-accent to-accent2 text-black font-extrabold flex items-center justify-center gap-3 shadow-xl transition-all hover:translate-y-[-2px] disabled:opacity-50"
            onClick={handleAnalyze}
            disabled={!canAnalyze || isUploading}
          >
            {isUploading ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <I.Zp /> Analyse {queue.length} document{queue.length > 1 ? "s" : ""} with AI
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
