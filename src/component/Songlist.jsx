import '../css/card.css'

export default function Songlist(props) {
  
  return (
    <>
       <div className="song-card" >
      <div className="img-p">
        <img src={props.url} alt="" />
        <div className="cardplay">
          <i className="fa-solid fa-play"></i>
        </div>
      </div>
    
        <h6 className="card-name">{props.name}</h6>
        <p>{props.singer}</p>
    </div>
    </>
  )
}
