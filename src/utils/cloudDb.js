// Global Cloud Database endpoints for syncing registered users across all devices, mobile phones & Vercel
const PRIMARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fa7b5-aa76-7e66-ad1e-becc0d56d7fa";
const SECONDARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fa4af-988d-77e1-bed0-56131f0fd0f0";
const TERTIARY_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fa7c2-1c42-7af9-a036-ba2b79d93734";

// Helper: Safely merge multiple lists of users by unique Gmail (or ID) without losing any registered user
function mergeUsersLists(...lists) {
  const userMap = new Map();

  for (const list of lists) {
    if (Array.isArray(list)) {
      for (const user of list) {
        if (user && (user.gmail || user.id)) {
          const key = user.gmail ? user.gmail.toLowerCase() : user.id;
          if (!userMap.has(key)) {
            userMap.set(key, user);
          } else {
            // Combine fields, keeping ban status / appeal data if present
            const existing = userMap.get(key);
            userMap.set(key, {
              ...existing,
              ...user,
              isBanned: Boolean(user.isBanned || existing.isBanned),
              unbanRequestReason: user.unbanRequestReason || existing.unbanRequestReason || "",
              unbanRequestDate: user.unbanRequestDate || existing.unbanRequestDate || ""
            });
          }
        }
      }
    }
  }

  return Array.from(userMap.values());
}

// Fetch from ALL endpoints & local storage, merging into one master user array
async function fetchAndMergeAllUsers() {
  const endpoints = [PRIMARY_CLOUD_DB, SECONDARY_CLOUD_DB, TERTIARY_CLOUD_DB];
  const fetchedLists = [];

  for (const url of endpoints) {
    try {
      const cacheBustUrl = `${url}?t=${Date.now()}`;
      const res = await fetch(cacheBustUrl, {
        method: "GET",
        cache: "no-store",
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchedLists.push(data);
        }
      }
    } catch (err) {
      console.warn(`Fetch from ${url} skipped:`, err);
    }
  }

  // Include local storage fallback data in merge
  try {
    if (typeof localStorage !== "undefined") {
      const local = localStorage.getItem("spotify_users");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          fetchedLists.push(parsed);
        }
      }
    }
  } catch { /* empty */ }

  const mergedUsers = mergeUsersLists(...fetchedLists);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(mergedUsers));
  }

  return mergedUsers;
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
