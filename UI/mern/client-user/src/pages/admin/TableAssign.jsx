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
      <div className="flex items-center justify-center h-screen text-xl font-inter text-center">
        Loading tables...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-xl font-inter text-center">
        Error: {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-blue-50 py-10 px-6 font-inter text-gray-900 text-center">
      <button
        onClick={() => navigate("/pages/admin/control")}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 mb-6 text-lg self-start text-left block"
      >
        ← Back to Control Centre
      </button>

      <h1 className="text-4xl md:text-5xl font-bold text-center text-blue-700 mb-10">
        Assign Tables
      </h1>

      {/* Seat modal */}
      {seatModalOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 w-full max-w-sm text-left">
            <h2 className="text-2xl font-bold mb-6 text-blue-700">
              Seat Table {selectedTable.tableNumber}
            </h2>

            <label className="block mb-6">
              <span className="font-semibold text-lg">Head count:</span>
              <input
                type="number"
                min="1"
                value={headCount}
                onChange={(e) => setHeadCount(Number(e.target.value))}
                className="w-full border border-blue-100 p-4 rounded-xl mt-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </label>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setSeatModalOpen(false);
                  setSelectedTable(null);
                  setHeadCount(1);
                }}
                className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSeatConfirm}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-lg font-semibold transition"
              >
                Seat Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave modal */}
      {leaveModalOpen && selectedTable && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100 w-full max-w-md text-left">
            <h2 className="text-2xl font-bold mb-4 text-blue-700">
              Table {selectedTable.tableNumber} has left?
            </h2>
            <p className="text-gray-700 mb-6 text-lg">
              This will mark the table as available and archive its latest order.
            </p>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setLeaveModalOpen(false);
                  setSelectedTable(null);
                }}
                className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 text-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveConfirm}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 text-lg font-semibold transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table cards */}
      <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3 text-left">
        {tables.map((table) => (
          <div
            key={table._id}
            className={`border rounded-2xl p-8 shadow-sm transition ${table.isOccupied
              ? "bg-blue-50 text-gray-700 border-blue-100"
              : "bg-white hover:shadow-md border-blue-100"
              }`}
          >
            <h2 className="text-2xl font-semibold mb-3">
              Table {table.tableNumber}
            </h2>
            <p className="text-gray-600 mb-2 text-lg">
              Status:{" "}
              {table.isOccupied ? (
                <span className="font-semibold text-red-600">Occupied</span>
              ) : (
                <span className="font-semibold text-green-600">Available</span>
              )}
            </p>
            <p className="text-gray-600 mb-6 text-lg">
              Head count:{" "}
              {table.isOccupied ? table.headCount ?? "Unknown" : "-"}
            </p>

            {table.isOccupied ? (
              <button
                onClick={() => {
                  setSelectedTable(table);
                  setLeaveModalOpen(true);
                }}
                className="w-full px-6 py-4 rounded-xl font-semibold text-white text-lg bg-red-600 hover:bg-red-700 transition"
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
                className="w-full px-6 py-4 rounded-xl font-semibold text-white text-lg bg-blue-600 hover:bg-blue-700 transition"
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
