import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function CheckoutSummaryPage() {
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchOrder() {
            const orderId = localStorage.getItem("currentOrderId");
            if (!orderId) {
                setError("No active order found");
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderId}`);
                if (!res.ok) throw new Error("Failed to load order");
                const data = await res.json();
                setOrder(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchOrder();
    }, []);

    // Remove an item
    const handleRemoveItem = async (menuItemId) => {
        const orderId = localStorage.getItem("currentOrderId");
        if (!orderId) return alert("No active order found.");

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "remove", menuItem: menuItemId }),
            });
            if (!res.ok) throw new Error("Failed to remove item");
            const updated = await res.json();
            setOrder(updated);
        } catch (err) {
            alert("Error removing item: " + err.message);
        }
    };

    // Finalize order
    const handlePlaceOrder = async () => {
        const orderId = localStorage.getItem("currentOrderId");
        if (!orderId) return alert("No active order found.");

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "submit" }),
            });
            if (!res.ok) throw new Error("Failed to complete order");

            localStorage.removeItem("currentOrderId");
            navigate("/thankyou", { replace: true });
        } catch (e) {
            console.error(e);
            alert(e.message);
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center h-screen text-xl">
                Loading order...
            </div>
        );

    if (error)
        return (
            <div className="flex items-center justify-center h-screen text-red-600 text-xl">
                Error: {error}
            </div>
        );

    if (!order) return <p className="text-center mt-10">No order found.</p>;

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-5">
            <button
                onClick={() => navigate(-1)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
            >
                ← Back
            </button>

            <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
                Order Summary
            </h1>

            {/* Order details */}
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-2xl font-semibold mb-4">Table #{order.table?.tableNumber || "?"}</h2>
                <p className="text-gray-500 mb-6">Status: {order.status}</p>

                {order.items.length === 0 ? (
                    <p className="text-gray-500">No items in this order.</p>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {order.items.map((item) => (
                            <li
                                key={item._id}
                                className="flex justify-between items-center py-3"
                            >
                                <div>
                                    <p className="font-semibold">{item.menuItem?.name}</p>
                                    <p className="text-sm text-gray-500">
                                        Qty: {item.quantity}
                                        {item.specialInstructions && (
                                            <span> • {item.specialInstructions}</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <p className="text-indigo-600 font-semibold">
                                        ${(item.menuItem?.price * item.quantity).toFixed(2)}
                                    </p>
                                    <button
                                        onClick={() => handleRemoveItem(item.menuItem._id)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <hr className="my-6" />

                <div className="flex justify-between text-xl font-semibold">
                    <span>Total:</span>
                    <span>${order.totalPrice?.toFixed(2)}</span>
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={handlePlaceOrder}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
                    >
                        Place Order
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CheckoutSummaryPage;
