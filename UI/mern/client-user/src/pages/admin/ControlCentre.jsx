import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ControlCentre() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  if (!user) return null;

  const baseLinks = [
    { label: "Order History", path: "/pages/admin/history" },
    { label: "Track Robots", path: "/pages/admin/tracker" },
    { label: "Assign Tables", path: "/pages/admin/assign" },
  ];

  const adminLinks = [
    { label: "Manage Users", path: "/pages/admin/users" },
  ];

  const links = user.role === "admin" ? [...baseLinks, ...adminLinks] : baseLinks;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/pages/admin/login");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-lg w-[90%] max-w-lg">
        <h1 className="text-3xl font-bold text-indigo-600 mb-2 text-center">
          Control Centre
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Welcome, {user.username} ({user.role})
        </p>

        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              {link.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-6 py-2 rounded-xl border border-indigo-600 text-indigo-600 font-semibold hover:bg-indigo-50 transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

export default ControlCentre;
