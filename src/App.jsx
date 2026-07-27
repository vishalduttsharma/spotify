import { useState, useEffect } from "react";
import Maincontent from "./page/Maincontent";
import Musicplayer from "./page/Musicplayer";
import Sidebar from "./page/Sidebar";
import MobileNav from "./component/MobileNav";
import CreatePlaylistModal from "./component/CreatePlaylistModal";
import AddSongsModal from "./component/AddSongsModal";
import RenamePlaylistModal from "./component/RenamePlaylistModal";
import AuthModal from "./component/AuthModal";
import '../src/css/app.css';
import '../src/css/mobilenav.css';
import '../src/css/playlist.css';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Admin from "./page/Admin";

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

                <MobileNav onToggleSidebar={toggleSidebar} />

                {/* Modals */}
                <AuthModal 
                  isOpen={isAuthModalOpen}
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
