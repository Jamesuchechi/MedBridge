"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import * as Ic from "lucide-react";

interface ClinicalCase {
  id: string;
  patientName: string;
  patientAge: string;
  patientSex: string;
  chiefComplaint: string;
  createdAt: string;
}

export default function PatientsPage() {
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const supabase = createClient();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    const fetchCases = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const res = await fetch(`${API_URL}/api/v1/patients`, {
          headers: {
            "x-user-id": user.id,
            "x-user-role": user.user_metadata?.role || "CLINICIAN"
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCases(data);
        }
      } catch (err) {
        console.error("Failed to fetch cases:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, [supabase, API_URL]);

  const filtered = cases.filter(c => 
    c.patientName.toLowerCase().includes(search.toLowerCase()) ||
    c.chiefComplaint.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-container">
      <style>{CSS}</style>
      
      <div className="p-header">
        <div>
          <h1 className="p-title">My Patients</h1>
          <p className="p-subtitle">Manage recent consultations and clinical cases</p>
        </div>
        <button className="p-btn-primary" onClick={() => window.location.assign("/dashboard/copilot")}>
          <Ic.Plus size={18} /> New Case
        </button>
      </div>

      <div className="p-search-bar">
        <Ic.Search className="p-search-icon" size={20} />
        <input 
          placeholder="Search by patient name or complaint..." 
          className="p-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="p-loading">
          <div className="p-spinner" />
          <p>Loading clinical cases...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-empty">
          <div className="p-empty-icon"><Ic.Users size={48} /></div>
          <h3>No cases found</h3>
          <p>You haven't recorded any clinical cases yet.</p>
          <button className="p-btn-secondary" onClick={() => window.location.assign("/dashboard/copilot")}>
            Start first analysis
          </button>
        </div>
      ) : (
        <div className="p-grid">
          {filtered.map((c) => (
            <div key={c.id} className="p-card" onClick={() => window.location.assign(`/dashboard/patients/${c.id}`)}>
              <div className="p-card-header">
                <div className="p-avatar">{c.patientName[0]}</div>
                <div className="p-patient-info">
                  <div className="p-patient-name">{c.patientName}</div>
                  <div className="p-patient-meta">{c.patientAge}y • {c.patientSex}</div>
                </div>
                <div className="p-date">{new Date(c.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="p-card-body">
                <div className="p-complaint-label">Chief Complaint</div>
                <div className="p-complaint-text">{c.chiefComplaint}</div>
              </div>
              <div className="p-card-footer">
                <span className="p-view-link">View clinical details <Ic.ArrowRight size={14} /></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.p-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--text-primary);
  min-height: 100vh;
}

.p-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

.p-title {
  font-size: 2.25rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary) 0%, var(--accent-secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.p-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

.p-btn-primary {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
}

.p-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.p-search-bar {
  position: relative;
  margin-bottom: 2rem;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.p-search-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.p-search-input {
  width: 100%;
  background: transparent;
  border: none;
  padding: 1rem 1rem 1rem 3.5rem;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
}

.p-search-input::placeholder {
  color: var(--text-muted);
}

.p-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.p-card {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
}

.p-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-secondary);
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--shadow-card);
}

.p-card-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.p-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--accent-secondary);
}

.p-patient-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.p-patient-meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.p-date {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.p-card-body {
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.p-complaint-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent-secondary);
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.p-complaint-text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  opacity: 0.85;
}

.p-card-footer {
  border-top: 1px solid var(--glass-border);
  padding-top: 1rem;
}

.p-view-link {
  font-size: 0.85rem;
  color: var(--accent-secondary);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
}

.p-loading, .p-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem;
  text-align: center;
  background: var(--bg-card);
  border-radius: 24px;
  border: 1px dashed var(--glass-border);
}

.p-empty-icon {
  width: 80px;
  height: 80px;
  background: var(--bg-card-hover);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.p-empty h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.p-empty p {
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.p-btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.p-btn-secondary:hover {
  background: var(--bg-card-hover);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.p-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--glass-border);
  border-top-color: var(--accent-secondary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  .p-container { padding: 1rem; }
  .p-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
  .p-grid { grid-template-columns: 1fr; }
}
`;
