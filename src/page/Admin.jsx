import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllSongs, saveCustomSong, deleteSong, resolveAllSongsMedia } from "../utils/songStorage";
import { getCloudUsers, deleteUserFromCloud, banUserInCloud, unbanUserInCloud } from "../utils/cloudDb";
import "../css/admin.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

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

  // Registered User Data (userdata) state
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("spotify_users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const refreshUsers = async () => {
    setIsRefreshingUsers(true);
    try {
      const cloudUsers = await getCloudUsers();
      setRegisteredUsers(cloudUsers);
    } catch (err) {
      console.error("Failed to fetch cloud users:", err);
    } finally {
      setIsRefreshingUsers(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchLiveUsers = async () => {
      try {
        const cloudUsers = await getCloudUsers();
        if (isMounted) setRegisteredUsers(cloudUsers);
      } catch (err) {
        console.error("Failed to fetch cloud users:", err);
      }
    };

    fetchLiveUsers();
    const interval = setInterval(fetchLiveUsers, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user account?")) {
      const updated = await deleteUserFromCloud(userId);
      setRegisteredUsers(updated);
    }
  };

  const handleBanUser = async (userId) => {
    if (window.confirm("Are you sure you want to BAN this user account?")) {
      const updated = await banUserInCloud(userId);
      setRegisteredUsers(updated);
    }
  };

  const handleUnbanUser = async (userId) => {
    if (window.confirm("Are you sure you want to UNBAN this user account?")) {
      const updated = await unbanUserInCloud(userId);
      setRegisteredUsers(updated);
    }
  };


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
      const response = await fetch(`${API_BASE}/api/songs`);
      if (response.ok) {
        const data = await response.json();
        const resolved = await resolveAllSongsMedia(data);
        setSongs(resolved);
        return;
      }
    } catch (err) {
      console.warn("Backend server not reachable, using local storage songs:", err);
    }
    const local = getAllSongs();
    const resolved = await resolveAllSongsMedia(local);
    setSongs(resolved);
  };

  useEffect(() => {
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
    setMessage("Publishing your song to music library...");
    setMessageType("info");

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("audio", audioFile);
    formData.append("name", songName);
    formData.append("singer", singerName);

    try {
      const response = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setMessage("Song uploaded successfully to backend!");
        setMessageType("success");
        setSongName("");
        setSingerName("");
        removeImage();
        removeAudio();
        e.target.reset();

        await fetchSongs();
        return;
      }
      throw new Error("Backend server not responding");
    } catch {
      // Vercel / Client-side Fallback using IndexedDB & Cloud Sync
      try {
        const newSong = {
          id: Date.now(),
          name: songName,
          singer: singerName,
          img: `idb:${Date.now()}`,
          audio: `idb:${Date.now()}`
        };

        const updated = await saveCustomSong(newSong, audioFile, imageFile);
        const resolved = await resolveAllSongsMedia(updated);
        setSongs(resolved);

        setMessage("Track published successfully to Spotify library!");
        setMessageType("success");
        setSongName("");
        setSingerName("");
        removeImage();
        removeAudio();
        e.target.reset();
      } catch (localErr) {
        console.error(localErr);
        setMessage("Failed to process media files.");
        setMessageType("error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (id) => {
    if (!window.confirm("Are you sure you want to delete this song?")) {
      return;
    }

    const updated = deleteSong(id);
    const resolved = await resolveAllSongsMedia(updated);
    setSongs(resolved);
    setMessage("Song deleted successfully!");
    setMessageType("success");
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

          <Link to="/" className="auth-back-link">
            <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i> Back to Player
          </Link>
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
            <Link to="/" className="back-link">
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '8px' }}></i>Back to Player
            </Link>
          </div>

          {/* User Data (userdata) Card */}
          <div className="userdata-card">
            <div className="userdata-header">
              <h3 className="userdata-title">
                <i className="fa-solid fa-users"></i> Registered User Data (userdata)
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={refreshUsers}
                  className="pwd-toggle-btn"
                  title="Sync latest users from cloud database"
                  style={{ fontSize: "14px", color: "#1DB954", cursor: "pointer", background: "none", border: "none" }}
                >
                  <i className={`fa-solid fa-rotate ${isRefreshingUsers ? "fa-spin" : ""}`}></i> Sync DB
                </button>
                <span className="userdata-count">{registeredUsers.length} Accounts</span>
              </div>
            </div>

            <div className="userdata-list-scroll">
              {registeredUsers.map((user) => {
                const isPwdVisible = visiblePasswords[user.id];
                const isBanned = Boolean(user.isBanned);
                return (
                  <div key={user.id} className={`userdata-item ${isBanned ? "banned-item" : ""}`} style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "12px" }}>
                      <div className="userdata-avatar" style={{ backgroundColor: isBanned ? "#ff4d4d" : "#1DB954" }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="userdata-info" style={{ flex: 1 }}>
                        <div className="userdata-name-row" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span className="userdata-fullname">{user.name}</span>
                          <span className="userdata-username">@{user.username}</span>
                          {isBanned ? (
                            <span style={{
                              backgroundColor: "#ff4d4d",
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: "bold",
                              padding: "2px 8px",
                              borderRadius: "4px"
                            }}>
                              <i className="fa-solid fa-ban" style={{ marginRight: "4px" }}></i> BANNED
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: "#1e3a29",
                              color: "#1DB954",
                              fontSize: "11px",
                              fontWeight: "bold",
                              padding: "2px 8px",
                              borderRadius: "4px"
                            }}>
                              <i className="fa-solid fa-circle-check" style={{ marginRight: "4px" }}></i> ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="userdata-meta-row">
                          <span className="userdata-gmail">
                            <i className="fa-solid fa-envelope"></i> {user.gmail}
                          </span>
                          <span className="userdata-password">
                            <i className="fa-solid fa-lock"></i>{" "}
                            {isPwdVisible ? user.password : "••••••••"}
                            <button
                              type="button"
                              className="pwd-toggle-btn"
                              onClick={() => togglePasswordVisibility(user.id)}
                              title={isPwdVisible ? "Hide password" : "Show password"}
                            >
                              <i className={`fa-solid ${isPwdVisible ? "fa-eye-slash" : "fa-eye"}`}></i>
                            </button>
                          </span>
                          {user.createdAt && (
                            <span className="userdata-date">• {user.createdAt}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isBanned ? (
                          <button
                            className="userdata-unban-btn"
                            title="Unban this user account"
                            onClick={() => handleUnbanUser(user.id)}
                            style={{
                              backgroundColor: "#1DB954",
                              color: "#fff",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <i className="fa-solid fa-user-check"></i> Unban
                          </button>
                        ) : (
                          <button
                            className="userdata-ban-btn"
                            title="Ban this user account"
                            onClick={() => handleBanUser(user.id)}
                            style={{
                              backgroundColor: "#ff4d4d",
                              color: "#fff",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <i className="fa-solid fa-user-slash"></i> Ban
                          </button>
                        )}

                        <button
                          className="userdata-delete-btn"
                          title="Delete user account permanently"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </div>

                    {/* Show Unban Reason Box if User Submitted an Appeal */}
                    {isBanned && user.unbanRequestReason && (
                      <div style={{
                        backgroundColor: "rgba(255, 77, 77, 0.1)",
                        border: "1px solid #ff4d4d",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        marginTop: "4px",
                        width: "100%"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", color: "#ff6b6b", fontWeight: "bold" }}>
                            <i className="fa-solid fa-envelope-open-text" style={{ marginRight: "6px" }}></i>
                            Unban Request Reason from @{user.username}:
                          </span>
                          {user.unbanRequestDate && (
                            <span style={{ fontSize: "11px", color: "#aaa" }}>
                              {user.unbanRequestDate}
                            </span>
                          )}
                        </div>
                        <p style={{ color: "#fff", fontSize: "13px", fontStyle: "italic", margin: "4px 0 8px 0" }}>
                          "{user.unbanRequestReason}"
                        </p>
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          style={{
                            backgroundColor: "#1DB954",
                            color: "#fff",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                        >
                          <i className="fa-solid fa-check" style={{ marginRight: "4px" }}></i> Approve & Unban User
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {registeredUsers.length === 0 && (
                <div className="empty-library" style={{ padding: "20px" }}>
                  <i className="fa-solid fa-user-slash empty-icon"></i>
                  <p>No registered user accounts yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
