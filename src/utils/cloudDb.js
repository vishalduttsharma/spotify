// Global Cloud Database endpoints for syncing registered users across all devices, mobile phones & Vercel
const PRIMARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fa7b5-aa76-7e66-ad1e-becc0d56d7fa";
const SECONDARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fa4af-988d-77e1-bed0-56131f0fd0f0";
const TERTIARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fa7c2-1c42-7af9-a036-ba2b79d93734";

// The primary endpoint is the source of truth. Local storage must never be
// merged into a successful cloud response: an old local account would otherwise
// resurrect a deleted account or overwrite an Unban action.
async function fetchAndMergeAllUsers() {
  const endpoints = [PRIMARY_CLOUD_DB, SECONDARY_CLOUD_DB, TERTIARY_CLOUD_DB];

  for (const url of endpoints) {
    try {
      const cacheBustUrl = `${url}?t=${Date.now()}`;
      const res = await fetch(cacheBustUrl, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          // `Pragma` is not permitted by the JSONBlob CORS preflight response.
          // Sending it made every browser on Vercel fall back to its own
          // localStorage, so accounts were invisible on other devices.
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("spotify_users", JSON.stringify(data));
          }
          return data;
        }
      }
    } catch (err) {
      console.warn(`Fetch from ${url} skipped:`, err);
    }
  }

  // Offline fallback only. It is intentionally not merged with cloud data.
  try {
    if (typeof localStorage !== "undefined") {
      const local = localStorage.getItem("spotify_users");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch { /* empty */ }

  return [];
}

// Push updated master users array to ALL cloud DB endpoints to keep every server in sync
async function pushToCloudDb(usersArray) {
  let successCount = 0;
  const endpoints = [PRIMARY_CLOUD_DB, SECONDARY_CLOUD_DB, TERTIARY_CLOUD_DB];

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

  if (successCount === 0) {
    throw new Error("Could not sync user to global Cloud Database. Please check your internet connection.");
  }
}

export async function getCloudUsers() {
  try {
    return await fetchAndMergeAllUsers();
  } catch (err) {
    console.warn("Cloud DB fetch failed, using local storage fallback:", err);
  }
  
  // Local storage fallback
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
  const currentUsers = await fetchAndMergeAllUsers();

  // Remove existing user with same email (case-insensitive) if any
  const filtered = currentUsers.filter(
    (u) => u.gmail && u.gmail.toLowerCase() !== newUser.gmail.toLowerCase()
  );

  const userToSave = {
    isBanned: false,
    unbanRequestReason: "",
    unbanRequestDate: "",
    ...newUser
  };

  const updatedUsers = [...filtered, userToSave];

  // Save master merged list to all cloud DBs
  await pushToCloudDb(updatedUsers);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
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

  // Update all cloud DB endpoints
  try {
    await pushToCloudDb(updatedUsers);
  } catch (err) {
    console.warn("Error updating cloud DB during deletion:", err);
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));

    // Clear current session if active user on this device was deleted
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

  await pushToCloudDb(updatedUsers);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
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

  await pushToCloudDb(updatedUsers);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
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

  await pushToCloudDb(updatedUsers);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
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

  // Fallback to local
  return { exists: true, isBanned: Boolean(user.isBanned), userData: user };
}
