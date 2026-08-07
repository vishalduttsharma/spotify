import { useState, useEffect } from "react";
import { getAllSongs, resolveAllSongsMedia } from "../utils/songStorage";
import "../css/playlist.css";

export default function AddSongsModal({ isOpen, onClose, playlist, onAddSongs }) {
  const [selectedSongIds, setSelectedSongIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [songsData, setSongsData] = useState([]);

  useEffect(() => {
    if (isOpen) {
      const loadSongs = async () => {
        const raw = getAllSongs();
        const resolved = await resolveAllSongsMedia(raw);
        setSongsData(resolved);
      };
      loadSongs();
    }
  }, [isOpen]);

  if (!isOpen || !playlist) return null;

  // Filter songs that are NOT already in the playlist
  const availableSongs = songsData.filter(
    (song) => !playlist.songIds.includes(song.id)
  );

  const filteredSongs = availableSongs.filter(
    (song) =>
      song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.singer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSongSelection = (id) => {
    setSelectedSongIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSongIds.length > 0) {
      onAddSongs(playlist.id, selectedSongIds);
    }
    setSelectedSongIds([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <div className="playlist-modal-overlay" onClick={onClose}>
      <div className="playlist-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fa-solid fa-plus-circle" style={{ color: "#1DB954", marginRight: "8px" }}></i>
            Add Songs to "{playlist.name}"
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="modal-field">
            <div className="modal-search-box">
              <i className="fa-solid fa-magnifying-glass search-icon"></i>
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search available songs to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                      onChange={() => {}}
                    />
                    <img src={cover} alt={song.name} className="modal-song-img" />
                    <div className="modal-song-details">
                      <div className="modal-song-name">{song.name}</div>
                      <div className="modal-song-singer">{song.singer}</div>
                    </div>
                  </div>
                );
              })}

              {availableSongs.length === 0 && (
                <div className="modal-empty-songs">
                  All available songs are already in this playlist!
                </div>
              )}

              {availableSongs.length > 0 && filteredSongs.length === 0 && (
                <div className="modal-empty-songs">No matching songs found</div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-confirm"
              disabled={selectedSongIds.length === 0}
            >
              Add {selectedSongIds.length > 0 ? `(${selectedSongIds.length})` : ""} Songs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
