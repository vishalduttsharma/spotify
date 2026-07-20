import Libbox from '../component/Libbox'
import '../css/sidebar.css'
export default function Sidebar() {
  return (
   <>
   <div id="sidebar">
  <div className="navpart">
    <div className="nav-option"><i className="fa-solid fa-house"></i> <a href="#" style={{opacity:"1"}}>Home</a></div>
    <div className="nav-option"> <i className="fa-solid fa-magnifying-glass"></i><a href="#"> Search</a></div>
  </div>

  <div className="library">
<div className="lib-option">
    <div className="lib-option-left">
           <i className="fa-solid fa-bars"></i>
        <a href="#"> Your Library</a>
        </div>



    <div className="lib-option-right">
        <i className="fa-solid fa-plus"></i>
        <i className="fa-solid fa-arrow-right"></i>
    </div>

</div>

 <div className="lib-box">
   <Libbox  title="Create your first playlist" discription="it's easy we'll help you" btnname="Create playlist"/>
  <Libbox  title="Let's find some podcaste to follow" discription="we'll keep you update on new episodes " btnname="Browse podcaste"/>

 </div>

  </div>
   </div>
   </>
  )
}
