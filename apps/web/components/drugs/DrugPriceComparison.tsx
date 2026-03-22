"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { track } from "@/lib/analytics";

interface PriceEntry {
  pharmacyId: string;
  pharmacyName: string;
  address: string;
  state: string;
  price: number;
  priceDisplay: string;
  quantity?: string;
  reportedAt: string;
  lat?: number;
  lng?: number;
}

interface PriceSummary {
  lowestPrice:   number;
  highestPrice:  number;
  avgPrice:      number;
  reportCount:   number;
  pharmacyCount: number;
}

interface PriceComparisonData {
  prices:  PriceEntry[];
  summary: PriceSummary | null;
}

const CSS = `
.dpc { margin-top:24px; }
.dpc-section { background:var(--card-bg,rgba(255,255,255,.04)); border:1px solid var(--card-border,rgba(255,255,255,.08)); border-radius:16px; padding:20px; }
.dpc-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px; }
.dpc-title { font-family:'DM Mono',monospace; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--accent); }
.dpc-find { font-size:12px; font-weight:700; color:var(--accent2,#3d9bff); background:rgba(61,155,255,.1); border:1.5px solid rgba(61,155,255,.2); border-radius:8px; padding:5px 12px; text-decoration:none; display:inline-flex;align-items:center;gap:5px; transition:all .2s; }
.dpc-find:hover { background:rgba(61,155,255,.2); }
.dpc-summary { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:18px; }
.dpc-stat { text-align:center; padding:12px; background:rgba(0,229,160,.04); border:1px solid rgba(0,229,160,.1); border-radius:12px; }
.dpc-stat-val { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; color:var(--accent); line-height:1; margin-bottom:3px; }
.dpc-stat-lbl { font-size:10px; color:var(--text3); font-family:'DM Mono',monospace; text-transform:uppercase; }
.dpc-row { display:flex; align-items:center; justify-content:space-between; padding:11px 0; border-bottom:1px solid var(--border,rgba(255,255,255,.06)); gap:12px; }
.dpc-row:last-child { border-bottom:none; }
.dpc-pharmacy { min-width:0; }
.dpc-pname { font-size:13px; font-weight:700; display:flex; align-items:center; gap:6px; }
.dpc-badge { font-size:9px; font-family:'DM Mono',monospace; font-weight:700; padding:2px 6px; border-radius:100px; flex-shrink:0; }
.dpc-badge-best { background:rgba(0,229,160,.1); color:var(--accent); border:1px solid rgba(0,229,160,.2); }
.dpc-badge-high { background:rgba(255,124,43,.1); color:#ff7c2b; border:1px solid rgba(255,124,43,.2); }
.dpc-addr { font-size:11px; color:var(--text3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:220px; }
.dpc-qty { font-size:10px; color:var(--text3); font-family:'DM Mono',monospace; }
.dpc-price { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; white-space:nowrap; flex-shrink:0; }
.dpc-price.best { color:var(--accent); }
.dpc-price.high { color:#ff7c2b; }
.dpc-price.mid  { color:var(--text); }
.dpc-footer { margin-top:12px; font-size:11px; color:var(--text3); font-style:italic; }
.dpc-empty { font-size:13px; color:var(--text3); line-height:1.6; }
.dpc-empty a { color:var(--accent); font-weight:700; }
.dpc-spinner { width:24px;height:24px; border:2px solid var(--border,rgba(255,255,255,.08)); border-top-color:var(--accent); border-radius:50%; animation:dpc-spin .7s linear infinite; margin:24px auto; display:block; }
@keyframes dpc-spin { to{transform:rotate(360deg)} }
`;

export function DrugPriceComparison({
  drugId,
  drugName,
}: {
  drugId:   string;
  drugName: string;
}) {
  const [data,    setData]    = useState<PriceComparisonData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PriceComparisonData>(`/api/v1/pharmacies/prices/${drugId}`)
      .then((d) => {
        setData(d);
        if (d.prices.length > 0) {
          track.priceComparisonViewed({
            drugId,
            drugName,
            pharmacyCount: d.summary?.pharmacyCount ?? 0,
          });
        }
      })
      .catch(() => setData({ prices: [], summary: null }))
      .finally(() => setLoading(false));
  }, [drugId, drugName]);

  const lowest  = data?.summary?.lowestPrice;
  const highest = data?.summary?.highestPrice;
  const hasMultiple = (data?.prices.length ?? 0) > 1;

  return (
    <>
      <style>{CSS}</style>
      <div className="dpc">
        <div className="dpc-section">
          <div className="dpc-header">
            <span className="dpc-title">Community Prices</span>
            <a href="/dashboard/drugs/pharmacies" className="dpc-find">
              Find pharmacy →
            </a>
          </div>

          {loading ? (
            <div className="dpc-spinner" />
          ) : data && data.prices.length > 0 ? (
            <>
              {data.summary && (
                <div className="dpc-summary">
                  <div className="dpc-stat">
                    <div className="dpc-stat-val">₦{data.summary.lowestPrice.toLocaleString()}</div>
                    <div className="dpc-stat-lbl">Lowest</div>
                  </div>
                  <div className="dpc-stat">
                    <div className="dpc-stat-val">₦{data.summary.avgPrice.toLocaleString()}</div>
                    <div className="dpc-stat-lbl">Average</div>
                  </div>
                  <div className="dpc-stat" style={{ borderColor: "rgba(255,124,43,.2)", background: "rgba(255,124,43,.04)" }}>
                    <div className="dpc-stat-val" style={{ color: "#ff7c2b" }}>₦{data.summary.highestPrice.toLocaleString()}</div>
                    <div className="dpc-stat-lbl">Highest</div>
                  </div>
                </div>
              )}

              {data.prices.map((p, i) => {
                const isBest = p.price === lowest;
                const isHigh = hasMultiple && p.price === highest;
                return (
                  <div key={`${p.pharmacyId}-${i}`} className="dpc-row">
                    <div className="dpc-pharmacy">
                      <div className="dpc-pname">
                        {p.pharmacyName}
                        {isBest && <span className="dpc-badge dpc-badge-best">Best price</span>}
                        {isHigh && <span className="dpc-badge dpc-badge-high">Highest</span>}
                      </div>
                      <div className="dpc-addr">{p.address}</div>
                      {p.quantity && <div className="dpc-qty">{p.quantity}</div>}
                    </div>
                    <div className={`dpc-price ${isBest ? "best" : isHigh ? "high" : "mid"}`}>
                      {p.priceDisplay}
                    </div>
                  </div>
                );
              })}

              <p className="dpc-footer">
                {data.summary?.reportCount} community report{data.summary?.reportCount !== 1 ? "s" : ""} in the last 30 days.
                Prices may vary and are unverified.
              </p>
            </>
          ) : (
            <p className="dpc-empty">
              No price reports for <strong>{drugName}</strong> yet.{" "}
              <a href="/dashboard/drugs/pharmacies">
                Find a pharmacy and be the first to report!
              </a>
            </p>
          )}
        </div>
      </div>
    </>
  );
}