import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

function OrderHistory() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

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

  useEffect(() => {
    fetchOrders();
  }, []);

  async function handleSendOrder(orderId) {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/orders/${orderId}/send`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send order");

      setOrders((prev) =>
        prev.map((o) => (o._id === data._id ? data : o))
      );

      // force re-sync to avoid stale robot/order state
      fetchOrders();
    } catch (err) {
      alert(err.message);
    }
  }

  useEffect(() => {
    let list = [...orders];

    if (search.trim() !== "") {
      list = list.filter((o) =>
        o.table?.tableNumber?.toString().includes(search.trim())
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }

    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === "table") {
      list.sort(
        (a, b) =>
          (a.table?.tableNumber || 0) - (b.table?.tableNumber || 0)
      );
    }

    setFilteredOrders(list);
    setPage(1);
  }, [orders, search, sortBy, statusFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredOrders.slice(start, start + PER_PAGE);
  }, [filteredOrders, page]);

  const totalPages = Math.ceil(filteredOrders.length / PER_PAGE);

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
      <div className="flex items-center justify-center h-screen text-xl font-inter text-center">
        Loading order history...
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
        Order History
      </h1>

      <div className="max-w-5xl mx-auto mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
        <input
          type="text"
          placeholder="Search by table number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg bg-white"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="table">Sort: Table Number</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-blue-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-lg bg-white"
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

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        {paginated.map((order) => (
          <div
            key={order._id}
            className="bg-white rounded-2xl shadow-sm border border-blue-100 hover:shadow-md transition p-8"
          >
            <h2 className="text-2xl font-semibold text-blue-700 mb-4">
              Order #{order._id.slice(-5)}
            </h2>

            <span
              className={`px-4 py-2 rounded-full text-base font-semibold ${statusColors[order.status]}`}
            >
              {order.status}
            </span>

            <p className="text-gray-700 mt-4 text-lg">
              <span className="font-semibold">Table:</span>{" "}
              {order.table?.tableNumber}
            </p>

            <p className="text-gray-700 text-lg">
              <span className="font-semibold">Robot:</span>{" "}
              {order.waiter?.name || "None"}
            </p>

            <p className="text-gray-700 text-lg">
              <span className="font-semibold">Created:</span>{" "}
              {new Date(order.createdAt).toLocaleString()}
            </p>

            <p className="text-gray-700 mb-6 text-lg">
              <span className="font-semibold">Updated:</span>{" "}
              {new Date(order.updatedAt).toLocaleString()}
            </p>

            {user?.role === "admin" && (
              <div className="border-t border-blue-100 pt-6 mt-6">
                <h3 className="text-xl font-semibold text-blue-700 mb-4">
                  Items
                </h3>

                {order.items?.length > 0 ? (
                  <ul className="space-y-3">
                    {order.items.map((item) => (
                      <li
                        key={item._id}
                        className="bg-blue-50 px-6 py-4 rounded-2xl border border-blue-100"
                      >
                        <p className="font-semibold text-gray-800 text-lg">
                          {item.menuItem?.name}
                        </p>
                        <p className="text-gray-600 text-lg">
                          Qty: {item.quantity} — £
                          {item.menuItem?.price?.toFixed(2)}
                        </p>
                        {item.specialInstructions && (
                          <p className="text-base text-gray-500 italic">
                            "{item.specialInstructions}"
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-lg">No items added.</p>
                )}

                <p className="text-right mt-6 text-xl font-semibold text-blue-700">
                  Total: £{order.totalPrice?.toFixed(2) || "0.00"}
                </p>

                {order.status === "Submitted" && (
                  <button
                    onClick={() => handleSendOrder(order._id)}
                    className="mt-6 w-full bg-blue-600 text-white px-6 py-4 rounded-xl hover:bg-blue-700 font-semibold text-lg transition"
                  >
                    Click to Send Robot to Table (Food Loaded)
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-4 mt-10">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl disabled:opacity-50 text-lg font-semibold hover:bg-blue-100 transition"
          >
            Prev
          </button>

          <span className="px-6 py-3 font-semibold text-lg">
            Page {page} / {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-xl disabled:opacity-50 text-lg font-semibold hover:bg-blue-100 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default OrderHistory;
