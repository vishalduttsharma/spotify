import { useState, useEffect } from "react";
import Maincontent from "./page/Maincontent";
import Musicplayer from "./page/Musicplayer";
import Sidebar from "./page/Sidebar";
import MobileNav from "./component/MobileNav";
import CreatePlaylistModal from "./component/CreatePlaylistModal";
import AddSongsModal from "./component/AddSongsModal";
import RenamePlaylistModal from "./component/RenamePlaylistModal";
import AuthModal from "./component/AuthModal";
import BannedModal from "./component/BannedModal";
import '../src/css/app.css';
import '../src/css/mobilenav.css';
import '../src/css/playlist.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Admin from "./page/Admin";
import { checkUserStatusInCloud } from "./utils/cloudDb";

export default function App() {
  const [currentSong, setCurrentSong] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Current logged in user state
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("spotify_current_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Auth modal state - opens automatically if not logged in
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(() => {
    try {
      const savedUser = localStorage.getItem("spotify_current_user");
      return !savedUser;
    } catch {
      return true;
    }
  });

  // Playlists state loaded from localStorage
  const [playlists, setPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem("spotify_playlists");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [addSongsTargetPlaylist, setAddSongsTargetPlaylist] = useState(null);
  const [renameTargetPlaylist, setRenameTargetPlaylist] = useState(null);

  // Auto-verify if the logged-in user still exists in Cloud DB or is Banned by Admin
  useEffect(() => {
    if (!currentUser || currentUser.isAdmin) return;

    let isMounted = true;

    const verifySession = async () => {
      const { exists, userData } = await checkUserStatusInCloud(currentUser);

      if (!isMounted) return;

      if (!exists) {
        // User account deleted by Admin -> Logout & clear session completely
        localStorage.removeItem("spotify_current_user");
        setCurrentUser(null);
        setIsAuthModalOpen(true);
        return;
      }

      // Update user state if ban status or unban reason changed
      if (userData && (
        userData.isBanned !== currentUser.isBanned ||
        userData.unbanRequestReason !== currentUser.unbanRequestReason
      )) {
        localStorage.setItem("spotify_current_user", JSON.stringify(userData));
        setCurrentUser(userData);
      }
    };

    verifySession();
    // Real-time sync interval (every 3 seconds) across all devices & mobile phones
    const interval = setInterval(verifySession, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem("spotify_current_user");
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Sync playlists to localStorage whenever updated
  useEffect(() => {
    localStorage.setItem("spotify_playlists", JSON.stringify(playlists));
  }, [playlists]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Create Playlist Handler
  const handleCreatePlaylist = (name, songIds) => {
    const newPlaylist = {
      id: `pl-${Date.now()}`,
      name,
      songIds,
      createdAt: new Date().toISOString()
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    setActivePlaylistId(newPlaylist.id); // Switch view to new playlist immediately
  };

  // Rename Playlist Handler
  const handleRenamePlaylist = (playlistId, newName) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, name: newName } : p))
    );
  };

  // Delete Whole Playlist Handler
  const handleDeletePlaylist = (playlistId) => {
    if (window.confirm("Are you sure you want to delete this entire playlist?")) {
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      if (activePlaylistId === playlistId) {
        setActivePlaylistId(null);
      }
    }
  };

  // Add Songs to Playlist Handler
  const handleAddSongsToPlaylist = (playlistId, newSongIds) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          const updatedSongIds = Array.from(new Set([...p.songIds, ...newSongIds]));
          return { ...p, songIds: updatedSongIds };
        }
        return p;
      })
    );
  };

  // Remove Individual Song from Playlist Handler
  const handleRemoveSongFromPlaylist = (playlistId, songId) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return { ...p, songIds: p.songIds.filter((id) => id !== songId) };
        }
        return p;
      })
    );
  };

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || null;

  return (
    <div className="main">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <>
                <Sidebar 
                  isOpen={isSidebarOpen} 
                  onClose={closeSidebar}
                  playlists={playlists}
                  activePlaylistId={activePlaylistId}
                  onSelectPlaylist={(id) => {
                    setActivePlaylistId(id);
                    closeSidebar();
                  }}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                  onOpenAddSongsModal={(playlist) => setAddSongsTargetPlaylist(playlist)}
                  onOpenRenameModal={(playlist) => setRenameTargetPlaylist(playlist)}
                  onDeletePlaylist={handleDeletePlaylist}
                />

                <Maincontent 
                  onSongSelect={setCurrentSong} 
                  onToggleSidebar={toggleSidebar}
                  activePlaylist={activePlaylist}
                  onAddSongsToPlaylistModal={(playlist) => setAddSongsTargetPlaylist(playlist)}
                  onOpenRenameModal={(playlist) => setRenameTargetPlaylist(playlist)}
                  onDeleteWholePlaylist={handleDeletePlaylist}
                  onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
                  onBackToHome={() => setActivePlaylistId(null)}
                  currentUser={currentUser}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onLogout={handleLogout}
                />

                <Musicplayer currentSong={currentSong} />

                <MobileNav 
                  onToggleSidebar={toggleSidebar} 
                  onResetPlaylist={() => setActivePlaylistId(null)}
                />

                {/* Banned Modal for Banned Users */}
                {currentUser && currentUser.isBanned && (
                  <BannedModal 
                    currentUser={currentUser} 
                    onLogout={handleLogout}
                    onUserUpdated={(updatedUser) => {
                      setCurrentUser(updatedUser);
                      localStorage.setItem("spotify_current_user", JSON.stringify(updatedUser));
                    }}
                  />
                )}

                {/* Modals */}
                <AuthModal 
                  isOpen={isAuthModalOpen && (!currentUser || !currentUser.isBanned)}
                  onClose={() => setIsAuthModalOpen(false)}
                  onLoginSuccess={(user) => setCurrentUser(user)}
                />

                <CreatePlaylistModal 
                  isOpen={isCreateModalOpen}
                  onClose={() => setIsCreateModalOpen(false)}
                  onCreatePlaylist={handleCreatePlaylist}
                />

                <AddSongsModal 
                  isOpen={Boolean(addSongsTargetPlaylist)}
                  playlist={addSongsTargetPlaylist}
                  onClose={() => setAddSongsTargetPlaylist(null)}
                  onAddSongs={handleAddSongsToPlaylist}
                />

                <RenamePlaylistModal
                  isOpen={Boolean(renameTargetPlaylist)}
                  playlist={renameTargetPlaylist}
                  onClose={() => setRenameTargetPlaylist(null)}
                  onRenamePlaylist={handleRenamePlaylist}
                />
              </>
            }
          />   
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

