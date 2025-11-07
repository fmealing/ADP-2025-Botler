import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrCreateOrder } from "../../utils/api"; // ✅ added

function TableSelectPage() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/tables`, {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"), // optional
          },
        });
        if (!res.ok) throw new Error("Failed to fetch tables");
        const data = await res.json();
        setTables(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTables();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading tables...
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
      <button
        onClick={() => navigate(-1)}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
      >
        ← Back
      </button>

      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
        Select Your Table
      </h1>

      <div className="max-w-3xl mx-auto grid gap-6 md:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table._id}
            onClick={async () => { // ✅ replaced broken inline handler
              try {
                const order = await getOrCreateOrder(table._id, menuId);
                localStorage.setItem("currentOrderId", order._id);
                navigate(`/menu/${menuId}/table/${table._id}`);
              } catch (err) {
                alert("Error creating order: " + err.message);
              }
            }}
            className={`cursor-pointer border rounded-2xl p-6 shadow-sm transition ${table.isOccupied
              ? "bg-gray-200 text-gray-500"
              : "bg-white hover:shadow-lg"
              }`}
          >
            <h2 className="text-2xl font-semibold mb-2">
              Table {table.tableNumber}
            </h2>
            <p className="text-gray-600">
              {table.isOccupied ? "Occupied" : "Available"}
            </p>
          </div>
        ))}
      </div>
    </div >
  );
}

export default TableSelectPage;
