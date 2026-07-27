import defaultSongs from "../page/songs.json";

const STORAGE_KEY = "spotify_custom_songs";

export function getCustomSongs() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function getAllSongs() {
  const custom = getCustomSongs();
  return [...defaultSongs, ...custom];
}

export function saveCustomSong(newSong) {
  const current = getCustomSongs();
  const updated = [...current, newSong];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return getAllSongs();
}

export function deleteCustomSong(id) {
  const current = getCustomSongs();
  const updated = current.filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return getAllSongs();
}
