import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { MedDocument, FlagLevel } from "@/types/documents";
import { I } from "@/components/ui/icons";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { getSocket } from "@/lib/socket";

const FLAG_META: Record<FlagLevel, { label: string; color: string; bg: string; border: string }> = {
  normal: { label: "Normal", color: "#00e5a0", bg: "rgba(0,229,160,.1)", border: "rgba(0,229,160,.2)" },
  borderline: { label: "Borderline", color: "#ffb800", bg: "rgba(255,184,0,.1)", border: "rgba(255,184,0,.2)" },
  abnormal: { label: "Abnormal", color: "#ff7c2b", bg: "rgba(255,124,43,.1)", border: "rgba(255,124,43,.22)" },
  critical: { label: "Critical", color: "#ff3b3b", bg: "rgba(255,59,59,.1)", border: "rgba(255,59,59,.22)" },
};

const RISK_META = {
  info: { color: "#3d9bff", bg: "rgba(61,155,255,.07)", border: "rgba(61,155,255,.2)" },
  warn: { color: "#ffb800", bg: "rgba(255,184,0,.07)", border: "rgba(255,184,0,.2)" },
  critical: { color: "#ff3b3b", bg: "rgba(255,59,59,.07)", border: "rgba(255,59,59,.2)" },
};

export function ResultView({ doc, onBack }: { doc: MedDocument; onBack: () => void }) {
  const [currentDoc, setCurrentDoc] = useState<MedDocument>(doc);
  const [flagFilter, setFlagFilter] = useState<FlagLevel | "all">("all");
  const user = useAuthStore((state) => state.user);

  const pollStatus = useCallback(async () => {
    try {
      const updatedDoc = await api.get<MedDocument>(`/api/v1/documents/${doc.id}`);
      if (updatedDoc.status !== currentDoc.status) {
        setCurrentDoc(updatedDoc);
      }
    } catch (err) {
      console.error("Polling failed", err);
    }
  }, [doc.id, currentDoc.status]);

  useEffect(() => {
    if (currentDoc.status === "pending" || currentDoc.status === "processing") {
      const interval = setInterval(pollStatus, 3000);
      return () => clearInterval(interval);
    }
  }, [currentDoc.status, pollStatus]);

  useEffect(() => {
    if (user?.id) {
      const socket = getSocket(user.id);
      if (socket) {
        socket.on("document:analyzed", (updatedDoc: MedDocument) => {
          if (updatedDoc.id === doc.id) {
            console.log("[SOCKET]: Document analysis complete received");
            setCurrentDoc(updatedDoc);
          }
        });
        return () => {
          socket.off("document:analyzed");
        };
      }
    }
  }, [user?.id, doc.id]);

  const r = currentDoc.result;
  const isImage = currentDoc.fileUrl.match(/\.(jpg|jpeg|png|webp)($|\?)/i);
  const isPDF = currentDoc.fileUrl.match(/\.pdf($|\?)/i);

  if (currentDoc.status !== "complete" || !r) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        {currentDoc.status === "processing" ? (
          <>
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-xl font-bold mb-2">Analyzing Document...</h2>
            <p className="text-muted-foreground">Our AI is reading your records. This usually takes 10-20 seconds.</p>
          </>
        ) : currentDoc.status === "failed" ? (
          <>
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 text-2xl">
              <I.X />
            </div>
            <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
            <p className="text-muted-foreground mb-6">We couldn't process this document. Please try again with a clearer image.</p>
            <button onClick={onBack} className="bg-muted px-6 py-2 rounded-xl font-bold hover:bg-muted/80">
              Go Back
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-muted text-muted-foreground rounded-full flex items-center justify-center mb-6">
              <I.Clk />
            </div>
            <h2 className="text-xl font-bold mb-2">Pending Analysis</h2>
            <p className="text-muted-foreground">This document is in the queue for processing.</p>
          </>
        )}
      </div>
    );
  }

  const fc = { normal: 0, borderline: 0, abnormal: 0, critical: 0 };
  r.findings.forEach((f) => fc[f.flag]++);
  const filteredFindings = flagFilter === "all" ? r.findings : r.findings.filter((f) => f.flag === flagFilter);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-muted-foreground hover:text-accent flex items-center gap-2 font-bold transition-colors">
          <I.ChL /> Back to List
        </button>
        <div className="flex gap-2">
           <a href={currentDoc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl text-xs font-bold hover:bg-muted/80">
             <I.Eye /> Open Original
           </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Summary */}
          <section className="p-6 bg-gradient-to-br from-accent/10 to-accent2/10 border border-accent/20 rounded-3xl">
            <h3 className="text-xs font-mono font-bold text-accent mb-2 uppercase tracking-widest flex items-center gap-2">
              <I.Zp /> AI Summary
            </h3>
            <p className="text-lg font-medium leading-relaxed">{r.summary}</p>
          </section>

          {/* Risk Flags */}
          {r.riskFlags.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest pl-2">Risk Signals</h3>
              <div className="space-y-3">
                {r.riskFlags.map((rf) => {
                  const rm = RISK_META[rf.level];
                  return (
                    <div key={rf.id} className="p-4 rounded-2xl border flex gap-4" style={{ backgroundColor: rm.bg, borderColor: rm.border }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${rm.color}20`, color: rm.color }}>
                        {rf.level === "critical" ? <I.Atr /> : <I.Inf />}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{rf.title}</h4>
                        <p className="text-sm opacity-80 mt-1">{rf.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Findings Table */}
          {r.findings.length > 0 && (
            <section className="space-y-4">
               <div className="flex items-center justify-between pl-2">
                <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest">Test Findings</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFlagFilter("all")}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${flagFilter === "all" ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:border-accent"}`}
                  >
                    All ({r.findings.length})
                  </button>
                  {(["critical", "abnormal", "borderline", "normal"] as FlagLevel[]).map(lvl => fc[lvl] > 0 && (
                    <button 
                      key={lvl}
                      onClick={() => setFlagFilter(lvl)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${flagFilter === lvl ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:border-accent"}`}
                      style={{ color: flagFilter === lvl ? undefined : FLAG_META[lvl].color }}
                    >
                      {FLAG_META[lvl].label} ({fc[lvl]})
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-mono text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">TEST</th>
                      <th className="px-4 py-3 text-left">RESULT</th>
                      <th className="px-4 py-3 text-left hidden sm:table-cell">REFERENCE</th>
                      <th className="px-4 py-3 text-left">INTERPRETATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredFindings.map((f) => {
                      const fm = FLAG_META[f.flag];
                      return (
                        <tr key={f.id} className="hover:bg-accent/5 transition-colors">
                          <td className="px-4 py-4 font-bold">{f.name}</td>
                          <td className="px-4 py-4">
                            <span className="font-mono font-bold" style={{ color: fm.color }}>{f.value}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">{f.unit}</span>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell text-muted-foreground font-mono text-xs">{f.referenceRange}</td>
                          <td className="px-4 py-4 text-xs text-muted-foreground leading-relaxed">{f.interpretation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Plain English */}
          <section className="p-6 bg-muted/30 border border-border rounded-3xl">
            <h3 className="text-xs font-mono font-bold text-accent2 mb-4 uppercase tracking-widest flex items-center gap-2">
              <I.Spk /> What this means for you
            </h3>
            <p className="text-md leading-relaxed text-foreground/90">{r.plainEnglish}</p>
          </section>

          {/* Document Preview */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest pl-2">Document Preview</h3>
            <div className="da-preview-container bg-muted/20 border border-border rounded-3xl overflow-hidden aspect-[3/4] sm:aspect-video relative">
               {isImage ? (
                 <div className="relative w-full h-full">
                    <Image 
                      src={currentDoc.fileUrl} 
                      alt={currentDoc.fileName}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority
                    />
                 </div>
               ) : isPDF ? (
                 <iframe 
                   src={`${currentDoc.fileUrl}#toolbar=0&navpanes=0`} 
                   className="w-full h-full border-none"
                   title="PDF Preview"
                 />
               ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                   <div className="text-4xl mb-4">📄</div>
                   <p>Preview not available for this file type</p>
                   <a href={currentDoc.fileUrl} target="_blank" rel="noreferrer" className="mt-4 text-accent font-bold underline">
                     Download to View
                   </a>
                 </div>
               )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Info Card */}
          <section className="bg-muted/50 border border-border rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-14 bg-background border border-border rounded-xl flex items-center justify-center text-3xl">
                {r.docType === "lab_result" ? "🧪" : "💊"}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold truncate">{r.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{r.issuedBy}</p>
              </div>
            </div>
            
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Date Issued:</span>
                <span className="font-bold">{r.issuedDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-bold">{r.patientName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">File:</span>
                <span className="font-bold truncate max-w-[120px]">{currentDoc.fileName}</span>
              </div>
            </div>
          </section>

          {/* Recommendations */}
          {r.recommendations.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest pl-2">Next Steps</h3>
              <div className="space-y-3">
                {r.recommendations.map((rec, i) => (
                  <div key={i} className="flex gap-3 p-4 bg-muted/40 border border-border rounded-2xl items-start">
                    <div className="w-6 h-6 rounded-lg bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium">{rec}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="p-4 bg-accent2/5 border border-accent2/10 rounded-2xl flex gap-3 items-start">
            <I.Inf />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              This AI analysis is for informational purposes only and is not a medical diagnosis. Always consult a qualified physician.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
