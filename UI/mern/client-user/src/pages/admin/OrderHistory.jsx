import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrCreateOrder } from "../../utils/api";

function TableSelectPage() {
  const { menuId } = useParams();
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTable, setSelectedTable] = useState(null);
  const [headCount, setHeadCount] = useState(1);
  const [showSeatModal, setShowSeatModal] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));
  const isStaff = user?.role === "staff" || user?.role === "admin";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading tables...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-xl">
        Error: {error}
      </div>
    );
  }

  async function handleSeatTable() {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/tables/${selectedTable._id}/seat`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            headCount,
            menu: menuId,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem("currentOrderId", data.order._id);

      setShowSeatModal(false);

      navigate(`pages/admin/menu/${menuId}/table/${selectedTable._id}`);
    } catch (err) {
      alert("Error seating table: " + err.message);
    }
  }

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

      {showSeatModal && selectedTable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h2 className="text-xl font-bold mb-3 text-indigo-700">
              Seat Table {selectedTable.tableNumber}
            </h2>

            <label className="block mb-3">
              <span className="font-semibold">Head Count:</span>
              <input
                type="number"
                min="1"
                value={headCount}
                onChange={(e) => setHeadCount(Number(e.target.value))}
                className="w-full border p-2 rounded-lg mt-1"
              />
            </label>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowSeatModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={handleSeatTable}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Confirm Seating
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto grid gap-6 md:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table._id}
            onClick={async () => {
              if (isStaff) {
                setSelectedTable(table);
                setShowSeatModal(true);
                return;
              }

              try {
                const order = await getOrCreateOrder(table._id, menuId);
                localStorage.setItem("currentOrderId", order._id);
                navigate(`/menu/${menuId}/table/${table._id}`);
              } catch (err) {
                alert("Error creating order: " + err.message);
              }
            }}
            className={`cursor-pointer border rounded-2xl p-6 shadow-sm transition ${
              table.isOccupied
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
    </div>
  );
}

export default TableSelectPage;
