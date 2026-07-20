import { useState, useEffect } from "react";
import "../css/admin.css";

export default function Admin() {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [songName, setSongName] = useState("");
  const [singerName, setSingerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error" | "info"
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Password & Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const correctPassword = localStorage.getItem("admin_password") || "vishal@123A";
    if (enteredPassword === correctPassword) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect Password. Access Denied!");
    }
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordChangeMessage("Password cannot be empty.");
      return;
    }
    localStorage.setItem("admin_password", newPassword);
    setPasswordChangeMessage("Password updated successfully!");
    setNewPassword("");
    setTimeout(() => {
      setPasswordChangeMessage("");
    }, 3000);
  };

  const fetchSongs = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/songs");
      if (response.ok) {
        const data = await response.json();
        setSongs(data);
      }
    } catch (err) {
      console.error("Error fetching songs:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSongs();
  }, []);

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const removeAudio = () => {
    setAudioFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageFile || !audioFile || !songName || !singerName) {
      setMessage("Please fill all fields and select files.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("Uploading your song to Spotify public directory...");
    setMessageType("info");

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("audio", audioFile);
    formData.append("name", songName);
    formData.append("singer", singerName);

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Song uploaded successfully! Re-indexing song list...");
        setMessageType("success");
        // Reset form
        setSongName("");
        setSingerName("");
        removeImage();
        removeAudio();
        // Reset raw HTML form
        e.target.reset();

        // Update local state
        if (data.song) {
          setSongs((prev) => [...prev, data.song]);
        } else {
          fetchSongs();
        }
      } else {
        setMessage(data.error || "Upload failed.");
        setMessageType("error");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to connect to the backend server. Make sure the Node server is running on port 5000.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (id) => {
    if (!window.confirm("Are you sure you want to delete this song?")) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/songs/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setSongs((prev) => prev.filter((song) => song.id !== id));
        setMessage("Song deleted successfully!");
        setMessageType("success");
      } else {
        setMessage(data.error || "Failed to delete song.");
        setMessageType("error");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to connect to the backend server.");
      setMessageType("error");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-container">
        <div className="admin-auth-card">
          <div className="spotify-logo-container">
            <i className="fa-brands fa-spotify spotify-logo-icon"></i>
          </div>
          <h2 className="auth-title">Admin Access Required</h2>
          <p className="auth-subtitle">Please enter the administrator password to proceed</p>
          
          <form onSubmit={handleAuthSubmit}>
            <div className="auth-form-group">
              <input 
                type="password" 
                className="auth-input" 
                placeholder="Enter Password" 
                value={enteredPassword}
                onChange={(e) => {
                  setEnteredPassword(e.target.value);
                  if (authError) setAuthError("");
                }}
                autoFocus
                required
              />
            </div>
            {authError && <div className="auth-error-msg">{authError}</div>}
            
            <button type="submit" className="auth-submit-btn">
              Verify & Enter
            </button>
          </form>

          <a href="/" className="auth-back-link">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i> Back to Player
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-layout">
        
        {/* Left Side: Uploaded Songs List */}
        <div className="admin-sidebar">
          <div className="sidebar-header">
            <h3 className="sidebar-title">Track Library</h3>
            <span className="sidebar-count">{songs.length} Tracks</span>
          </div>

          <div className="search-bar-container">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search library..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="songs-list-scroll">
            {songs
              .filter(song => 
                song.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                song.singer.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((song) => (
                <div className="admin-song-item" key={song.id}>
                  <img 
                    src={song.img || `/songsimg/${song.id + 1}.png`} 
                    alt={song.name} 
                    className="song-item-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=120&auto=format&fit=crop";
                    }}
                  />
                  <div className="song-item-details">
                    <div className="song-item-name">{song.name}</div>
                    <div className="song-item-singer">{song.singer}</div>
                  </div>
                  <button 
                    className="delete-song-btn" 
                    onClick={() => handleDeleteSong(song.id)}
                    title="Delete track"
                  >
                    <i className="fa-regular fa-trash-can"></i>
                  </button>
                </div>
              ))}
            {songs.length === 0 && (
              <div className="empty-library">
                <i className="fa-solid fa-music empty-icon"></i>
                <p>No tracks in library</p>
              </div>
            )}
            {songs.length > 0 && songs.filter(song => 
              song.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
              song.singer.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && (
              <div className="empty-library">
                <p>No matching tracks found</p>
              </div>
            )}
          </div>

          {/* Change Password Component */}
          <div className="change-password-container">
            <div 
              className="change-password-header"
              onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
            >
              <h4>
                <i className="fa-solid fa-key"></i> Change Password
              </h4>
              <i className={`fa-solid ${isChangePasswordOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
            </div>
            
            {isChangePasswordOpen && (
              <form onSubmit={handlePasswordChange} className="change-password-form">
                <input 
                  type="password" 
                  className="change-password-input" 
                  placeholder="New Password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button type="submit" className="change-password-btn">
                  Update
                </button>
              </form>
            )}
            {passwordChangeMessage && (
              <div className="change-password-success">
                {passwordChangeMessage}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Upload Form Card */}
        <div className="admin-card">
          <h2 className="admin-title">Spotify Creator Studio</h2>
          <p className="admin-subtitle">Publish your track to the music library</p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              {/* Song Name */}
              <div className="form-group">
                <label className="form-label">Song Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Kesariya"
                  value={songName}
                  onChange={(e) => setSongName(e.target.value)}
                  required
                />
              </div>

              {/* Singer Name */}
              <div className="form-group">
                <label className="form-label">Artist / Singer</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g., Arijit Singh"
                  value={singerName}
                  onChange={(e) => setSingerName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              {/* Upload Image */}
              <div className="form-group">
                <label className="form-label">Cover Artwork</label>
                {!imageFile ? (
                  <div className="file-upload-wrapper">
                    <i className="fa-regular fa-image upload-icon"></i>
                    <span className="upload-text">Choose Cover Image</span>
                    <span className="upload-subtext">Supports PNG, JPG, JPEG</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange}
                      className="file-upload-input"
                      required
                    />
                  </div>
                ) : (
                  <div className="cover-preview-container">
                    <img src={imagePreview} alt="Cover Preview" className="cover-preview" />
                    <div className="preview-info">
                      <div className="preview-title">Selected Image</div>
                      <div className="file-selected-name">{imageFile.name}</div>
                    </div>
                    <button type="button" className="remove-file-btn" onClick={removeImage} title="Remove image">
                      <i className="fa-solid fa-circle-xmark"></i>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Audio */}
              <div className="form-group">
                <label className="form-label">Audio / Video File</label>
                {!audioFile ? (
                  <div className="file-upload-wrapper">
                    <i className="fa-solid fa-music upload-icon"></i>
                    <span className="upload-text">Choose Audio / Video File</span>
                    <span className="upload-subtext">Supports MP3, WAV, MP4, etc.</span>
                    <input 
                      type="file" 
                      accept="audio/*,video/*" 
                      onChange={handleAudioChange}
                      className="file-upload-input"
                      required
                    />
                  </div>
                ) : (
                  <div className="cover-preview-container">
                    <div className="cover-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#282828' }}>
                      <i className="fa-solid fa-music" style={{ fontSize: '24px', color: '#1DB954' }}></i>
                    </div>
                    <div className="preview-info">
                      <div className="preview-title">Selected Media</div>
                      <div className="file-selected-name">{audioFile.name}</div>
                    </div>
                    <button type="button" className="remove-file-btn" onClick={removeAudio} title="Remove audio">
                      <i className="fa-solid fa-circle-xmark"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span><i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: '8px' }}></i>Publishing...</span>
              ) : "Publish Track"}
            </button>
          </form>

          {/* Status Messages */}
          {message && (
            <div className={`status-msg ${messageType}`}>
              {messageType === 'success' && <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>}
              {messageType === 'error' && <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '8px' }}></i>}
              {message}
            </div>
          )}

          {/* Back Link */}
          <div className="back-link-container">
            <a href="/" className="back-link">
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>Back to Player
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
