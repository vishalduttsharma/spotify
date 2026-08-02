import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCloudUsers, saveUserToCloud } from "../utils/cloudDb";
import "../css/auth.css";

export default function AuthModal({ isOpen, onClose, onLoginSuccess, canClose = false }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login" | "admin"
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (mode === "admin") {
      const correctAdminPwd = localStorage.getItem("admin_password") || "vishal@123A";
      if (adminPassword === correctAdminPwd) {
        const adminUser = {
          id: "admin-root",
          name: "Admin",
          username: "administrator",
          gmail: "admin@spotify.com",
          isAdmin: true
        };
        localStorage.setItem("spotify_current_user", JSON.stringify(adminUser));
        onLoginSuccess(adminUser);
        if (onClose) onClose();
        navigate("/admin");
      } else {
        setErrorMsg("Incorrect Admin Password! Access Denied.");
      }
      return;
    }

    const cleanGmail = gmail.trim().toLowerCase();
    const cleanPassword = password.trim();

    setIsSubmitting(true);

    try {
      // Fetch latest global users from Cloud DB or local fallback
      let users = [];
      try {
        users = await getCloudUsers();
      } catch (err) {
        console.warn("Could not fetch cloud users, fallback to local:", err);
        try {
          const local = localStorage.getItem("spotify_users");
          if (local) users = JSON.parse(local);
        } catch { /* empty */ }
      }

      if (mode === "signup") {
        // Validation for Sign Up
        if (!fullName.trim() || !username.trim() || !cleanGmail || !cleanPassword) {
          setErrorMsg("Please fill in all fields to create your account.");
          setIsSubmitting(false);
          return;
        }

        // Check if Gmail already exists globally or locally
        const existingUser = users.find((u) => u && u.gmail && u.gmail.toLowerCase() === cleanGmail);
        if (existingUser) {
          setErrorMsg("Account with this Gmail already exists. Please log in instead.");
          setMode("login");
          setIsSubmitting(false);
          return;
        }

        // Create New User Object
        const newUser = {
          id: `user-${Date.now()}`,
          name: fullName.trim(),
          username: username.trim(),
          gmail: cleanGmail,
          password: cleanPassword,
          createdAt: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        };

        // Save to Cloud DB globally & local storage
        try {
          await saveUserToCloud(newUser);
        } catch (saveErr) {
          console.warn("Saving to cloud failed, using local storage:", saveErr);
          const currentLocal = JSON.parse(localStorage.getItem("spotify_users") || "[]");
          currentLocal.push(newUser);
          localStorage.setItem("spotify_users", JSON.stringify(currentLocal));
        }

        localStorage.setItem("spotify_current_user", JSON.stringify(newUser));
        onLoginSuccess(newUser);
        if (onClose) onClose();
      } else {
        // Log In mode for existing account
        if (!cleanGmail || !cleanPassword) {
          setErrorMsg("Please enter your Gmail and Password.");
          setIsSubmitting(false);
          return;
        }

        let foundUser = users.find(
          (u) => u && u.gmail && u.gmail.toLowerCase() === cleanGmail && u.password === cleanPassword
        );

        if (!foundUser) {
          // Check local storage directly
          try {
            const local = localStorage.getItem("spotify_users");
            if (local) {
              const parsed = JSON.parse(local);
              foundUser = parsed.find(
                (u) => u && u.gmail && u.gmail.toLowerCase() === cleanGmail && u.password === cleanPassword
              );
            }
          } catch { /* empty */ }
        }

        if (!foundUser) {
          setErrorMsg("Invalid Gmail ID or Password. If you don't have an account, please Sign Up.");
          setIsSubmitting(false);
          return;
        }

        localStorage.setItem("spotify_current_user", JSON.stringify(foundUser));
        onLoginSuccess(foundUser);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg("");
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-card">
        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-brand-logo">
            <i className="fa-brands fa-spotify logo-icon"></i>
            <span>Spotify Account</span>
          </div>
          {canClose && onClose ? (
            <button className="auth-close-btn" onClick={onClose} title="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
          ) : (
            <span className="auth-required-badge">
              <i className="fa-solid fa-lock" style={{ marginRight: "4px" }}></i> Login Required
            </span>
          )}
        </div>

        {/* Auth Toggle Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${mode === "signup" ? "active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Create Account
          </button>
          <button
            className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Log In
          </button>
          <button
            className={`auth-tab-btn admin-tab ${mode === "admin" ? "active" : ""}`}
            onClick={() => switchMode("admin")}
          >
            <i className="fa-solid fa-user-gear" style={{ marginRight: "4px" }}></i> Admin
          </button>
        </div>

        {/* Title & Subtitle */}
        <div className="auth-intro">
          <h2>
            {mode === "signup"
              ? "Create your new account"
              : mode === "login"
              ? "Welcome back to Spotify"
              : "Admin Access Studio"}
          </h2>
          <p>
            {mode === "signup"
              ? "Enter your details to create an account on our platform"
              : mode === "login"
              ? "Enter your registered Gmail and password to log in"
              : "Enter your Administrator password for direct Admin Studio access"}
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="auth-error-banner">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form-body">
          {mode === "admin" ? (
            /* Admin Password Mode */
            <div className="auth-field-group">
              <label className="auth-label">Administrator Password</label>
              <div className="auth-input-wrapper">
                <i className="fa-solid fa-key input-icon" style={{ color: "#1DB954" }}></i>
                <input
                  type={showPassword ? "text" : "password"}
                  className="auth-input-field"
                  placeholder="Enter Admin Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>
          ) : (
            /* Normal Signup / Login Mode */
            <>
              {/* Full Name & Username in 1 row for compact mobile height */}
              {mode === "signup" && (
                <div className="auth-field-row">
                  <div className="auth-field-group">
                    <label className="auth-label">Full Name</label>
                    <div className="auth-input-wrapper">
                      <i className="fa-solid fa-user input-icon"></i>
                      <input
                        type="text"
                        className="auth-input-field"
                        placeholder="e.g. Vishal"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <label className="auth-label">Username</label>
                    <div className="auth-input-wrapper">
                      <i className="fa-solid fa-at input-icon"></i>
                      <input
                        type="text"
                        className="auth-input-field"
                        placeholder="e.g. vishal_music"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}


              {/* Gmail ID */}
              <div className="auth-field-group">
                <label className="auth-label">Gmail / Email ID</label>
                <div className="auth-input-wrapper">
                  <i className="fa-solid fa-envelope input-icon"></i>
                  <input
                    type="email"
                    className="auth-input-field"
                    placeholder="name@gmail.com"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="auth-field-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrapper">
                  <i className="fa-solid fa-lock input-icon"></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="auth-input-field"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button type="submit" className={`auth-submit-main-btn ${mode === "admin" ? "admin-submit" : ""}`} disabled={isSubmitting}>
            {isSubmitting ? (
              <span>
                <i className="fa-solid fa-circle-notch fa-spin" style={{ marginRight: "8px" }}></i> Processing...
              </span>
            ) : mode === "signup" ? (
              <>
                <i className="fa-solid fa-user-plus" style={{ marginRight: "8px" }}></i> Create Account
              </>
            ) : mode === "login" ? (
              <>
                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: "8px" }}></i> Log In
              </>
            ) : (
              <>
                <i className="fa-solid fa-shield-halved" style={{ marginRight: "8px" }}></i> Unlock Admin Access
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="auth-footer-prompt">
          {mode === "admin" ? (
            <p>
              Want standard user access?{" "}
              <button type="button" onClick={() => switchMode("signup")}>
                Create Account
              </button>{" "}
              or{" "}
              <button type="button" onClick={() => switchMode("login")}>
                Log In
              </button>
            </p>
          ) : mode === "signup" ? (
            <p>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("login")}>
                Log In here
              </button>
            </p>
          ) : (
            <p>
              Don't have an account yet?{" "}
              <button type="button" onClick={() => switchMode("signup")}>
                Create an Account
              </button>
            </p>
          )}

          {mode !== "admin" && (
            <div className="admin-direct-link-box">
              <button type="button" className="auth-admin-link-btn" onClick={() => switchMode("admin")}>
                <i className="fa-solid fa-user-gear" style={{ marginRight: "6px" }}></i> Direct Admin Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
