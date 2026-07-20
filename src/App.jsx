import { useState } from "react";
import Maincontent from "./page/Maincontent";
import Musicplayer from "./page/Musicplayer";
import Sidebar from "./page/Sidebar";
import '../src/css/app.css'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Admin from "./page/Admin";
export default function App() {
  const [currentSong, setCurrentSong] = useState(null);

  return (
    <>
      <div className="main">
       

        <BrowserRouter>
        <Routes>
<Route path="/" element={<><Sidebar/><Maincontent onSongSelect={setCurrentSong} /><Musicplayer currentSong={currentSong} /></>}/>   
          <Route path="/admin" element={<Admin/>}/>
        </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}
