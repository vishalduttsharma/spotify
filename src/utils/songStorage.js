import defaultSongs from "../page/songs.json";
import { storeMedia, getMedia, deleteMedia } from "./idbStorage";

const STORAGE_KEY = "spotify_custom_songs";
const DEFAULT_SONGS_CLOUD_DB = "https://jsonblob.com/api/jsonBlob/019fc366-139b-72ec-8883-74133cbad915";

function getActiveSongEndpoint() {
  try {
    if (typeof localStorage !== "undefined") {
      const dynamicUrl = localStorage.getItem("spotify_dynamic_song_db");
      if (dynamicUrl) return dynamicUrl;
    }
  } catch { /* empty */ }
  return DEFAULT_SONGS_CLOUD_DB;
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
  const endpoint = getActiveSongEndpoint();
  try {
    const res = await fetch(`${endpoint}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Merge cloud custom songs with local custom songs
        const local = getCustomSongs();
        const map = new Map();
        data.forEach(s => s && s.id !== undefined && map.set(String(s.id), s));
        local.forEach(s => s && s.id !== undefined && !map.has(String(s.id)) && map.set(String(s.id), s));

        const merged = Array.from(map.values());
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // If storage full, strip base64 audio before storing metadata
          const lightweight = merged.map(s => ({
            ...s,
            audio: s.audio && s.audio.startsWith("data:") ? `idb:${s.id}` : s.audio,
            img: s.img && s.img.startsWith("data:") ? `idb:${s.id}` : s.img
          }));
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
          } catch { /* empty */ }
        }
        return merged;
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

export async function resolveSongMedia(song) {
  if (!song) return song;
  let resolvedAudio = song.audio;
  let resolvedImg = song.img;

  if (song.audio && song.audio.startsWith("idb:")) {
    const media = await getMedia(song.id);
    if (media && media.audio) {
      resolvedAudio = typeof media.audio === "string" 
        ? media.audio 
        : URL.createObjectURL(media.audio);
    }
  }

  if (song.img && song.img.startsWith("idb:")) {
    const media = await getMedia(song.id);
    if (media && media.img) {
      resolvedImg = typeof media.img === "string" 
        ? media.img 
        : URL.createObjectURL(media.img);
    }
  }

  return {
    ...song,
    audio: resolvedAudio,
    img: resolvedImg
  };
}

export async function saveCustomSong(newSong, audioFile = null, imageFile = null) {
  const current = getCustomSongs();
  const filtered = current.filter((s) => String(s.id) !== String(newSong.id));

  // Store heavy raw files into IndexedDB
  if (audioFile || imageFile) {
    await storeMedia(newSong.id, audioFile || newSong.audio, imageFile || newSong.img);
  }

  // Lightweight metadata record for localStorage & Cloud DB
  const songToStore = {
    ...newSong,
    audio: (audioFile || (newSong.audio && newSong.audio.startsWith("data:"))) ? `idb:${newSong.id}` : newSong.audio,
    img: (imageFile || (newSong.img && newSong.img.startsWith("data:"))) ? `idb:${newSong.id}` : newSong.img
  };

  const updated = [...filtered, songToStore];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("localStorage quota exceeded for metadata, stripped preview:", err);
  }

  // Async push lightweight metadata to Cloud DB
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
  deleteMedia(id);
  const current = getCustomSongs();
  const updated = current.filter((s) => String(s.id) !== String(id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch { /* empty */ }

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
