import '../css/sidebar.css';

export default function Libbox(props) {
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{props.title}</h5>
        <p>{props.discription}</p>
        <button className='lib-btn' onClick={props.onBtnClick}>
          {props.btnname}
        </button>
      </div>
    </div>
  );
}
