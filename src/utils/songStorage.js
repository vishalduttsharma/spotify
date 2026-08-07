import defaultSongs from "../page/songs.json";
import { storeMedia, getMedia, deleteMedia } from "./idbStorage";

const STORAGE_KEY = "spotify_custom_songs";
const DELETED_IDS_KEY = "spotify_deleted_song_ids";
const DEFAULT_SONGS_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fc366-139b-72ec-8883-74133cbad915";

const API_BASE = (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.includes("localhost"))
  ? "http://localhost:5000"
  : (import.meta.env?.VITE_API_URL || "http://localhost:5000");

function getActiveSongEndpoint() {
  try {
    if (typeof localStorage !== "undefined") {
      const dynamicUrl = localStorage.getItem("spotify_dynamic_song_db");
      if (dynamicUrl) return dynamicUrl;
    }
  } catch { /* empty */ }
  return DEFAULT_SONGS_CLOUD_DB;
}

// Get set of deleted song IDs
export function getDeletedSongIds() {
  try {
    const saved = localStorage.getItem(DELETED_IDS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Save deleted song ID
export function addDeletedSongId(id) {
  try {
    const current = getDeletedSongIds();
    const strId = String(id);
    if (!current.map(String).includes(strId)) {
      const updated = [...current, id];
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(updated));
    }
  } catch { /* empty */ }
}

export function getCustomSongs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function fetchCloudSongs() {
  // 1. Try local server first
  try {
    const serverRes = await fetch(`${API_BASE}/api/songs`, { headers: { "Accept": "application/json" } });
    if (serverRes.ok) {
      const serverSongs = await serverRes.json();
      if (Array.isArray(serverSongs)) {
        return filterAndMergeSongs(serverSongs);
      }
    }
  } catch { /* server offline */ }

  // 2. Try Cloud DB endpoint
  const endpoint = getActiveSongEndpoint();
  try {
    const res = await fetch(`${endpoint}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return filterAndMergeSongs(data);
      }
    }
  } catch (err) {
    console.warn("Could not fetch cloud songs:", err);
  }
  return getAllSongs();
}

function filterAndMergeSongs(fetchedSongs) {
  const local = getCustomSongs();
  const map = new Map();
  fetchedSongs.forEach(s => s && s.id !== undefined && map.set(String(s.id), s));
  local.forEach(s => s && s.id !== undefined && !map.has(String(s.id)) && map.set(String(s.id), s));

  const merged = Array.from(map.values());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch { /* empty */ }
  return getAllSongs();
}

export function getAllSongs() {
  const deletedIds = getDeletedSongIds().map(String);
  const custom = getCustomSongs();

  // Combine default songs & custom songs, excluding deleted IDs
  const combined = [...defaultSongs, ...custom];
  const uniqueMap = new Map();

  combined.forEach((song) => {
    if (song && song.id !== undefined) {
      const strId = String(song.id);
      if (!deletedIds.includes(strId) && !uniqueMap.has(strId)) {
        uniqueMap.set(strId, song);
      }
    }
  });

  return Array.from(uniqueMap.values());
}

export async function resolveSongMedia(song) {
  if (!song) return song;
  let resolvedAudio = song.audio;
  let resolvedImg = song.img;

  if (song.audio && song.audio.startsWith("idb:")) {
    try {
      const media = await getMedia(song.id);
      if (media && media.audio) {
        resolvedAudio = typeof media.audio === "string" 
          ? media.audio 
          : URL.createObjectURL(media.audio);
      }
    } catch { /* empty */ }
  }

  if (song.img && song.img.startsWith("idb:")) {
    try {
      const media = await getMedia(song.id);
      if (media && media.img) {
        resolvedImg = typeof media.img === "string" 
          ? media.img 
          : URL.createObjectURL(media.img);
      }
    } catch { /* empty */ }
  }

  // Fallback for image paths
  if (!resolvedImg) {
    resolvedImg = `/songsimg/${Number(song.id) + 1}.png`;
  }

  return {
    ...song,
    audio: resolvedAudio,
    img: resolvedImg
  };
}

export async function resolveAllSongsMedia(songsList) {
  if (!Array.isArray(songsList)) return [];
  const resolved = await Promise.all(songsList.map((s) => resolveSongMedia(s)));
  return resolved;
}

export async function saveCustomSong(newSong, audioFile = null, imageFile = null) {
  const current = getCustomSongs();
  const filtered = current.filter((s) => String(s.id) !== String(newSong.id));

  // Store raw media files in IndexedDB
  if (audioFile || imageFile) {
    await storeMedia(newSong.id, audioFile || newSong.audio, imageFile || newSong.img);
  }

  const songToStore = {
    ...newSong,
    audio: (audioFile || (newSong.audio && newSong.audio.startsWith("data:"))) ? `idb:${newSong.id}` : newSong.audio,
    img: (imageFile || (newSong.img && newSong.img.startsWith("data:"))) ? `idb:${newSong.id}` : newSong.img
  };

  const updated = [...filtered, songToStore];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("localStorage quota exceeded for metadata:", err);
  }

  // Push to Cloud DB asynchronously
  const endpoint = getActiveSongEndpoint();
  fetch(endpoint, {
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
  return deleteSong(id);
}

export function deleteSong(id) {
  const strId = String(id);

  // 1. Mark ID as deleted
  addDeletedSongId(id);

  // 2. Remove IndexedDB stored media
  deleteMedia(id);

  // 3. Remove from custom songs in localStorage
  const current = getCustomSongs();
  const updated = current.filter((s) => String(s.id) !== strId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* empty */ }

  // 4. Send delete request to backend server if reachable
  try {
    fetch(`${API_BASE}/api/songs/${id}`, { method: "DELETE" }).catch(() => {});
  } catch { /* empty */ }

  // 5. Send delete update to Cloud DB
  const endpoint = getActiveSongEndpoint();
  fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(updated)
  }).catch((err) => console.warn("Failed to push song deletion to cloud:", err));

  return getAllSongs();
}
