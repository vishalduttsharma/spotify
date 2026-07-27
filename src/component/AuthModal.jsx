import { useState } from "react";
import "../css/auth.css";

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState("signup"); // "signup" | "login"
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [gmail, setGmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanGmail = gmail.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Fetch existing users from localStorage
    let users = [];
    try {
      const savedUsers = localStorage.getItem("spotify_users");
      users = savedUsers ? JSON.parse(savedUsers) : [];
    } catch {
      users = [];
    }

    if (mode === "signup") {
      // Validation for Sign Up
      if (!fullName.trim() || !username.trim() || !cleanGmail || !cleanPassword) {
        setErrorMsg("Please fill in all fields to create your account.");
        return;
      }

      // Check if Gmail already exists
      const existingUser = users.find((u) => u.gmail.toLowerCase() === cleanGmail);
      if (existingUser) {
        setErrorMsg("Account with this Gmail already exists. Please log in instead.");
        setMode("login");
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

      const updatedUsers = [...users, newUser];
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
      localStorage.setItem("spotify_current_user", JSON.stringify(newUser));

      onLoginSuccess(newUser);
      onClose();
    } else {
      // Log In mode for existing account
      if (!cleanGmail || !cleanPassword) {
        setErrorMsg("Please enter your Gmail and Password.");
        return;
      }

      const foundUser = users.find(
        (u) => u.gmail.toLowerCase() === cleanGmail && u.password === cleanPassword
      );

      if (!foundUser) {
        setErrorMsg("Invalid Gmail ID or Password. If you don't have an account, please Sign Up.");
        return;
      }

      localStorage.setItem("spotify_current_user", JSON.stringify(foundUser));
      onLoginSuccess(foundUser);
      onClose();
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
          {onClose && (
            <button className="auth-close-btn" onClick={onClose} title="Close">
              <i className="fa-solid fa-xmark"></i>
            </button>
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
        </div>

        {/* Title & Subtitle */}
        <div className="auth-intro">
          <h2>{mode === "signup" ? "Create your new account" : "Welcome back to Spotify"}</h2>
          <p>
            {mode === "signup"
              ? "Enter your details to create an account on our platform"
              : "Enter your registered Gmail and password to log in"}
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
          {/* Full Name (Sign Up only) */}
          {mode === "signup" && (
            <div className="auth-field-group">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrapper">
                <i className="fa-solid fa-user input-icon"></i>
                <input
                  type="text"
                  className="auth-input-field"
                  placeholder="e.g. Vishal Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Username (Sign Up only) */}
          {mode === "signup" && (
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

          {/* Submit Button */}
          <button type="submit" className="auth-submit-main-btn">
            {mode === "signup" ? (
              <>
                <i className="fa-solid fa-user-plus" style={{ marginRight: "8px" }}></i> Create Account
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket" style={{ marginRight: "8px" }}></i> Log In
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div className="auth-footer-prompt">
          {mode === "signup" ? (
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
        </div>
      </div>
    </div>
  );
}
