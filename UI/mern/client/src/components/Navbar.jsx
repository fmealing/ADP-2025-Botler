import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="flex justify-between p-4 bg-indigo-600 text-white">
      <Link to="/">Home</Link>
      <Link to="/menu">Menu</Link>
    </nav>
  );
}

export default Navbar;
