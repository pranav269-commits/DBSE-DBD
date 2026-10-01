import {Link} from 'react-router-dom'
export default function TopNav(){return <header className="nav"><Link className="brand" to="/"><span>D</span>DINE</Link><nav><Link to="/kitchen">Kitchen</Link><Link to="/cashier">Cashier</Link><Link to="/admin">Admin</Link><Link to="/presentation">Presentation</Link></nav></header>}
