import { useState, useEffect } from "react";
import MobileSidebarOverlay from "./MobileSidebarOverlay";

export default function Header({ children }) {
  // Splash text state
  const [splashText, setSplashText] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Fetch splash texts from public folder
    fetch("/splash-text.json")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const randomSplash = data[Math.floor(Math.random() * data.length)];
          setSplashText(randomSplash);
        }
      })
      .catch(() => setSplashText(""));
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className="main-header">
      <div className="header-bar">
        <button
          id="mobile-hamburger-btn"
          className="mobile-hamburger-btn"
          type="button"
          aria-label="Open sidebar"
          title="Open sidebar menu"
          onClick={() => isMobile && setShowSidebar(true)}
        >
          <span className="bi bi-list hamburger-icon" aria-hidden="true"></span>
        </button>
        <div className="logo">
          <img src="/assets/favicon-96x96.png" alt="The Hardest Achievements List Logo" title="The Hardest Achievements List Logo" className="logo-img" />
        </div>
        <h1 className="title main-title">The Hardest Achievements List</h1>
        {children && <div className="header-children">{children}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
        {!isMobile && <div className="splash-text">{splashText}</div>}
      </div>
            {/* Mobile Sidebar Overlay */}
      <MobileSidebarOverlay 
        isOpen={isMobile && showSidebar}
        onClose={() => setShowSidebar(false)}
      />
    </header>
  );
}
