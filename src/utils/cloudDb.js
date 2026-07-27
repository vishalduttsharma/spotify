// Global Cloud Database for syncing registered users across all devices and Vercel hosting
const CLOUD_DB_URL = "https://jsonblob.com/api/jsonBlob/019fa4af-988d-77e1-bed0-56131f0fd0f0";

export async function getCloudUsers() {
  try {
    const res = await fetch(CLOUD_DB_URL, {
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const cloudUsers = await res.json();
      if (Array.isArray(cloudUsers)) {
        // Cache to local storage safely
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("spotify_users", JSON.stringify(cloudUsers));
        }
        return cloudUsers;
      }
    }
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
  // 1. Get existing cloud users
  let currentUsers = [];
  try {
    const res = await fetch(CLOUD_DB_URL, {
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        currentUsers = data;
      }
    }
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
  const updatedUsers = [...filtered, newUser];

  // 2. Save locally safely
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

  // 3. Push to Cloud Database (Accessible by Admin on all devices & Vercel)
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
    const res = await fetch(CLOUD_DB_URL, {
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        currentUsers = data;
      }
    }
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

  // 1. Save locally safely
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("spotify_users", JSON.stringify(updatedUsers));
  }

  // 2. Update Cloud DB
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


