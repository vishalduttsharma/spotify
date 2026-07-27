import { useNavigate, useLocation } from "react-router-dom";
import "../css/mobilenav.css";

export default function MobileNav({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === "/";
  const isAdmin = location.pathname === "/admin";

  const handleHomeClick = () => {
    if (!isHome) {
      navigate("/");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
      const mainEl = document.getElementById("maincontent");
      if (mainEl) mainEl.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <nav className="mobile-bottom-nav">
      <button 
        className={`mobile-nav-item ${isHome ? "active" : ""}`} 
        onClick={handleHomeClick}
      >
        <i className="fa-solid fa-house"></i>
        <span>Home</span>
      </button>

      <button 
        className="mobile-nav-item" 
        onClick={() => {
          handleHomeClick();
          setTimeout(() => {
            const searchInput = document.querySelector(".search-input-main");
            if (searchInput) searchInput.focus();
          }, 100);
        }}
      >
        <i className="fa-solid fa-magnifying-glass"></i>
        <span>Search</span>
      </button>

      <button 
        className="mobile-nav-item" 
        onClick={onToggleSidebar}
      >
        <i className="fa-solid fa-lines-leaning"></i>
        <span>Library</span>
      </button>

      <button 
        className={`mobile-nav-item ${isAdmin ? "active" : ""}`} 
        onClick={() => navigate("/admin")}
      >
        <i className="fa-solid fa-user-gear"></i>
        <span>Admin</span>
      </button>
    </nav>
  );
}
