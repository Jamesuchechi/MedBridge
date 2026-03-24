"use client";

import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: 20px;
          animation: fadeIn 0.3s ease;
        }
        .modal-content {
          background: var(--sidebar-bg, #0a0c10);
          border: 1px solid var(--glass-border, rgba(255,255,255,0.1));
          border-radius: 24px; width: 100%; max-width: 600px;
          max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .modal-header {
          padding: 24px 32px; border-bottom: 1px solid var(--glass-border);
          display: flex; justify-content: space-between; align-items: center;
          position: sticky; top: 0; background: inherit; z-index: 10;
        }
        .modal-header h2 { font-family: var(--font-syne), sans-serif; font-size: 20px; font-weight: 800; margin: 0; }
        .close-btn { background: none; border: none; font-size: 32px; color: var(--text-muted); cursor: pointer; transition: color .2s; }
        .close-btn:hover { color: var(--accent-primary); }
        .modal-body { padding: 0 32px 32px 32px; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};
