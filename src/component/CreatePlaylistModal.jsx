import { useState } from "react";
import { getAllSongs } from "../utils/songStorage";
import "../css/playlist.css";

export default function CreatePlaylistModal({ isOpen, onClose, onCreatePlaylist }) {
  const [playlistName, setPlaylistName] = useState("");
  const [selectedSongIds, setSelectedSongIds] = useState([]);
  const [modalSearch, setModalSearch] = useState("");

  if (!isOpen) return null;

  const songsData = getAllSongs();

  const filteredSongs = songsData.filter((song) =>
    song.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
    song.singer.toLowerCase().includes(modalSearch.toLowerCase())
  );

  const toggleSongSelection = (id) => {
    setSelectedSongIds((prev) =>
      prev.includes(id) ? prev.filter((songId) => songId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSongIds.length === songsData.length) {
      setSelectedSongIds([]);
    } else {
      setSelectedSongIds(songsData.map((s) => s.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = playlistName.trim() || `My Playlist #${Math.floor(Math.random() * 1000)}`;
    onCreatePlaylist(finalName, selectedSongIds);
    setPlaylistName("");
    setSelectedSongIds([]);
    setModalSearch("");
    onClose();
  };

  return (
    <div className="playlist-modal-overlay" onClick={onClose}>
      <div className="playlist-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-folder-plus" style={{ color: "#1DB954", marginRight: "8px" }}></i>
            Create New Playlist
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Playlist Name</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. My Favorite Chill Vibe"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-field">
            <div className="select-songs-header">
              <label className="modal-label">Select Songs ({selectedSongIds.length} selected)</label>
              <button
                type="button"
                className="select-all-btn"
                onClick={handleSelectAll}
              >
                {selectedSongIds.length === songsData.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="modal-search-box">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search songs..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
              />
            </div>

            <div className="modal-song-list">
              {filteredSongs.map((song) => {
                const isSelected = selectedSongIds.includes(song.id);
                const cover = song.img || `/songsimg/${song.id + 1}.png`;

                return (
                  <div
                    key={song.id}
                    className={`modal-song-item ${isSelected ? "selected" : ""}`}
                    onClick={() => toggleSongSelection(song.id)}
                  >
                    <input
                      type="checkbox"
                      className="song-checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div
                    />
                    <img src={cover} alt={song.name} className="modal-song-img" />
                    <div className="modal-song-details">
                      <div className="modal-song-name">{song.name}</div>
                      <div className="modal-song-singer">{song.singer}</div>
                    </div>
                  </div>
                );
              })}

              {filteredSongs.length === 0 && (
                <div className="modal-empty-songs">No matching songs found</div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-confirm">
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
