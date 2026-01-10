import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL;

function RobotTrack() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [robots, setRobots] = useState([]);
  const [filteredRobots, setFilteredRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchName, setSearchName] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [tableSearch, setTableSearch] = useState("");

  const [page, setPage] = useState(1);
  const PER_PAGE = 6;

  const [expandedRobotId, setExpandedRobotId] = useState(null);
  const [historiesByRobot, setHistoriesByRobot] = useState({});

  const [stopTarget, setStopTarget] = useState(null);
  const [stopLoading, setStopLoading] = useState(false);
  const [stopError, setStopError] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    async function fetchRobots() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/robots`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const content = res.headers.get("content-type");
        if (content?.includes("text/html")) throw new Error("Invalid server response");

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch robots");

        setRobots(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchRobots();
  }, []);

  const fetchRobotHistory = async (robotId) => {
    setHistoriesByRobot((prev) => ({
      ...prev,
      [robotId]: { loading: true, error: "", items: [] },
    }));

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/robotHistory/robot/${robotId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const content = res.headers.get("content-type");
      if (content?.includes("text/html")) throw new Error("Invalid response from server");

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch robot history");

      setHistoriesByRobot((prev) => ({
        ...prev,
        [robotId]: { loading: false, error: "", items: data },
      }));
    } catch (err) {
      setHistoriesByRobot((prev) => ({
        ...prev,
        [robotId]: { loading: false, error: err.message, items: [] },
      }));
    }
  };

  useEffect(() => {
    if (tableSearch.trim() === "") return;
    robots.forEach((r) => {
      if (!historiesByRobot[r._id]) {
        fetchRobotHistory(r._id);
      }
    });
  }, [tableSearch]);

  useEffect(() => {
    let list = [...robots];

    if (searchName.trim() !== "") {
      list = list.filter((r) =>
        r.name.toLowerCase().includes(searchName.toLowerCase())
      );
    }

    if (actionFilter !== "all") {
      list = list.filter((r) => r.action === actionFilter);
    }

    if (tableSearch.trim() !== "") {
      const q = tableSearch.trim().toLowerCase();
      list = list.filter((robot) => {
        const history = historiesByRobot[robot._id];
        if (!history || !history.items) return true;
        return history.items.some((h) =>
          h.table?.tableNumber?.toString().toLowerCase().includes(q)
        );
      });
    }

    setFilteredRobots(list);
    setPage(1);
  }, [robots, searchName, actionFilter, tableSearch, historiesByRobot]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredRobots.slice(start, start + PER_PAGE);
  }, [filteredRobots, page]);

  const totalPages = Math.ceil(filteredRobots.length / PER_PAGE) || 1;

  const actionColors = {
    serving: "bg-green-100 text-green-800",
    "taking order": "bg-blue-100 text-blue-800",
    charging: "bg-yellow-100 text-yellow-800",
    "awaiting instruction": "bg-gray-200 text-gray-800",
    "fetching order": "bg-indigo-100 text-indigo-800",
  };

  const batteryClass = (level) => {
    if (level <= 20) return "bg-red-100 text-red-800";
    if (level > 20 && level < 40) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const batteryBarClass = (level) => {
    if (level <= 20) return "bg-red-500";
    if (level > 20 && level < 40) return "bg-yellow-400";
    return "bg-green-500";
  };

  const handleConfirmStop = async () => {
    if (!stopTarget) return;
    setStopLoading(true);
    setStopError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/robots/${stopTarget._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "awaiting instruction" }),
      });

      const content = res.headers.get("content-type");
      if (content?.includes("text/html")) throw new Error("Invalid server response");

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to stop robot");

      setRobots((prev) => prev.map((r) => (r._id === data._id ? data : r)));

      if (historiesByRobot[stopTarget._id]) fetchRobotHistory(stopTarget._id);

      setStopTarget(null);
    } catch (err) {
      setStopError(err.message);
    } finally {
      setStopLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading robots...
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
        Robot Tracker
      </h1>

      <div className="max-w-5xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by robot name..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="border p-3 rounded-lg"
        />

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border p-3 rounded-lg"
        >
          <option value="all">Filter: All Actions</option>
          <option value="serving">Serving</option>
          <option value="taking order">Taking order</option>
          <option value="fetching order">Fetching order</option>
          <option value="charging">Charging</option>
          <option value="awaiting instruction">Awaiting instruction</option>
        </select>

        <input
          type="text"
          placeholder="Filter by table number..."
          value={tableSearch}
          onChange={(e) => setTableSearch(e.target.value)}
          className="border p-3 rounded-lg"
        />
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {paginated.map((robot) => (
          <div
            key={robot._id}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 border"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-semibold text-indigo-700">
                {robot.name}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${actionColors[robot.action] || "bg-gray-200 text-gray-800"
                  }`}
              >
                {robot.action}
              </span>
            </div>

            <div className="mt-2 mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-700 font-semibold">Battery</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${batteryClass(
                    robot.batteryLevel ?? 0
                  )}`}
                >
                  {robot.batteryLevel ?? 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`${batteryBarClass(
                    robot.batteryLevel ?? 0
                  )} h-3 rounded-full`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, robot.batteryLevel ?? 0)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-gray-700 text-sm">
              <span className="font-semibold">Current Table:</span>{" "}
              {robot.pendingAssignment?.table?.tableNumber ?? "—"}
            </p>

            <p className="text-gray-700 text-sm mt-3">
              <span className="font-semibold">Created:</span>{" "}
              {robot.createdAt
                ? new Date(robot.createdAt).toLocaleString()
                : "—"}
            </p>
            <p className="text-gray-700 text-sm mb-4">
              <span className="font-semibold">Updated:</span>{" "}
              {robot.updatedAt
                ? new Date(robot.updatedAt).toLocaleString()
                : "—"}
            </p>

            {user?.role === "admin" && (
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => {
                    const newId =
                      expandedRobotId === robot._id ? null : robot._id;
                    setExpandedRobotId(newId);
                    if (newId && !historiesByRobot[robot._id]) {
                      fetchRobotHistory(robot._id);
                    }
                  }}
                  className="text-indigo-600 font-semibold hover:underline mb-3"
                >
                  {expandedRobotId === robot._id
                    ? "Hide past actions"
                    : "View past actions"}
                </button>

                {expandedRobotId === robot._id && (
                  <div className="mt-2">
                    {historiesByRobot[robot._id]?.loading && (
                      <p className="text-gray-500 text-sm">Loading history...</p>
                    )}

                    {historiesByRobot[robot._id]?.error && (
                      <p className="text-red-500 text-sm">
                        {historiesByRobot[robot._id].error}
                      </p>
                    )}

                    {!historiesByRobot[robot._id]?.loading &&
                      !historiesByRobot[robot._id]?.error &&
                      historiesByRobot[robot._id]?.items?.length === 0 && (
                        <p className="text-gray-500 text-sm">No history entries.</p>
                      )}

                    {historiesByRobot[robot._id]?.items?.length > 0 && (
                      <ul className="space-y-2 max-h-64 overflow-y-auto mt-2">
                        {historiesByRobot[robot._id].items.map((h) => (
                          <li
                            key={h._id}
                            className="bg-gray-100 px-4 py-2 rounded-xl shadow-sm text-sm"
                          >
                            <p className="font-semibold text-gray-800">
                              Action: {h.action}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold">Table:</span>{" "}
                              {h.table?.tableNumber ?? "—"}
                            </p>
                            <p className="text-gray-700">
                              <span className="font-semibold">Order:</span>{" "}
                              {h.order
                                ? `#${h.order._id.slice(-5)} (${h.order.status})`
                                : "—"}
                            </p>
                            <p className="text-gray-600 text-xs">
                              <span className="font-semibold">Started:</span>{" "}
                              {new Date(h.startedAt).toLocaleString()}
                            </p>
                            <p className="text-gray-600 text-xs">
                              <span className="font-semibold">Ended:</span>{" "}
                              {h.endedAt
                                ? new Date(h.endedAt).toLocaleString()
                                : "In progress"}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setStopTarget(robot);
                setStopError("");
              }}
              className="mt-4 w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
            >
              ⚠️ Emergency Stop
            </button>
          </div>
        ))}
      </div>

      {filteredRobots.length > 0 && (
        <div className="flex justify-center gap-4 mt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 bg-gray-300 rounded-lg disabled:opacity-50"
          >
            Prev
          </button>

          <span className="px-4 py-2 font-semibold">
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 bg-gray-300 rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {filteredRobots.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No robots match your filters.
        </p>
      )}

      {stopTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              Shutdown {stopTarget.name}?
            </h2>
            <p className="text-gray-700 mb-4">
              This will set the robot&apos;s state to{" "}
              <span className="font-semibold">awaiting instruction</span>.
            </p>

            {stopError && (
              <p className="text-red-500 text-sm mb-3">{stopError}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  if (!stopLoading) {
                    setStopTarget(null);
                    setStopError("");
                  }
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                disabled={stopLoading}
              >
                Back
              </button>

              <button
                onClick={handleConfirmStop}
                disabled={stopLoading}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
              >
                {stopLoading ? "Stopping..." : "Confirm Shutdown"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RobotTrack;
