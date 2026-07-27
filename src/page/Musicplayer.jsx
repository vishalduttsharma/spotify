import { useEffect, useRef, useState } from "react";
import "../css/musicplayer.css";

export default function Musicplayer({ currentSong }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(0.8);

  // Sync play state when currentSong changes
  useEffect(() => {
    if (audioRef.current && currentSong) {
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.log("Playback interrupted or autoplay blocked:", err);
          setIsPlaying(false);
        });
    }
  }, [currentSong]);

  // Play / Pause toggle
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => console.log(err));
    }
  };

  // Time update handler
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Loaded metadata (duration) handler
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle song end
  const handleSongEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Seek handler
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // Volume change handler
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      audioRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  };

  // Mute toggle handler
  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      audioRef.current.volume = prevVolume;
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      audioRef.current.muted = true;
      audioRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  // Format time (seconds -> mm:ss)
  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const coverUrl = currentSong 
    ? (currentSong.img || `/songsimg/${currentSong.id + 1}.png`) 
    : "/songsimg/1.png";
  const songName = currentSong ? currentSong.name : "Kesariya";
  const songSinger = currentSong ? currentSong.singer : "Arijit Singh";
  const audioSrc = currentSong ? currentSong.audio : "/songs/1.mp3";

  const progressPercent = (currentTime / (duration || 100)) * 100;

  return (
    <div id="musicplayer">
      {/* Mobile Top Thin Progress Line */}
      <div className="mobile-top-progress">
        <div 
          className="mobile-top-progress-fill" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleSongEnded}
      />

      <div className="player-content">
        {/* Left Section: Song Details with Cover Image */}
        <div className="player-song-details">
          <div className="player-cover">
            <img src={coverUrl} alt="cover" />
          </div>
          <div className="player-info">
            <div className="player-song-name">{songName}</div>
            <div className="player-song-singer">{songSinger}</div>
          </div>
          <button 
            className={`like-btn ${isLiked ? 'liked' : ''}`} 
            onClick={() => setIsLiked(!isLiked)}
            aria-label="Like song"
          >
            {isLiked ? (
              <i className="fa-solid fa-heart"></i>
            ) : (
              <i className="fa-regular fa-heart"></i>
            )}
          </button>
        </div>

        {/* Middle Section: Custom Playback Controls */}
        <div className="player-controls-container">
          <div className="player-buttons">
            <button className="control-btn grey-btn hide-mobile" aria-label="Shuffle">
              <i className="fa-solid fa-shuffle"></i>
            </button>
            <button className="control-btn" aria-label="Previous track">
              <i className="fa-solid fa-backward-step"></i>
            </button>
            <button className="play-pause-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? (
                <i className="fa-solid fa-pause"></i>
              ) : (
                <i className="fa-solid fa-play" style={{ marginLeft: "2px" }}></i>
              )}
            </button>
            <button className="control-btn" aria-label="Next track">
              <i className="fa-solid fa-forward-step"></i>
            </button>
            <button className="control-btn grey-btn hide-mobile" aria-label="Repeat">
              <i className="fa-solid fa-repeat"></i>
            </button>
          </div>

          <div className="progress-container">
            <span className="time">{formatTime(currentTime)}</span>
            <div className="progress-slider-wrapper">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="progress-bar-slider"
              />
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Section: Volume & Utilities */}
        <div className="player-utilities">
          <button className="utility-btn hide-mobile" aria-label="Lyrics">
            <i className="fa-solid fa-microphone"></i>
          </button>
          <button className="utility-btn hide-mobile" aria-label="Queue">
            <i className="fa-solid fa-list-ul"></i>
          </button>
          <div className="volume-control">
            <button className="utility-btn" onClick={toggleMute} aria-label="Mute / Unmute">
              {isMuted || volume === 0 ? (
                <i className="fa-solid fa-volume-xmark" style={{ color: "#1db954" }}></i>
              ) : volume < 0.4 ? (
                <i className="fa-solid fa-volume-low"></i>
              ) : (
                <i className="fa-solid fa-volume-high"></i>
              )}
            </button>
            <div className="volume-slider-wrapper">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
              <div 
                className="volume-bar-fill" 
                style={{ width: `${volume * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
