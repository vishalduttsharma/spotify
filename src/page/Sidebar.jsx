import { Link } from 'react-router-dom';
import Libbox from '../component/Libbox';
import '../css/sidebar.css';
import '../css/playlist.css';

export default function Sidebar({
  isOpen,
  onClose,
  playlists = [],
  activePlaylistId,
  onSelectPlaylist,
  onOpenCreateModal,
  onOpenAddSongsModal,
  onOpenRenameModal,
  onDeletePlaylist
}) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}
      
      <div id="sidebar" className={isOpen ? "mobile-open" : ""}>
        {/* Mobile Header with Close Button */}
        <div className="sidebar-mobile-header">
          <div className="spotify-logo-brand">
            <i className="fa-brands fa-spotify logo-icon"></i>
            <span className="logo-text">Spotify</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="navpart">
          <div className="nav-option">
            <i className="fa-solid fa-house"></i>
            <Link to="/" onClick={() => onSelectPlaylist(null)} style={{ opacity: "1" }}>Home</Link>
          </div>
          <div className="nav-option">
            <i className="fa-solid fa-magnifying-glass"></i>
            <Link to="/" onClick={() => onSelectPlaylist(null)}>Search</Link>
          </div>
        </div>

        <div className="library">
          <div className="lib-option">
            <div className="lib-option-left">
              <i className="fa-solid fa-lines-leaning"></i>
              <a href="#" onClick={(e) => { e.preventDefault(); onSelectPlaylist(null); }}>Your Library</a>
            </div>

            <div className="lib-option-right">
              <i 
                className="fa-solid fa-plus" 
                title="Create new playlist"
                onClick={onOpenCreateModal}
                style={{ cursor: "pointer" }}
              ></i>
            </div>
          </div>

          <div className="lib-box">
            {/* Render User Playlists */}
            {playlists.length > 0 && (
              <div className="user-playlists-section">
                {playlists.map((playlist) => {
                  const isActive = activePlaylistId === playlist.id;
                  const trackCount = playlist.songIds ? playlist.songIds.length : 0;

                  return (
                    <div 
                      key={playlist.id} 
                      className={`sidebar-playlist-item ${isActive ? "active" : ""}`}
                      onClick={() => onSelectPlaylist(playlist.id)}
                    >
                      <div className="sidebar-playlist-icon">
                        <i className="fa-solid fa-music"></i>
                      </div>
                      <div className="sidebar-playlist-info">
                        <div className="sidebar-playlist-title">{playlist.name}</div>
                        <div className="sidebar-playlist-subtitle">Playlist • {trackCount} tracks</div>
                      </div>
                      <div className="sidebar-playlist-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="sidebar-action-btn add"
                          title="Add songs to playlist"
                          onClick={() => onOpenAddSongsModal(playlist)}
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                        <button 
                          className="sidebar-action-btn rename"
                          title="Rename playlist"
                          onClick={() => onOpenRenameModal(playlist)}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button 
                          className="sidebar-action-btn"
                          title="Delete playlist"
                          onClick={() => onDeletePlaylist(playlist.id)}
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Libbox 
              title="Create your first playlist" 
              discription="It's easy, we'll help you" 
              btnname="Create playlist" 
              onBtnClick={onOpenCreateModal}
            />
            <Libbox 
              title="Let's find some podcasts to follow" 
              discription="We'll keep you updated on new episodes" 
              btnname="Browse podcasts" 
            />
          </div>
        </div>
      </div>
    </>
  );
}
