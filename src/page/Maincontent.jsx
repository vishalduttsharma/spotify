import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Songcard from "../component/Songcard";
import Songlist from "../component/Songlist";
import { getAllSongs, fetchCloudSongs, resolveAllSongsMedia } from "../utils/songStorage";
import "../css/maincontent.css";
import '../css/musicplayer.css';
import '../css/playlist.css';
import '../css/auth.css';

export default function Maincontent({ 
  onSongSelect, 
  onToggleSidebar, 
  activePlaylist, 
  onAddSongsToPlaylistModal,
  onOpenRenameModal,
  onDeleteWholePlaylist,
  onRemoveSongFromPlaylist,
  onBackToHome,
  currentUser,
  onOpenAuthModal,
  onLogout
}) {
  const [searchFilter, setSearchFilter] = useState("");
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState("");
  const [allSongs, setAllSongs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const syncSongs = async () => {
      const cloudSongs = await fetchCloudSongs();
      const resolved = await resolveAllSongsMedia(cloudSongs);
      if (isMounted) {
        setAllSongs(resolved);
      }
    };
    syncSongs();
    const interval = setInterval(syncSongs, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const query = searchFilter.trim().toLowerCase();

  const filteredCatalogSongs = allSongs.filter(song => {
    if (!query) return true;
    const name = (song.name || "").toLowerCase();
    const singer = (song.singer || "").toLowerCase();

    if (name.includes(query) || singer.includes(query)) return true;

    const words = query.split(/\s+/).filter(Boolean);
    return words.every(word => name.includes(word) || singer.includes(word));
  });

  // If a playlist is active, filter its songs
  const playlistSongs = activePlaylist
    ? allSongs.filter(s => activePlaylist.songIds.includes(s.id))
    : [];

  const playlistQuery = playlistSearchQuery.trim().toLowerCase();

  const filteredPlaylistSongs = playlistSongs.filter(song => {
    if (!playlistQuery) return true;
    const name = (song.name || "").toLowerCase();
    const singer = (song.singer || "").toLowerCase();

    if (name.includes(playlistQuery) || singer.includes(playlistQuery)) return true;

    const words = playlistQuery.split(/\s+/).filter(Boolean);
    return words.every(word => name.includes(word) || singer.includes(word));
  });

  return (
    <div id="maincontent">
      {/* Top Navbar */}
      <div className="maincontent-nav">
        <div className="nav-icon-left">
          <button 
            className="mobile-toggle-btn" 
            onClick={onToggleSidebar} 
            aria-label="Open Library Menu"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
          <button 
            className="nav-arrow-btn" 
            aria-label="Go back"
            onClick={activePlaylist ? onBackToHome : undefined}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
          <button className="nav-arrow-btn hide-mobile" aria-label="Go forward">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        {/* Quick Catalog Search Bar (Only when on Home Catalog) */}
        {!activePlaylist && (
          <div className="nav-search-bar">
            <i className="fa-solid fa-magnifying-glass search-bar-icon"></i>
            <input 
              type="text" 
              className="search-input-main" 
              placeholder="What do you want to play?"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            {searchFilter && (
              <button 
                type="button" 
                className="clear-search-btn" 
                onClick={() => setSearchFilter("")}
                style={{ background: "none", border: "none", color: "#b3b3b3", cursor: "pointer", padding: "0 8px", fontSize: "14px" }}
                title="Clear search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        )}


        {/* When inside Playlist View, show playlist name in nav header */}
        {activePlaylist && (
          <div className="nav-playlist-header-title">
            <span>{activePlaylist.name}</span>
          </div>
        )}

        <div className="nav-icon-right">
          <button className="nav-btn premium-btn hide-tablet">Explore Premium</button>
          <button className="nav-btn install-btn" title="Install App">
            <i className="fa-regular fa-circle-down"></i>
            <span className="nav-btn-text">Install App</span>
          </button>
          <Link to="/admin">
            <button className="nav-btn admin-btn" title="Admin Studio">
              <i className="fa-solid fa-user-gear"></i>
              <span className="nav-btn-text">Admin</span>
            </button>
          </Link>
          
          {currentUser ? (
            <div className="user-profile-badge" title={`Logged in as ${currentUser.name} (@${currentUser.username}) - ${currentUser.gmail}`}>
              <div className="user-avatar-circle">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="user-display-name">{currentUser.name || currentUser.username}</span>
              <button className="logout-mini-btn" onClick={onLogout} title="Logout account">
                <i className="fa-solid fa-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <button className="nav-btn profile-btn" title="Log In / Sign Up" onClick={onOpenAuthModal}>
              <i className="fa-solid fa-user"></i>
            </button>
          )}
        </div>
      </div>

      {/* Playlist View Mode */}
      {activePlaylist ? (
        <div className="playlist-view-container">
          {/* Banner */}
          <div className="playlist-banner">
            <div className="playlist-cover-large">
              <i className="fa-solid fa-music"></i>
            </div>
            <div className="playlist-banner-details">
              <span className="playlist-type">PLAYLIST</span>
              <div className="playlist-banner-title-row">
                <h1 className="playlist-banner-title">{activePlaylist.name}</h1>
                <button 
                  className="title-rename-btn" 
                  title="Rename playlist"
                  onClick={() => onOpenRenameModal(activePlaylist)}
                >
                  <i className="fa-solid fa-pen"></i> Rename
                </button>
              </div>
              <span className="playlist-banner-meta">
                Custom Playlist • {playlistSongs.length} tracks
              </span>
            </div>
          </div>

          {/* Action Controls & Top Search inside Playlist */}
          <div className="playlist-controls-bar">
            <div className="playlist-buttons-group">
              <button 
                className="playlist-btn add-btn"
                onClick={() => onAddSongsToPlaylistModal(activePlaylist)}
              >
                <i className="fa-solid fa-plus"></i> Add Songs to Playlist
              </button>

              <button 
                className="playlist-btn rename-btn"
                onClick={() => onOpenRenameModal(activePlaylist)}
              >
                <i className="fa-solid fa-pen"></i> Rename Playlist
              </button>

              <button 
                className="playlist-btn delete-btn"
                onClick={() => onDeleteWholePlaylist(activePlaylist.id)}
              >
                <i className="fa-regular fa-trash-can"></i> Delete Whole Playlist
              </button>

              <button 
                className="playlist-btn back-btn"
                onClick={onBackToHome}
              >
                <i className="fa-solid fa-house"></i> Back to Home
              </button>
            </div>

            {/* Top Search Bar Inside Playlist */}
            <div className="playlist-search-container">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                className="playlist-search-input" 
                placeholder="Search inside playlist..."
                value={playlistSearchQuery}
                onChange={(e) => setPlaylistSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Playlist Track List */}
          <div className="playlist-track-list">
            {filteredPlaylistSongs.map((song, index) => {
              const cover = song.img || `/songsimg/${song.id + 1}.png`;

              return (
                <div 
                  key={song.id} 
                  className="playlist-track-row"
                  onClick={() => onSongSelect(song)}
                >
                  <span className="track-number">{index + 1}</span>
                  <img src={cover} alt={song.name} className="track-img" />
                  <div className="track-info">
                    <div className="track-name">{song.name}</div>
                    <div className="track-singer">{song.singer}</div>
                  </div>
                  <button 
                    className="delete-track-btn"
                    title="Remove song from playlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSongFromPlaylist(activePlaylist.id, song.id);
                    }}
                  >
                    <i className="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              );
            })}

            {playlistSongs.length === 0 && (
              <div className="empty-playlist-msg">
                <i className="fa-solid fa-folder-open"></i>
                <p>This playlist is currently empty.</p>
                <button 
                  className="playlist-btn add-btn"
                  onClick={() => onAddSongsToPlaylistModal(activePlaylist)}
                  style={{ marginTop: "10px" }}
                >
                  <i className="fa-solid fa-plus"></i> Add Songs Now
                </button>
              </div>
            )}

            {playlistSongs.length > 0 && filteredPlaylistSongs.length === 0 && (
              <div className="empty-playlist-msg">
                <p>No tracks matching "{playlistSearchQuery}" in this playlist.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Home Catalog View */
        <div className="music-card">
          {/* Only show Recently Played when NOT searching */}
          {!query && (
            <div className="top-number-of-songs">
              <h2 className="section-title">Recently Played</h2>
              <div className="recently-played-grid">
                <Songcard />
              </div>
            </div>
          )}

          <div className="songs-list">
            <h2 className="section-title">
              {query ? `Search Results (${filteredCatalogSongs.length})` : "Trending Now Near You"}
            </h2>
            <div className="songs-list-container">
              {filteredCatalogSongs.map((iteam, index) => {
                return (
                  <div 
                    className="callcard" 
                    key={index} 
                    onClick={() => onSongSelect(iteam)}
                  >
                    <Songlist 
                      url={iteam.img || `/songsimg/${iteam.id + 1}.png`} 
                      name={iteam.name} 
                      singer={iteam.singer} 
                    />
                  </div>
                );
              })}
              {filteredCatalogSongs.length === 0 && (
                <div className="no-songs-found">
                  <i className="fa-solid fa-compact-disc"></i>
                  <p>No tracks found matching "{searchFilter}"</p>
                  <button 
                    type="button" 
                    className="clear-search-btn-large"
                    onClick={() => setSearchFilter("")}
                    style={{
                      marginTop: "12px",
                      padding: "8px 18px",
                      borderRadius: "20px",
                      backgroundColor: "#1DB954",
                      color: "black",
                      fontWeight: "700",
                      fontSize: "13px",
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

