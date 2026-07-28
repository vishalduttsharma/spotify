// Global Cloud Database for syncing registered users across all devices and Vercel hosting
const CLOUD_DB_URL = "https://jsonblob.com/api/jsonBlob/019fa4af-988d-77e1-bed0-56131f0fd0f0";

// Cache-busting fetch wrapper for real-time sync across mobile phones & web
async function fetchCloudUsersData() {
  const cacheBustUrl = `${CLOUD_DB_URL}?t=${Date.now()}`;
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
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("spotify_users", JSON.stringify(data));
      }
      return data;
    }
  }
  throw new Error("Failed to fetch cloud users");
}

export async function getCloudUsers() {
  try {
    return await fetchCloudUsersData();
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
  let currentUsers = [];
  try {
    currentUsers = await fetchCloudUsersData();
  } catch {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("spotify_users");
        currentUsers = saved ? JSON.parse(saved) : [];
      }
    } catch {
      currentUsers = [];
    }
  }

  // Prevent duplicate emails
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

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

  try {
    await fetch(CLOUD_DB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(updatedUsers)
    });
  } catch (err) {
    console.warn("Could not sync user to cloud DB:", err);
  }

  return updatedUsers;
}

export async function deleteUserFromCloud(userId) {
  let currentUsers = [];
  try {
    currentUsers = await fetchCloudUsersData();
  } catch {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("spotify_users");
        currentUsers = saved ? JSON.parse(saved) : [];
      }
    } catch {
      currentUsers = [];
    }
  }

  const updatedUsers = currentUsers.filter((u) => u.id !== userId);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));

    // Clear current session if active user on this device was deleted
    const current = localStorage.getItem("spotify_current_user");
    if (current) {
      try {
        const parsedCurrent = JSON.parse(current);
        if (parsedCurrent && parsedCurrent.id === userId) {
          localStorage.removeItem("spotify_current_user");
        }
      } catch {}
    }
  }

  try {
    await fetch(CLOUD_DB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(updatedUsers)
    });
  } catch (err) {
    console.warn("Could not delete user from cloud DB:", err);
  }

  return updatedUsers;
}

export async function banUserInCloud(userId) {
  let currentUsers = [];
  try {
    currentUsers = await fetchCloudUsersData();
  } catch {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("spotify_users");
        currentUsers = saved ? JSON.parse(saved) : [];
      }
    } catch {
      currentUsers = [];
    }
  }

  const updatedUsers = currentUsers.map((u) => {
    if (u.id === userId) {
      return { ...u, isBanned: true };
    }
    return u;
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

  try {
    await fetch(CLOUD_DB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(updatedUsers)
    });
  } catch (err) {
    console.warn("Could not ban user in cloud DB:", err);
  }

  return updatedUsers;
}

export async function unbanUserInCloud(userId) {
  let currentUsers = [];
  try {
    currentUsers = await fetchCloudUsersData();
  } catch {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("spotify_users");
        currentUsers = saved ? JSON.parse(saved) : [];
      }
    } catch {
      currentUsers = [];
    }
  }

  const updatedUsers = currentUsers.map((u) => {
    if (u.id === userId) {
      return { ...u, isBanned: false, unbanRequestReason: "", unbanRequestDate: "" };
    }
    return u;
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

  try {
    await fetch(CLOUD_DB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(updatedUsers)
    });
  } catch (err) {
    console.warn("Could not unban user in cloud DB:", err);
  }

  return updatedUsers;
}

export async function submitUnbanRequestInCloud(userId, reason) {
  let currentUsers = [];
  try {
    currentUsers = await fetchCloudUsersData();
  } catch {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("spotify_users");
        currentUsers = saved ? JSON.parse(saved) : [];
      }
    } catch {
      currentUsers = [];
    }
  }

  const nowFormatted = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  let updatedTargetUser = null;

  const updatedUsers = currentUsers.map((u) => {
    if (u.id === userId || (u.gmail && u.gmail.toLowerCase() === (userId.gmail || "").toLowerCase())) {
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
    await fetch(CLOUD_DB_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(updatedUsers)
    });
  } catch (err) {
    console.warn("Could not submit unban request to cloud DB:", err);
  }

  return updatedTargetUser;
}

export async function checkUserStatusInCloud(user) {
  if (!user || user.isAdmin) {
    return { exists: true, isBanned: false, userData: user };
  }

  try {
    const cloudUsers = await fetchCloudUsersData();
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
