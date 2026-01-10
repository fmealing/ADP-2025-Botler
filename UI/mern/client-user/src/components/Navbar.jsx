import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

function UserNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    else setUser(null);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/pages/admin/login");
  };

  return (
    <nav className="flex justify-between items-center bg-indigo-600 text-white px-6 py-3 shadow-md">
      <button
        onClick={() => navigate("/pages/admin/control")}
        className="text-xl font-bold hover:text-indigo-200 transition"
      >
        Botler Control
      </button>

      {user && (
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium">
            {user.username} ({user.role})
          </span>
          <button
            onClick={handleLogout}
            className="bg-white text-indigo-600 font-semibold px-3 py-1 rounded-xl hover:bg-indigo-100 transition"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

export default UserNavbar;
