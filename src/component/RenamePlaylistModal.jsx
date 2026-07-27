import { useState, useEffect } from "react";
import "../css/playlist.css";

export default function RenamePlaylistModal({ isOpen, onClose, playlist, onRenamePlaylist }) {
  const [newPlaylistName, setNewPlaylistName] = useState("");

  useEffect(() => {
    if (playlist) {
      setNewPlaylistName(playlist.name);
    }
  }, [playlist]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onRenamePlaylist(playlist.id, newPlaylistName.trim());
      onClose();
    }
  };

  return (
    <div className="playlist-modal-overlay" onClick={onClose}>
      <div className="playlist-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-pen-to-square" style={{ color: "#1DB954", marginRight: "8px" }}></i>
            Rename Playlist
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-field">
            <label className="modal-label">New Playlist Name</label>
            <input
              type="text"
              className="modal-input"
              placeholder="Enter new name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-confirm"
              disabled={!newPlaylistName.trim()}
            >
              Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
