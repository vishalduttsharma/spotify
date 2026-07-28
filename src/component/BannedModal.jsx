import { useState } from "react";
import { submitUnbanRequestInCloud } from "../utils/cloudDb";
import "../css/auth.css";

export default function BannedModal({ currentUser, onLogout, onUserUpdated }) {
  const [reasonText, setReasonText] = useState(currentUser?.unbanRequestReason || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!currentUser || !currentUser.isBanned) return null;

  const handleSubmitReason = async (e) => {
    e.preventDefault();
    if (!reasonText.trim()) {
      setErrorMsg("Please enter your reason for unban request.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const updatedUser = await submitUnbanRequestInCloud(currentUser.id, reasonText.trim());
      if (updatedUser) {
        setSuccessMsg("Your unban request has been sent to Admin (Vishal Dutt Sharma) successfully!");
        if (onUserUpdated) {
          onUserUpdated(updatedUser);
        }
      } else {
        setSuccessMsg("Unban request submitted!");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to send request. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-overlay" style={{ zIndex: 99999 }}>
      <div className="auth-modal-card banned-card" style={{ maxWidth: "520px", border: "1px solid #ff4d4d" }}>
        
        {/* Header */}
        <div className="auth-modal-header" style={{ borderBottom: "1px solid #333" }}>
          <div className="auth-brand-logo">
            <i className="fa-solid fa-ban" style={{ color: "#ff4d4d", fontSize: "24px" }}></i>
            <span style={{ color: "#ff4d4d", fontWeight: "bold" }}>Account Suspended</span>
          </div>
          <button className="auth-close-btn" onClick={onLogout} title="Logout account">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>

        {/* Banner Announcement */}
        <div style={{
          backgroundColor: "rgba(255, 77, 77, 0.12)",
          border: "1px solid rgba(255, 77, 77, 0.3)",
          borderRadius: "8px",
          padding: "16px",
          marginTop: "16px",
          marginBottom: "16px",
          textAlign: "center"
        }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "36px", color: "#ff4d4d", marginBottom: "10px", display: "block" }}></i>
          <h2 style={{ color: "#fff", fontSize: "18px", marginBottom: "8px" }}>
            Your account has been banned by the owner Vishal Dutt Sharma
          </h2>
          <p style={{ color: "#b3b3b3", fontSize: "13px", lineHeight: "1.5" }}>
            You cannot access music or playlists while your account is suspended.
          </p>
        </div>

        {/* Previously Submitted Request Box */}
        {currentUser.unbanRequestReason && !successMsg && (
          <div style={{
            backgroundColor: "#181818",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "16px"
          }}>
            <div style={{ fontSize: "12px", color: "#1DB954", fontWeight: "600", marginBottom: "6px" }}>
              <i className="fa-solid fa-paper-plane" style={{ marginRight: "6px" }}></i>
              Submitted Appeal (Sent to Vishal Dutt Sharma):
            </div>
            <p style={{ color: "#e0e0e0", fontSize: "13px", fontStyle: "italic", margin: 0 }}>
              "{currentUser.unbanRequestReason}"
            </p>
            {currentUser.unbanRequestDate && (
              <div style={{ fontSize: "11px", color: "#888", marginTop: "6px", textAlign: "right" }}>
                Date: {currentUser.unbanRequestDate}
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div className="auth-error-banner" style={{ backgroundColor: "#1e3a29", borderColor: "#1DB954", color: "#1DB954", marginBottom: "16px" }}>
            <i className="fa-solid fa-circle-check"></i>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="auth-error-banner" style={{ marginBottom: "16px" }}>
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form to submit / edit unban reason */}
        <form onSubmit={handleSubmitReason}>
          <div className="auth-field-group">
            <label className="auth-label" style={{ color: "#fff", fontWeight: "600" }}>
              If you want to unban your account, please write your reason below:
            </label>
            <textarea
              className="auth-input-field"
              rows={4}
              placeholder="Write your explanation or request here..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "6px",
                border: "1px solid #444",
                backgroundColor: "#121212",
                color: "#fff",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "14px"
              }}
              required
            />
          </div>

          <button 
            type="submit" 
            className="auth-submit-main-btn"
            disabled={isSubmitting}
            style={{
              backgroundColor: "#ff4d4d",
              color: "#fff",
              marginTop: "12px",
              fontWeight: "bold"
            }}
          >
            {isSubmitting ? (
              <span><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }}></i> Sending Request...</span>
            ) : (
              <span><i className="fa-solid fa-paper-plane" style={{ marginRight: "8px" }}></i> Submit Unban Request to Vishal Dutt Sharma</span>
            )}
          </button>
        </form>

        {/* Switch account button */}
        <div style={{ marginTop: "16px", textAlign: "center" }}>
          <button
            type="button"
            onClick={onLogout}
            style={{
              background: "none",
              border: "none",
              color: "#b3b3b3",
              fontSize: "13px",
              cursor: "pointer",
              textDecoration: "underline"
            }}
          >
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: "6px" }}></i>
            Log out & switch to another account
          </button>
        </div>

      </div>
    </div>
  );
}
