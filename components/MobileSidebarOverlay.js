import React from 'react';
import Sidebar from './Sidebar';

export default function MobileSidebarOverlay({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="sidebar-mobile-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.75)",
        zIndex: 1001,
        pointerEvents: 'auto',
        touchAction: 'manipulation',
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitOverflowScrolling: "touch"
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
    >
      <div
        className="sidebar-mobile-modal"
        style={{
          position: "relative",
          zIndex: 1002,
          width: "90vw",
          maxWidth: 350,
          maxHeight: "90vh",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          display: "flex",
          flexDirection: "column",
          background: "var(--secondary-bg)",
          borderRadius: "1.2rem",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          margin: 'auto',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          aria-label="Close sidebar"
          title="Close sidebar"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: "none",
            border: "none",
            color: "#DFE3F5",
            fontSize: 28,
            cursor: "pointer",
            zIndex: 1003,
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0"
          }}
          onClick={onClose}
        >
          ×
        </button>
  <Sidebar onClose={onClose} />
      </div>
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
