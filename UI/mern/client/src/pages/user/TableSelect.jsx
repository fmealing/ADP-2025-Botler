import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrCreateOrder } from "../../utils/api";
import { useTTS } from "../../hooks/useTTS";

function TableSelectPage() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { speakAsync } = useTTS({ lang: "en-GB", rate: 1.1 });

  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/tables`, {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
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
      <div className="flex items-center justify-center py-20 text-xl font-inter text-center">
        Loading tables...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center py-20 text-red-600 text-xl font-inter text-center">
        Error: {error}
      </div>
    );

  return (
    <div className="select-none bg-blue-50 py-10 px-6 font-inter text-gray-900 text-center">
      <button
        onClick={() => navigate(-1)}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 mb-6 text-lg self-start text-left block"
      >
        ← Back
      </button>

      <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-10">
        Select Your Table
      </h1>

      <div className="max-w-3xl mx-auto grid gap-8 md:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table._id}
            onClick={async () => {
              try {
                localStorage.setItem("currentTableId", table._id);
                localStorage.setItem("playTableSelectVoice", "1");

                const order = await getOrCreateOrder(table._id, menuId);
                localStorage.setItem("currentOrderId", order._id);
                window.dispatchEvent(new Event("storage"));

                await new Promise((resolve) => setTimeout(resolve, 100));
                navigate(`/menu/${menuId}/table/${table._id}`);
              } catch (err) {
                alert("Error creating order: " + err.message);
              }
            }}
            className={`cursor-pointer select-none border rounded-2xl p-6 shadow-sm transition ${table.isOccupied
              ? "bg-gray-200 text-gray-500 border-gray-300"
              : "bg-white border-blue-100 hover:shadow-md"
              }`}
          >
            <h2 className="text-2xl font-semibold mb-3 text-blue-700">
              Table {table.tableNumber}
            </h2>
            <p className="text-lg text-gray-700">
              {table.isOccupied ? "Occupied" : "Available"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableSelectPage;
