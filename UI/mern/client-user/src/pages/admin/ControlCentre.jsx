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
    <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 px-6 py-10 font-inter text-gray-900">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 w-[90%] max-w-lg">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-blue-700 mb-4">
          Control Centre
        </h1>
        <p className="text-center text-gray-600 mb-10 text-lg">
          Welcome, {user.username} ({user.role})
        </p>

        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold text-lg hover:bg-blue-700 transition"
            >
              {link.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-8 bg-white border border-blue-600 text-blue-700 px-6 py-3 rounded-xl font-semibold text-lg hover:bg-blue-50 transition"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

export default ControlCentre;
