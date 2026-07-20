import Songcard from "../component/Songcard"
import Songlist from "../component/Songlist"
import songs from "./songs.json"
import "../css/maincontent.css"
import '../css/musicplayer.css'

export default function Maincontent({ onSongSelect }) {
  return (
    <>
    <div id="maincontent">
<div className="maincontent-nav">
<div className="nav-icon-left">
<button><i className="fa-solid fa-chevron-left"></i></button>
<button id="hide"> <i className="fa-solid fa-chevron-right"></i> </button>
</div>
<div className="nav-icon-right">
  <button  id="hide" style={{backgroundColor:"white", color:"black"}}>Explore premium</button>
  <button><i className="fa-regular fa-circle-down"></i><span>Install App</span></button>
  <a href="/admin"><button><i className="fa-regular fa-add"></i><span>Admin</span></button> </a>
  <button><i className="fa-solid fa-user"></i></button>
</div>
</div>

{/* albums */}

<div className="musice-card">
<div className="top-number-of-songs">
  <h2>Recently played</h2>
  <Songcard/>
</div>
<div className="songs-list">
<h2>Trending now near you</h2>

<div className="songs-list-container">
  {songs.map((iteam,index)=>{
  return <div className="callcard" key={index} onClick={() => onSongSelect(iteam)} style={{ cursor: 'pointer' }}>
     <Songlist  url={iteam.img || `/songsimg/${iteam.id+1}.png`} name={iteam.name} singer={iteam.singer}   /> 
  </div>
  })}
</div>
</div>
</div>
 </div> 
    </>
  )
}
