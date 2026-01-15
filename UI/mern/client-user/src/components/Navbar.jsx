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
    <nav className="flex justify-between items-center px-6 py-4 bg-blue-700 text-white font-inter shadow-sm">
      <button
        onClick={() => navigate("/pages/admin/control")}
        className="font-bold text-xl tracking-wide hover:text-blue-200 transition"
      >
        Botler Control
      </button>

      {user && (
        <div className="flex items-end gap-6">
          <div className="flex flex-col items-end sm:flex-row sm:items-center sm:gap-6">
            <span className="text-base font-medium">
              {user.username} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="font-semibold text-lg hover:text-blue-200 transition"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default UserNavbar;
