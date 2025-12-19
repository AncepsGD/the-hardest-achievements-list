import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createPortal } from 'react-dom';
import { useDateFormat } from './DateFormatContext';

function SidebarInner() {
  const router = useRouter();
  const { dateFormat, setDateFormat } = useDateFormat();
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      if (typeof window === 'undefined') return 100;
      const v = localStorage.getItem('itemsPerPage');
      if (!v) return 100;
      return v === 'all' ? 'all' : Number(v) || 100;
    } catch (e) {
      return 100;
    }
  });

const sources = useMemo(() => [
  '/achievements.json',
  '/legacy.json',
  '/pending.json',
  '/platformers.json',
  '/platformertimeline.json',
  '/timeline.json',
], []);

const randomPoolRef = useRef(null);
const [randomPoolReady, setRandomPoolReady] = useState(false);

const handleRandomClick = useCallback(
  async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      
      if (randomPoolRef.current && randomPoolRef.current.length > 0) {
        const ids = randomPoolRef.current;
        const id = ids[Math.floor(Math.random() * ids.length)];
        if (id) {
          router.push(`/achievement/${id}`);
          return;
        }
      }

      const results = await Promise.all(
        sources.map(async (src) => {
          const res = await fetch(src);
          const data = await res.json();
          return data.filter((a) => a && a.id && a.name);
        })
      );

      const all = results.flat();
      if (all.length === 0) return;

      const random = all[Math.floor(Math.random() * all.length)];
      router.push(`/achievement/${random.id}`);
    } catch (err) {
      console.error('Random selection failed', err);
    }
  },
  [router]
);

useEffect(() => {
  if (typeof window === 'undefined') return;
  try {
    const cached = sessionStorage.getItem('randomPoolIds');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        randomPoolRef.current = parsed;
        setRandomPoolReady(true);
        return;
      }
    }
  } catch (e) {
    
  }

  let cancelled = false;
  (async () => {
    try {
      const results = await Promise.all(
        sources.map(async (src) => {
          const res = await fetch(src);
          const data = await res.json();
          return data.filter((a) => a && a.id && a.name).map((x) => x.id);
        })
      );
      if (cancelled) return;
      const ids = results.flat().filter(Boolean);
      if (ids.length > 0) {
        randomPoolRef.current = ids;
        try {
          sessionStorage.setItem('randomPoolIds', JSON.stringify(ids));
        } catch (e) {}
        setRandomPoolReady(true);
      }
    } catch (err) {
      console.error('Prefetch random pool failed', err);
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleResize() {
      try {
        setIsMobile(typeof window !== 'undefined' && window.innerWidth <= 900);
      } catch (e) {
        setIsMobile(false);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <nav
      className="sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: isMobile ? 'auto' : '100%',
        maxHeight: isMobile ? '90vh' : 'calc(100vh - 2rem)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
            <div style={{ flex: '1 1 auto', minHeight: 0 }}>
        <Link href="/list" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          Main List
        </Link>
        <Link href="/timeline" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          Timeline
        </Link>
        <Link href="/leaderboard" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          Leaderboard
        </Link>
        <Link href="/submission-stats" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          Submission Stats
        </Link>
        <Link href="/pending" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          Pending
        </Link>
        <a
          href="#"
          id="random-achievement-btn"
          className="sidebar-link"
          style={{ color: '#DFE3F5' }}
          onClick={handleRandomClick}
          role="button"
          tabIndex={0}
        >
          Random
        </a>
        <Link href="/about-us" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          About Us
        </Link>
        <Link href="/discord" className="sidebar-link" style={{ color: '#DFE3F5' }}>
          Discord
        </Link>
        <a
          href="#"
          className="sidebar-link"
          style={{ color: '#DFE3F5' }}
          aria-label="Open settings"
          title="Open settings"
          onClick={(e) => {
            e.preventDefault();
            setShowSettings(true);
          }}
          tabIndex={0}
          role="button"
        >
          Settings
        </a>
      </div>

      {showSettings &&
        mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="settings-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2147483647,
              padding: 12,
            }}
            onClick={() => setShowSettings(false)}
          >
            <div
              className="settings-modal"
              style={{
                background: '#23283E',
                borderRadius: 12,
                padding: 32,
                minWidth: 280,
                maxWidth: 'min(680px, 96vw)',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label="Close settings"
                title="Close"
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'none',
                  border: 'none',
                  color: '#DFE3F5',
                  fontSize: 24,
                  cursor: 'pointer',
                }}
                onClick={() => setShowSettings(false)}
              >
                ×
              </button>
              <h2 style={{ color: '#DFE3F5', marginBottom: 24 }}>Settings</h2>

              <div style={{ width: '100%', marginBottom: 12 }}>
                <label
                  style={{
                    color: '#DFE3F5',
                    fontWeight: 600,
                    fontSize: 16,
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Date Format
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['Month D, Yr', 'YYYY/MM/DD', 'MM/DD/YY', 'DD/MM/YY'].map(
                    (format) => (
                      <label
                        key={format}
                        style={{
                          color: '#DFE3F5',
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="radio"
                          name="date-format"
                          value={format}
                          checked={dateFormat === format}
                          onChange={() => setDateFormat(format)}
                          style={{ marginRight: 8 }}
                        />
                        {format}
                      </label>
                    )
                  )}
                </div>
              </div>

              <div style={{ width: '100%', marginTop: 12 }}>
                <label
                  style={{
                    color: '#DFE3F5',
                    fontWeight: 600,
                    fontSize: 16,
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Items Rendered
                </label>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="100"
                    value={itemsPerPage === 'all' ? '' : String(itemsPerPage)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      const n = raw === '' ? '' : Number(raw);
                      setItemsPerPage(n === '' ? '' : n);
                      try {
                        if (raw !== '') localStorage.setItem('itemsPerPage', String(n));
                      } catch { }
                    }}
                    onBlur={() => {
                      if (itemsPerPage === '' || itemsPerPage === 0) {
                        setItemsPerPage(100);
                        try {
                          localStorage.setItem('itemsPerPage', '100');
                        } catch { }
                      }
                    }}
                    style={{
                      padding: 8,
                      background: '#2a2f44',
                      color: '#DFE3F5',
                      borderRadius: 6,
                      border: '1px solid #3b4058',
                      width: 90,
                    }}
                  />
                  <label
                    style={{
                      color: '#DFE3F5',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={itemsPerPage === 'all'}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setItemsPerPage('all');
                          try {
                            localStorage.setItem('itemsPerPage', 'all');
                          } catch { }
                        } else {
                          setItemsPerPage(100);
                          try {
                            localStorage.setItem('itemsPerPage', '100');
                          } catch { }
                        }
                      }}
                    />
                    All
                  </label>
                  <div style={{ color: '#DFE3F5', fontSize: 13 }}>
                    Enter a number (default 100) or check All to render everything
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </nav>
  );
}

export default SidebarInner;
