// Global Cloud Database endpoints for syncing registered users across all devices, mobile phones & Vercel
const PRIMARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fb6eb-ce15-7319-8207-04f197617ee9";
const SECONDARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fb6eb-d0c6-74eb-b556-ce669b00aee7";
const TERTIARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fb6eb-d288-7367-8a3f-0d85f8264fce";

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
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (typeof localStorage !== "undefined") {
            // Merge with local users to ensure no offline signup is lost
            let localUsers = [];
            try {
              const saved = localStorage.getItem("spotify_users");
              if (saved) localUsers = JSON.parse(saved);
            } catch { /* empty */ }

            const userMap = new Map();
            data.forEach((u) => {
              if (u && u.gmail) userMap.set(u.gmail.toLowerCase(), u);
            });
            localUsers.forEach((u) => {
              if (u && u.gmail && !userMap.has(u.gmail.toLowerCase())) {
                userMap.set(u.gmail.toLowerCase(), u);
              }
            });

            const merged = Array.from(userMap.values());
            localStorage.setItem("spotify_users", JSON.stringify(merged));
            return merged;
          }
          return data;
        }
      }
    } catch (err) {
      console.warn(`Fetch from ${url} skipped:`, err);
    }
  }

  // Offline / local storage fallback
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

// Push updated master users array to cloud DB endpoints
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

  // Always persist locally to prevent lost data even if network fails
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(usersArray));
  }

  if (successCount === 0) {
    console.warn("Could not sync user to global Cloud Database endpoints right now. Saved locally.");
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
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

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

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

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

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

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

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

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
      // Check local storage before declaring account non-existent
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

  // Fallback to local
  return { exists: true, isBanned: Boolean(user.isBanned), userData: user };
}

