// client-admin/src/pages/admin/TableAssign.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function TableAssign() {
  const navigate = useNavigate();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [headCount, setHeadCount] = useState(1);

  const API_BASE = import.meta.env.VITE_API_URL;

  async function fetchTables() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tables`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch tables");

      setTables(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTables();
  }, []);

  async function handleSeatConfirm() {
    if (!selectedTable) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/tables/${selectedTable._id}/seat`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ headCount }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error seating table");
        return;
      }

      setSeatModalOpen(false);
      setSelectedTable(null);
      setHeadCount(1);

      setTables((prev) =>
        prev.map((t) =>
          t._id === data.table._id ? data.table : t
        )
      );
    } catch (err) {
      alert("Error seating table: " + err.message);
    }
  }

  async function handleLeaveConfirm() {
    if (!selectedTable) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/tables/${selectedTable._id}/leave`,
        {
          method: "PATCH",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Error clearing table");
        return;
      }

      setLeaveModalOpen(false);
      setSelectedTable(null);

      setTables((prev) =>
        prev.map((t) =>
          t._id === data.table._id ? data.table : t
        )
      );
    } catch (err) {
      alert("Error clearing table: " + err.message);
    }
  }

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
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <button
        onClick={() => navigate("/pages/admin/control")}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
      >
        ← Back to Control Centre
      </button>

      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
        Assign Tables
      </h1>

      {/* Seat modal */}
      {seatModalOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-80">
            <h2 className="text-xl font-bold mb-3 text-indigo-700">
              Seat Table {selectedTable.tableNumber}
            </h2>

            <label className="block mb-3">
              <span className="font-semibold">Head count:</span>
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
                onClick={() => {
                  setSeatModalOpen(false);
                  setSelectedTable(null);
                  setHeadCount(1);
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSeatConfirm}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
              >
                Seat Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave modal */}
      {leaveModalOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h2 className="text-xl font-bold mb-3 text-indigo-700">
              Table {selectedTable.tableNumber} has left?
            </h2>
            <p className="text-gray-700 mb-4">
              This will mark the table as available and archive its latest order.
            </p>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setLeaveModalOpen(false);
                  setSelectedTable(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table cards */}
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table._id}
            className={`border rounded-2xl p-6 shadow-sm transition ${table.isOccupied
                ? "bg-gray-200 text-gray-700"
                : "bg-white hover:shadow-lg"
              }`}
          >
            <h2 className="text-2xl font-semibold mb-2">
              Table {table.tableNumber}
            </h2>
            <p className="text-gray-600 mb-1">
              Status:{" "}
              {table.isOccupied ? (
                <span className="font-semibold text-red-600">Occupied</span>
              ) : (
                <span className="font-semibold text-green-600">Available</span>
              )}
            </p>
            <p className="text-gray-600 mb-4">
              Head count:{" "}
              {table.isOccupied ? table.headCount ?? "Unknown" : "-"}
            </p>

            {table.isOccupied ? (
              <button
                onClick={() => {
                  setSelectedTable(table);
                  setLeaveModalOpen(true);
                }}
                className="w-full py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Table has left
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedTable(table);
                  setHeadCount(1);
                  setSeatModalOpen(true);
                }}
                className="w-full py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Seat table
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TableAssign;
