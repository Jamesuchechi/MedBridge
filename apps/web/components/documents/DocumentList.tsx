"use client";

import { MedDocument, DocStatus, FlagLevel } from "@/types/documents";
import { Icons } from "@/components/ui/Icons";

const DOC_META: Record<string, { label: string; icon: string; color: string }> = {
  lab_result: { label: "Lab result", color: "#00e5a0", icon: "🧪" },
  prescription: { label: "Prescription", color: "#3d9bff", icon: "💊" },
  radiology: { label: "Radiology", color: "#c77dff", icon: "🩻" },
  report: { label: "Medical report", color: "#ff9f43", icon: "📋" },
  unknown: { label: "Document", color: "#888", icon: "📄" },
};

const FLAG_COLORS: Record<FlagLevel, string> = {
  normal: "#00e5a0",
  borderline: "#ffb800",
  abnormal: "#ff7c2b",
  critical: "#ff3b3b",
};

export function DocumentList({
  docs,
  isLoading,
  onSelect,
}: {
  docs: MedDocument[];
  isLoading: boolean;
  onSelect: (doc: MedDocument) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-2xl animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="da-empty text-center py-20 bg-muted/20 border border-dashed border-border rounded-3xl">
        <div className="da-ei w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
          <Icons.FileText />
        </div>
        <div className="font-bold text-foreground mb-1">No documents yet</div>
        <div className="text-sm text-muted-foreground">Upload your first medical document to get started</div>
      </div>
    );
  }

  const getStatusStyle = (s: DocStatus) => {
    switch (s) {
      case "complete":
        return "text-[#00e5a0] bg-[#00e5a0]/10 border-[#00e5a0]/20";
      case "processing":
        return "text-[#ffb800] bg-[#ffb800]/10 border-[#ffb800]/20";
      case "failed":
        return "text-[#ff5c5c] bg-[#ff5c5c]/10 border-[#ff5c5c]/20";
      default:
        return "text-muted-foreground bg-muted border-border";
    }
  };

  return (
    <div className="da-dg space-y-3">
      {docs.map((doc) => {
        const meta = DOC_META[doc.type] || DOC_META.unknown;
        const statusStyle = getStatusStyle(doc.status);
        const flags = doc.result?.findings?.map((f) => f.flag) || [];
        const uniqueFlags = Array.from(new Set(flags)).filter((f) => f !== "normal");

        return (
          <div
            key={doc.id}
            className={`da-dr group flex items-center gap-4 p-4 bg-muted/30 border border-border rounded-2xl cursor-pointer transition-all hover:translate-x-1 hover:border-accent/40 ${
              doc.status === "processing" ? "animate-pulse" : ""
            }`}
            onClick={() => onSelect(doc)}
          >
            <div className="da-dri w-12 h-14 rounded-xl bg-background border border-border flex items-center justify-center text-2xl group-hover:bg-accent/5">
              {meta.icon}
            </div>
            <div className="da-drm flex-1 min-w-0">
              <div className="da-drn font-bold truncate group-hover:text-accent transition-colors">
                {doc.result?.title || doc.fileName}
              </div>
              <div className="da-drmeta flex items-center gap-3 mt-1 flex-wrap">
                <span className="da-drd text-[10px] font-mono text-muted-foreground">
                  {new Date(doc.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className={`da-dsb text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${statusStyle}`}>
                  {doc.status.toUpperCase()}
                </span>
                {doc.result?.issuedBy && (
                  <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">
                    {doc.result.issuedBy}
                  </span>
                )}
              </div>
            </div>

            {uniqueFlags.length > 0 && (
              <div className="flex gap-1.5 px-3">
                {uniqueFlags.map((f) => (
                  <div key={f} className="w-2 h-2 rounded-full" style={{ backgroundColor: FLAG_COLORS[f] }} />
                ))}
              </div>
            )}

            <div className="da-drc text-muted-foreground/30 group-hover:text-accent transition-colors">
              <Icons.ChevronRight />
            </div>
          </div>
        );
      })}
    </div>
  );
}
