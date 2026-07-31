import defaultSongs from "../page/songs.json";

const STORAGE_KEY = "spotify_custom_songs";
const SONGS_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fb6ec-3bae-7477-bf2f-eba774b0fc0f";

export function getCustomSongs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function fetchCloudSongs() {
  try {
    const res = await fetch(`${SONGS_CLOUD_DB}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn("Could not fetch cloud songs:", err);
  }
  return getCustomSongs();
}

export function getAllSongs() {
  const custom = getCustomSongs();
  return [...defaultSongs, ...custom];
}

export function saveCustomSong(newSong) {
  const current = getCustomSongs();
  const filtered = current.filter((s) => s.id !== newSong.id);
  const updated = [...filtered, newSong];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Async push to Cloud DB
  fetch(SONGS_CLOUD_DB, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(updated)
  }).catch((err) => console.warn("Failed to push custom song to cloud:", err));

  return getAllSongs();
}

export function deleteCustomSong(id) {
  const current = getCustomSongs();
  const updated = current.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Async push to Cloud DB
  fetch(SONGS_CLOUD_DB, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(updated)
  }).catch((err) => console.warn("Failed to push song deletion to cloud:", err));

  return getAllSongs();
}

