// Global Cloud Database endpoints for syncing registered users across all devices, mobile phones & Vercel
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

// Auto-create a fresh cloud blob if all endpoints return 404
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

async function fetchAndMergeAllUsers() {
  const endpoints = getActiveEndpoints();
  let fetchedAny = false;
  const cloudUserMap = new Map();

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
            if (u && u.gmail) cloudUserMap.set(u.gmail.toLowerCase(), u);
          });
        }
      }
    } catch (err) {
      console.warn(`Fetch from ${url} skipped:`, err);
    }
  }

  // Retrieve local users
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

  // Merge cloud users with local users (preserving cloud status changes like ban/unban)
  localUsers.forEach((lu) => {
    if (lu && lu.gmail) {
      const gmailKey = lu.gmail.toLowerCase();
      if (!cloudUserMap.has(gmailKey)) {
        cloudUserMap.set(gmailKey, lu);
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

  // If fetching failed from all existing endpoints, auto-create a new cloud blob and push
  if (!fetchedAny && merged.length > 0) {
    createNewCloudBlob(merged).then((newUrl) => {
      if (newUrl) {
        pushToCloudDb(merged);
      }
    });
  }

  return merged;
}

// Push updated master users array to cloud DB endpoints
async function pushToCloudDb(usersArray) {
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

  // Always persist locally to prevent lost data even if network fails
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(usersArray));
    }
  } catch { /* empty */ }

  if (successCount === 0) {
    console.warn("Endpoints offline, creating new cloud blob...");
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
      return local ? JSON.parse(local) : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveUserToCloud(newUser) {
  let currentUsers = [];
  try {
    currentUsers = await fetchAndMergeAllUsers();
  } catch {
    try {
      const local = localStorage.getItem("spotify_users");
      if (local) currentUsers = JSON.parse(local);
    } catch { /* empty */ }
  }

  // Remove existing user with same email (case-insensitive) if any
  const filtered = currentUsers.filter(
    (u) => u && u.gmail && u.gmail.toLowerCase() !== newUser.gmail.toLowerCase()
  );

  const userToSave = {
    isBanned: false,
    unbanRequestReason: "",
    unbanRequestDate: "",
    ...newUser
  };

  const updatedUsers = [...filtered, userToSave];

  // Save to local storage immediately
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
    }
  } catch { /* empty */ }

  // Attempt Cloud DB sync asynchronously / safely
  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Cloud DB sync deferred:", err);
  }

  return updatedUsers;
}

export async function deleteUserFromCloud(userId) {
  const currentUsers = await fetchAndMergeAllUsers();

  const targetId = typeof userId === "object" ? userId.id : userId;
  const targetGmail = typeof userId === "object" ? (userId.gmail || "").toLowerCase() : "";

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
  const currentUsers = await fetchAndMergeAllUsers();
  const targetId = typeof userId === "object" ? userId.id : userId;

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
  const currentUsers = await fetchAndMergeAllUsers();
  const targetId = typeof userId === "object" ? userId.id : userId;

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
    const found = cloudUsers.find(
      (u) => u.id === user.id || (u.gmail && user.gmail && u.gmail.toLowerCase() === user.gmail.toLowerCase())
    );

    if (!found) {
      if (typeof localStorage !== "undefined") {
        const local = localStorage.getItem("spotify_users");
        if (local) {
          const parsed = JSON.parse(local);
          const localFound = parsed.find(
            (u) => u.id === user.id || (u.gmail && user.gmail && u.gmail.toLowerCase() === user.gmail.toLowerCase())
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
