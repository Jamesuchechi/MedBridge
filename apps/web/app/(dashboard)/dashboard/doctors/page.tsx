"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Award } from "lucide-react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth.store";

const SPECIALTIES = [
  "All Specialties",
  "General Practice",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Gynecology",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Internal Medicine"
];

const STATES = [
  "All States",
  "Lagos",
  "Abuja",
  "Rivers",
  "Kano",
  "Oyo",
  "Enugu",
  "Delta"
];

interface Doctor {
  id: string;
  userId: string;
  fullName: string;
  specialization: string;
  subSpecialization?: string;
  currentHospital?: string;
  hospitalState?: string;
  yearsExperience?: number;
  bio?: string;
  avatarUrl?: string;
}

export default function FindDoctorPage() {
  const { user } = useAuthStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  const [selectedState, setSelectedState] = useState("All States");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedSpecialty !== "All Specialties") params.append("specialty", selectedSpecialty);
      if (selectedState !== "All States") params.append("state", selectedState);

      const res = await fetch(`${API_URL}/api/v1/doctors/search?${params.toString()}`, {
        headers: { "x-user-id": user?.id || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchQuery, selectedSpecialty, selectedState]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  const handleRequestConsultation = async () => {
    if (!selectedDoctor || !user) return;
    setSendingRequest(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${API_URL}/api/v1/consultations`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user.id 
        },
        body: JSON.stringify({
          doctorId: selectedDoctor?.userId,
          message: requestMessage
        })
      });

      if (res.ok) {
        alert("Consultation request sent successfully!");
        setShowRequestModal(false);
        setRequestMessage("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send request");
      }
    } catch (err) {
      console.error("Request error:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="doctors-page">
      <style>{`
        .doctors-page { max-width: 1200px; margin: 0 auto; }
        .page-header { margin-bottom: 32px; }
        .page-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; }
        .page-desc { color: var(--text2); font-size: 16px; }

        .search-section { 
          background: var(--card-bg); border: 1px solid var(--card-border); 
          padding: 24px; border-radius: 20px; margin-bottom: 32px;
          display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;
        }
        .filter-group { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 8px; }
        .filter-label { font-size: 12px; font-weight: 700; color: var(--text3); text-transform: uppercase; letter-spacing: 0.05em; }
        .filter-input-wrapper { position: relative; }
        .filter-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text3); width: 16px; }
        .filter-input { 
          width: 100%; background: var(--bg2); border: 1px solid var(--border); 
          border-radius: 12px; padding: 10px 12px 10px 36px; color: var(--text);
          font-size: 14px; outline: none; transition: border-color .2s;
        }
        .filter-input:focus { border-color: var(--accent); }
        .search-btn {
          background: var(--accent); color: #000; font-weight: 700; padding: 11px 24px;
          border-radius: 12px; height: 42px; display: flex; align-items: center; gap: 8px;
        }

        .doctors-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
        .doctor-card { 
          background: var(--card-bg); border: 1px solid var(--card-border); 
          border-radius: 20px; overflow: hidden; display: flex; flex-direction: column;
          transition: transform .2s, border-color .2s; cursor: pointer;
        }
        .doctor-card:hover { transform: translateY(-4px); border-color: var(--accent); }
        .card-top { padding: 20px; display: flex; gap: 16px; }
        .doc-avatar { 
          width: 80px; height: 80px; border-radius: 16px; background: var(--bg3); 
          display: flex; align-items: center; justify-content: center; font-size: 24px;
          font-weight: 800; color: var(--accent); flex-shrink: 0; overflow: hidden;
        }
        .doc-info { flex: 1; }
        .doc-name { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 4px; }
        .doc-spec { color: var(--accent); font-size: 13px; font-weight: 700; margin-bottom: 8px; }
        .doc-meta { display: flex; flex-direction: column; gap: 4px; color: var(--text2); font-size: 12px; }
        .meta-item { display: flex; align-items: center; gap: 6px; }
        .meta-item svg { width: 14px; color: var(--text3); }

        .card-bottom { padding: 16px 20px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--border); display: flex; gap: 12px; }
        .request-btn { 
          flex: 1; background: var(--glass); border: 1px solid var(--border); 
          color: var(--text2); font-weight: 700; font-size: 13px; padding: 10px; border-radius: 10px;
          transition: all .2s;
        }
        .request-btn:hover { background: var(--accent); color: #000; border-color: var(--accent); }

        .modal-overlay { 
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
        }
        .request-modal { 
          background: var(--bg2); border: 1px solid var(--border); width: 100%; max-width: 500px;
          border-radius: 24px; padding: 32px; position: relative;
        }
        .modal-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; margin-bottom: 8px; }
        .modal-subtitle { color: var(--text2); font-size: 14px; margin-bottom: 24px; }
        .modal-textarea {
          width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: 16px;
          padding: 16px; color: var(--text); font-size: 14px; resize: none; outline: none; margin-bottom: 24px;
        }
        .modal-actions { display: flex; gap: 12px; }
        .modal-btn { flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 14px; }
        .btn-cancel { background: var(--glass); border: 1px solid var(--border); color: var(--text2); }
        .btn-confirm { background: var(--accent); color: #000; }

        .loading-state { padding: 80px; text-align: center; color: var(--text3); }
        .empty-state { padding: 80px; text-align: center; color: var(--text3); background: var(--card-bg); border-radius: 24px; border: 1px dashed var(--border); }
      `}</style>

      <header className="page-header">
        <h1 className="page-title">Find a Doctor</h1>
        <p className="page-desc">Connect with verified specialists and manage your consultations.</p>
      </header>

      <form className="search-section" onSubmit={handleSearch}>
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <div className="filter-input-wrapper">
            <Search className="filter-icon" />
            <input 
              type="text" 
              className="filter-input" 
              placeholder="Name or Hospital..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Specialty</label>
          <div className="filter-input-wrapper">
            <Award className="filter-icon" />
            <select 
              className="filter-input" 
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
            >
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="filter-group">
          <label className="filter-label">Location</label>
          <div className="filter-input-wrapper">
            <MapPin className="filter-icon" />
            <select 
              className="filter-input" 
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              {STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" className="search-btn">
          Search Doctors
        </button>
      </form>

      {loading ? (
        <div className="loading-state">
          <p>Finding the best doctors for you...</p>
        </div>
      ) : doctors.length > 0 ? (
        <div className="doctors-grid">
          {doctors.map((doc: Doctor) => (
            <div key={doc.id} className="doctor-card">
              <div className="card-top">
                <div className="doc-avatar">
                  {doc.avatarUrl ? (
                    <Image src={doc.avatarUrl} alt="" width={80} height={80} objectFit="cover" />
                  ) : doc.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="doc-info">
                  <h3 className="doc-name">{doc.fullName}</h3>
                  <div className="doc-spec">{doc.specialization}</div>
                  <div className="doc-meta">
                    <div className="meta-item"><MapPin /> {doc.currentHospital}, {doc.hospitalState}</div>
                    <div className="meta-item"><Award /> {doc.yearsExperience} Years Experience</div>
                  </div>
                </div>
              </div>
              <div className="card-bottom">
                <button 
                  className="request-btn"
                  onClick={() => {
                    setSelectedDoctor(doc);
                    setShowRequestModal(true);
                  }}
                >
                  Request Consultation
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No doctors found matching your criteria. Try adjusting your filters.</p>
        </div>
      )}

      {showRequestModal && (
        <div className="modal-overlay">
          <div className="request-modal">
            <h2 className="modal-title">Request Consultation</h2>
            <p className="modal-subtitle">Briefly describe your health concern for Dr. {selectedDoctor?.fullName}.</p>
            
            <textarea 
              className="modal-textarea" 
              rows={5} 
              placeholder="E.g. I have been having persistent headaches for the past 3 days..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
            />

            <div className="modal-actions">
              <button 
                className="modal-btn btn-cancel" 
                onClick={() => setShowRequestModal(false)}
                disabled={sendingRequest}
              >
                Cancel
              </button>
              <button 
                className="modal-btn btn-confirm" 
                onClick={handleRequestConsultation}
                disabled={sendingRequest || !requestMessage}
              >
                {sendingRequest ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
