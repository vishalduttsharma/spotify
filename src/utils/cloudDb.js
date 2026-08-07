// Global Cloud & Server Database for syncing registered users across all devices, local backend & Vercel
const API_BASE = (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.includes("localhost"))
  ? "http://localhost:5000"
  : (import.meta.env?.VITE_API_URL || "http://localhost:5000");

const DEFAULT_PRIMARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fc365-fec5-7bd7-9692-2f0eab766793";
const DEFAULT_SECONDARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fc366-074b-7887-b017-9a640c5d670d";

function getActiveEndpoints() {
  const list = [DEFAULT_PRIMARY_CLOUD_DB, DEFAULT_SECONDARY_CLOUD_DB];
  try {
    if (typeof localStorage !== "undefined") {
      const dynamicUrl = localStorage.getItem("spotify_dynamic_user_db");
      if (dynamicUrl && !list.includes(dynamicUrl)) {
        list.push(dynamicUrl);
      }
    }
  } catch { /* empty */ }
  return list;
}

// Create a new cloud blob on jsonblob.com if existing endpoints fail
async function createNewCloudBlob(initialUsers = []) {
  try {
    const res = await fetch("https://jsonblob.com/api/jsonBlob", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(initialUsers)
    });
    if (res.ok) {
      const location = res.headers.get("location");
      if (location) {
        const fullUrl = location.startsWith("http") ? location : `https://jsonblob.com${location}`;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("spotify_dynamic_user_db", fullUrl);
        }
        return fullUrl;
      }
    }
  } catch (err) {
    console.warn("Could not create dynamic cloud blob:", err);
  }
  return null;
}

// Normalize user object so gmail/email, password, isBanned are always consistent
function normalizeUser(u) {
  if (!u) return null;
  const gmailVal = (u.gmail || u.email || "").trim().toLowerCase();
  if (!gmailVal) return null;

  return {
    id: u.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: u.name || u.fullName || "Spotify User",
    username: u.username || gmailVal.split("@")[0],
    gmail: gmailVal,
    email: gmailVal,
    password: u.password || "",
    isBanned: Boolean(u.isBanned),
    unbanRequestReason: u.unbanRequestReason || "",
    unbanRequestDate: u.unbanRequestDate || "",
    createdAt: u.createdAt || new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  };
}

// Fetch and merge users from local backend server, cloud DBs, and localStorage
async function fetchAndMergeAllUsers() {
  const cloudUserMap = new Map();
  let fetchedAny = false;

  // 1. Try local backend server first
  try {
    const serverRes = await fetch(`${API_BASE}/api/users`, {
      headers: { "Accept": "application/json" }
    });
    if (serverRes.ok) {
      const serverUsers = await serverRes.json();
      if (Array.isArray(serverUsers) && serverUsers.length > 0) {
        fetchedAny = true;
        serverUsers.forEach((u) => {
          const norm = normalizeUser(u);
          if (norm) cloudUserMap.set(norm.gmail, norm);
        });
      }
    }
  } catch { /* server offline or unreachable */ }

  // 2. Fetch from cloud endpoints
  const endpoints = getActiveEndpoints();
  for (const url of endpoints) {
    try {
      const cacheBustUrl = `${url}?t=${Date.now()}`;
      const res = await fetch(cacheBustUrl, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchedAny = true;
          data.forEach((u) => {
            const norm = normalizeUser(u);
            if (norm) {
              const existing = cloudUserMap.get(norm.gmail);
              // Merge preserving local/server passwords or banned status
              cloudUserMap.set(norm.gmail, {
                ...norm,
                ...(existing || {})
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn(`Fetch from ${url} skipped:`, err);
    }
  }

  // 3. Read local storage users
  let localUsers = [];
  try {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("spotify_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localUsers = parsed;
      }
    }
  } catch { /* empty */ }

  localUsers.forEach((lu) => {
    const norm = normalizeUser(lu);
    if (norm) {
      const existing = cloudUserMap.get(norm.gmail);
      if (!existing) {
        cloudUserMap.set(norm.gmail, norm);
      } else {
        // Merge so password & fields are never lost
        cloudUserMap.set(norm.gmail, {
          ...norm,
          ...existing,
          password: existing.password || norm.password,
          isBanned: existing.isBanned !== undefined ? existing.isBanned : norm.isBanned
        });
      }
    }
  });

  const merged = Array.from(cloudUserMap.values());

  // Save merged array back to local storage
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(merged));
    }
  } catch { /* empty */ }

  // If cloud endpoints failed, auto-create a new cloud blob
  if (!fetchedAny && merged.length > 0) {
    createNewCloudBlob(merged).then((newUrl) => {
      if (newUrl) {
        pushToCloudDb(merged);
      }
    });
  }

  return merged;
}

// Push updated users array to cloud DB endpoints & local server
async function pushToCloudDb(usersArray) {
  // Sync with local backend server if reachable
  try {
    fetch(`${API_BASE}/api/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usersArray[usersArray.length - 1] || {})
    }).catch(() => {});
  } catch { /* empty */ }

  let successCount = 0;
  const endpoints = getActiveEndpoints();

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(usersArray)
      });
      if (res.ok) {
        successCount++;
      }
    } catch (err) {
      console.warn(`Push to ${url} failed:`, err);
    }
  }

  // Always persist locally
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(usersArray));
    }
  } catch { /* empty */ }

  if (successCount === 0) {
    const newUrl = await createNewCloudBlob(usersArray);
    if (newUrl) {
      fetch(newUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usersArray)
      }).catch(() => {});
    }
  }
}

export async function getCloudUsers() {
  try {
    return await fetchAndMergeAllUsers();
  } catch (err) {
    console.warn("Cloud DB fetch failed, using local storage fallback:", err);
  }
  
  try {
    if (typeof localStorage !== "undefined") {
      const local = localStorage.getItem("spotify_users");
      return local ? JSON.parse(local).map(normalizeUser).filter(Boolean) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveUserToCloud(newUser) {
  const normNew = normalizeUser(newUser);
  if (!normNew) return [];

  let currentUsers = [];
  try {
    currentUsers = await fetchAndMergeAllUsers();
  } catch {
    try {
      const local = localStorage.getItem("spotify_users");
      if (local) currentUsers = JSON.parse(local).map(normalizeUser).filter(Boolean);
    } catch { /* empty */ }
  }

  // Try backend signup endpoint first
  try {
    const serverRes = await fetch(`${API_BASE}/api/users/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normNew)
    });
    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.users && Array.isArray(data.users)) {
        currentUsers = data.users.map(normalizeUser).filter(Boolean);
      }
    }
  } catch { /* empty */ }

  // Filter existing user by gmail
  const filtered = currentUsers.filter(
    (u) => u && u.gmail && u.gmail.toLowerCase() !== normNew.gmail
  );

  const updatedUsers = [...filtered, normNew];

  // Save to local storage immediately
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
    }
  } catch { /* empty */ }

  // Sync to Cloud DB
  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Cloud DB sync deferred:", err);
  }

  return updatedUsers;
}

export async function deleteUserFromCloud(userId) {
  const targetId = typeof userId === "object" ? userId.id : userId;
  const targetGmail = typeof userId === "object" ? (userId.gmail || userId.email || "").toLowerCase() : "";

  // Try server delete route
  try {
    if (targetId) {
      await fetch(`${API_BASE}/api/users/${targetId}`, { method: "DELETE" });
    }
  } catch { /* empty */ }

  const currentUsers = await fetchAndMergeAllUsers();

  const updatedUsers = currentUsers.filter((u) => {
    if (u.id === targetId) return false;
    if (targetGmail && u.gmail && u.gmail.toLowerCase() === targetGmail) return false;
    return true;
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));

      const current = localStorage.getItem("spotify_current_user");
      if (current) {
        try {
          const parsedCurrent = JSON.parse(current);
          if (
            parsedCurrent &&
            (parsedCurrent.id === targetId ||
              (targetGmail && parsedCurrent.gmail && parsedCurrent.gmail.toLowerCase() === targetGmail))
          ) {
            localStorage.removeItem("spotify_current_user");
          }
        } catch { /* empty */ }
      }
    }
  } catch { /* empty */ }

  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Error updating cloud DB during deletion:", err);
  }

  return updatedUsers;
}

export async function banUserInCloud(userId) {
  const targetId = typeof userId === "object" ? userId.id : userId;

  try {
    if (targetId) {
      await fetch(`${API_BASE}/api/users/ban/${targetId}`, { method: "PUT" });
    }
  } catch { /* empty */ }

  const currentUsers = await fetchAndMergeAllUsers();

  const updatedUsers = currentUsers.map((u) => {
    if (u.id === targetId || (typeof userId === "object" && u.gmail && u.gmail.toLowerCase() === (userId.gmail || "").toLowerCase())) {
      return { ...u, isBanned: true };
    }
    return u;
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
    }
  } catch { /* empty */ }

  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Cloud ban sync error:", err);
  }

  return updatedUsers;
}

export async function unbanUserInCloud(userId) {
  const targetId = typeof userId === "object" ? userId.id : userId;

  try {
    if (targetId) {
      await fetch(`${API_BASE}/api/users/unban/${targetId}`, { method: "PUT" });
    }
  } catch { /* empty */ }

  const currentUsers = await fetchAndMergeAllUsers();

  const updatedUsers = currentUsers.map((u) => {
    if (u.id === targetId || (typeof userId === "object" && u.gmail && u.gmail.toLowerCase() === (userId.gmail || "").toLowerCase())) {
      return { ...u, isBanned: false, unbanRequestReason: "", unbanRequestDate: "" };
    }
    return u;
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
    }
  } catch { /* empty */ }

  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Cloud unban sync error:", err);
  }

  return updatedUsers;
}

export async function submitUnbanRequestInCloud(userId, reason) {
  const currentUsers = await fetchAndMergeAllUsers();

  const nowFormatted = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  let updatedTargetUser = null;
  const targetId = typeof userId === "object" ? userId.id : userId;

  const updatedUsers = currentUsers.map((u) => {
    if (u.id === targetId || (u.gmail && u.gmail.toLowerCase() === (userId.gmail || "").toLowerCase())) {
      updatedTargetUser = {
        ...u,
        unbanRequestReason: reason,
        unbanRequestDate: nowFormatted
      };
      return updatedTargetUser;
    }
    return u;
  });

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
    }
  } catch { /* empty */ }

  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Unban request cloud sync error:", err);
  }

  return updatedTargetUser;
}

export async function checkUserStatusInCloud(user) {
  if (!user || user.isAdmin) {
    return { exists: true, isBanned: false, userData: user };
  }

  try {
    const cloudUsers = await fetchAndMergeAllUsers();
    const targetGmail = (user.gmail || user.email || "").toLowerCase();
    const found = cloudUsers.find(
      (u) => u.id === user.id || (u.gmail && targetGmail && u.gmail.toLowerCase() === targetGmail)
    );

    if (!found) {
      if (typeof localStorage !== "undefined") {
        const local = localStorage.getItem("spotify_users");
        if (local) {
          const parsed = JSON.parse(local).map(normalizeUser).filter(Boolean);
          const localFound = parsed.find(
            (u) => u.id === user.id || (u.gmail && targetGmail && u.gmail.toLowerCase() === targetGmail)
          );
          if (localFound) {
            return { exists: true, isBanned: Boolean(localFound.isBanned), userData: localFound };
          }
        }
      }
      return { exists: false, isBanned: false, userData: null };
    }

    return {
      exists: true,
      isBanned: Boolean(found.isBanned),
      userData: found
    };
  } catch (err) {
    console.warn("Could not verify user status from cloud DB:", err);
  }

  return { exists: true, isBanned: Boolean(user.isBanned), userData: user };
}
