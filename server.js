import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure directories exist
const songsImgDir = path.join(__dirname, 'public/songsimg');
const songsDir = path.join(__dirname, 'public/songs');

if (!fs.existsSync(songsImgDir)) {
  fs.mkdirSync(songsImgDir, { recursive: true });
}
if (!fs.existsSync(songsDir)) {
  fs.mkdirSync(songsDir, { recursive: true });
}

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));
app.use('/songsimg', express.static(songsImgDir));
app.use('/songs', express.static(songsDir));

// Helper for users JSON path
const usersJsonPath = path.join(__dirname, 'src/page/users.json');

function readUsersFromFile() {
  if (fs.existsSync(usersJsonPath)) {
    try {
      const data = fs.readFileSync(usersJsonPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function writeUsersToFile(users) {
  try {
    fs.writeFileSync(usersJsonPath, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write users to file:", err);
  }
}

// User Routes
app.get('/api/users', (req, res) => {
  try {
    const users = readUsersFromFile();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error reading users' });
  }
});

app.post('/api/users/signup', (req, res) => {
  try {
    const newUser = req.body;
    if (!newUser || !newUser.gmail || !newUser.password) {
      return res.status(400).json({ error: 'Gmail and password are required' });
    }
    const users = readUsersFromFile();
    const cleanGmail = newUser.gmail.trim().toLowerCase();

    // Check if user already exists
    const filtered = users.filter(u => u && u.gmail && u.gmail.toLowerCase() !== cleanGmail);
    const userToSave = {
      isBanned: false,
      unbanRequestReason: "",
      unbanRequestDate: "",
      ...newUser,
      gmail: cleanGmail
    };
    filtered.push(userToSave);
    writeUsersToFile(filtered);
    res.status(200).json({ message: 'User signed up successfully', user: userToSave, users: filtered });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const { gmail, password } = req.body;
    const cleanGmail = (gmail || "").trim().toLowerCase();
    const users = readUsersFromFile();
    const found = users.find(u => u && u.gmail && u.gmail.toLowerCase() === cleanGmail && u.password === password);
    if (!found) {
      return res.status(401).json({ error: 'Invalid Gmail or password' });
    }
    res.status(200).json({ message: 'Login successful', user: found });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.put('/api/users/ban/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const users = readUsersFromFile();
    const updated = users.map(u => u.id === userId ? { ...u, isBanned: true } : u);
    writeUsersToFile(updated);
    res.status(200).json({ message: 'User banned', users: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error banning user' });
  }
});

app.put('/api/users/unban/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const users = readUsersFromFile();
    const updated = users.map(u => u.id === userId ? { ...u, isBanned: false, unbanRequestReason: "", unbanRequestDate: "" } : u);
    writeUsersToFile(updated);
    res.status(200).json({ message: 'User unbanned', users: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error unbanning user' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  try {
    const userId = req.params.id;
    const users = readUsersFromFile();
    const updated = users.filter(u => u.id !== userId);
    writeUsersToFile(updated);
    res.status(200).json({ message: 'User deleted', users: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// Configure storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'image') {
      cb(null, songsImgDir);
    } else if (file.fieldname === 'audio') {
      cb(null, songsDir);
    } else {
      cb(new Error('Invalid fieldname'), null);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage });

// Route to handle song upload
app.post('/api/upload', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), (req, res) => {
  try {
    const { name, singer } = req.body;
    const files = req.files;

    if (!name || !singer) {
      return res.status(400).json({ error: 'Song name and Singer name are required' });
    }

    if (!files || !files.image || !files.audio) {
      return res.status(400).json({ error: 'Both image and audio files are required' });
    }

    const imageFile = files.image[0];
    const audioFile = files.audio[0];

    // Paths relative to public folder (to be served by frontend & express)
    const imagePath = `/songsimg/${imageFile.filename}`;
    const audioPath = `/songs/${audioFile.filename}`;

    // Read existing songs.json
    const songsJsonPath = path.join(__dirname, 'src/page/songs.json');
    let songs = [];
    if (fs.existsSync(songsJsonPath)) {
      const data = fs.readFileSync(songsJsonPath, 'utf-8');
      songs = JSON.parse(data);
    }

    // Find the next available ID
    const newId = songs.length > 0 ? Math.max(...songs.map(s => s.id)) + 1 : 0;

    const newSong = {
      id: newId,
      name,
      singer,
      audio: audioPath,
      img: imagePath
    };

    songs.push(newSong);

    // Save back to songs.json
    fs.writeFileSync(songsJsonPath, JSON.stringify(songs, null, 2), 'utf-8');

    res.status(200).json({ message: 'Song uploaded successfully', song: newSong, songs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error occurred during upload' });
  }
});

// Route to get all songs
app.get('/api/songs', (req, res) => {
  try {
    const songsJsonPath = path.join(__dirname, 'src/page/songs.json');
    let songs = [];
    if (fs.existsSync(songsJsonPath)) {
      const data = fs.readFileSync(songsJsonPath, 'utf-8');
      songs = JSON.parse(data);
    }
    res.status(200).json(songs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error occurred while reading songs list' });
  }
});

// Route to delete a song
app.delete('/api/songs/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const songsJsonPath = path.join(__dirname, 'src/page/songs.json');
    
    if (!fs.existsSync(songsJsonPath)) {
      return res.status(404).json({ error: 'Songs list not found' });
    }

    const data = fs.readFileSync(songsJsonPath, 'utf-8');
    let songs = JSON.parse(data);

    const songIndex = songs.findIndex(s => s.id === id);
    if (songIndex === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const songToDelete = songs[songIndex];

    // Delete associated physical files if they are in the uploaded directory
    if (songToDelete.img && songToDelete.img.startsWith('/songsimg/image-')) {
      const imgFullPath = path.join(__dirname, 'public', songToDelete.img);
      if (fs.existsSync(imgFullPath)) {
        fs.unlinkSync(imgFullPath);
      }
    }
    if (songToDelete.audio && songToDelete.audio.startsWith('/songs/audio-')) {
      const audioFullPath = path.join(__dirname, 'public', songToDelete.audio);
      if (fs.existsSync(audioFullPath)) {
        fs.unlinkSync(audioFullPath);
      }
    }

    // Remove from array
    songs.splice(songIndex, 1);

    // Save back
    fs.writeFileSync(songsJsonPath, JSON.stringify(songs, null, 2), 'utf-8');

    res.status(200).json({ message: 'Song deleted successfully', deletedId: id, songs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error occurred while deleting song' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

