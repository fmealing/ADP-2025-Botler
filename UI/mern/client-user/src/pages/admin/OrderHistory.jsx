import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function OrderHistory() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);

  // Controls
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch(`${import.meta.env.VITE_API_URL}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch orders");

        setOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  // Filter + search + sort
  useEffect(() => {
    let list = [...orders];

    // Search by table number
    if (search.trim() !== "") {
      list = list.filter((o) =>
        o.table?.tableNumber?.toString().includes(search.trim())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    // Sorting
    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (sortBy === "table") {
      list.sort(
        (a, b) =>
          (a.table?.tableNumber || 0) - (b.table?.tableNumber || 0)
      );
    }

    setFilteredOrders(list);
    setPage(1); // reset page on filter change
  }, [orders, search, sortBy, statusFilter]);

  // Paginated slice
  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredOrders.slice(start, start + PER_PAGE);
  }, [filteredOrders, page]);

  const totalPages = Math.ceil(filteredOrders.length / PER_PAGE);

  // Status badge colors
  const statusColors = {
    Pending: "bg-yellow-300 text-yellow-800",
    "In-progress": "bg-orange-300 text-orange-800",
    Submitted: "bg-orange-400 text-white",
    Completed: "bg-green-500 text-white",
    Cancelled: "bg-red-500 text-white",
    Paid: "bg-blue-500 text-white",
    Archived: "bg-gray-400 text-white",
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading order history...
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
        Order History
      </h1>

      {/* Controls */}
      <div className="max-w-5xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by table number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-3 rounded-lg"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border p-3 rounded-lg"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="table">Sort: Table Number</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-3 rounded-lg"
        >
          <option value="all">Filter: All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In-progress">In-progress</option>
          <option value="Submitted">Submitted</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Paid">Paid</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Orders */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {paginated.map((order) => (
          <div
            key={order._id}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6 border"
          >
            <h2 className="text-2xl font-semibold text-indigo-700 mb-3">
              Order #{order._id.slice(-5)}
            </h2>

            {/* Status */}
            <span
              className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[order.status]}`}
            >
              {order.status}
            </span>

            <p className="text-gray-700 mt-3">
              <span className="font-semibold">Table:</span>{" "}
              {order.table?.tableNumber}
            </p>

            <p className="text-gray-700">
              <span className="font-semibold">Menu:</span>{" "}
              {order.menu?.name || "None"}
            </p>

            <p className="text-gray-700">
              <span className="font-semibold">Robot:</span>{" "}
              {order.waiter?.name || "None"}
            </p>

            <p className="text-gray-700">
              <span className="font-semibold">Created:</span>{" "}
              {new Date(order.createdAt).toLocaleString()}
            </p>

            <p className="text-gray-700 mb-4">
              <span className="font-semibold">Updated:</span>{" "}
              {new Date(order.updatedAt).toLocaleString()}
            </p>

            {/* Admin-only section */}
            {user?.role === "admin" && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-xl font-semibold text-indigo-700 mb-3">
                  Items
                </h3>

                {order.items?.length > 0 ? (
                  <ul className="space-y-2">
                    {order.items.map((item) => (
                      <li
                        key={item._id}
                        className="bg-gray-100 px-4 py-2 rounded-xl shadow-sm"
                      >
                        <p className="font-semibold text-gray-800">
                          {item.menuItem?.name}
                        </p>
                        <p className="text-gray-600">
                          Qty: {item.quantity} — £
                          {item.menuItem?.price?.toFixed(2)}
                        </p>
                        {item.specialInstructions && (
                          <p className="text-sm text-gray-500 italic">
                            "{item.specialInstructions}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No items added.</p>
                )}

                <p className="text-right mt-4 text-lg font-bold text-indigo-700">
                  Total: £{order.totalPrice?.toFixed(2) || "0.00"}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
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
    </div>
  );
}

export default OrderHistory;
