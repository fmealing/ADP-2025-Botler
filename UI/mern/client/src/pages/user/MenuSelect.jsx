import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";

function MenuPage() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchMenus() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/menus`);
        if (!res.ok) throw new Error("Failed to get menus");
        const data = await res.json();
        setMenus(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMenus();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading menus...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-xl">
        Error: {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
        Select a Menu
      </h1>

      <div className="max-w-3xl mx-auto grid gap-6 md:grid-cols-2">
        {menus.map((menu) => (
          <div
            key={menu._id}
            onClick={() => navigate(`/menu/${menu._id}/table`)}
            className="cursor-pointer border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition bg-white"
          >
            <h2 className="text-2xl font-semibold mb-2">{menu.name}</h2>
            <p className="text-gray-600">
              {menu.description || "No description available"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MenuPage;
