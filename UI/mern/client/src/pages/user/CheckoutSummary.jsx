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
            const tableId = localStorage.getItem("currentTableId");

            try {
                if (orderId) {
                    const res = await fetch(
                        `${import.meta.env.VITE_API_URL}/orders/${orderId}`
                    );
                    if (!res.ok) throw new Error("Failed to load order");
                    const data = await res.json();
                    setOrder(data);
                    return;
                }

                if (tableId) {
                    const res = await fetch(
                        `${import.meta.env.VITE_API_URL}/orders/table/${tableId}/active`
                    );
                    if (!res.ok) throw new Error("Failed to load order");
                    const data = await res.json();
                    localStorage.setItem("currentOrderId", data._id);
                    setOrder(data);
                    return;
                }

                throw new Error("No table or order selected");
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchOrder();
    }, []);

    const handleRemoveItem = async (menuItemId) => {
        if (!order?._id) return alert("No active order found.");

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/orders/${order._id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "remove", menuItem: menuItemId }),
                }
            );
            if (!res.ok) throw new Error("Failed to remove item");
            const updated = await res.json();
            setOrder(updated);
        } catch (err) {
            alert("Error removing item: " + err.message);
        }
    };

    const handlePlaceOrder = async () => {
        if (!order?._id) return alert("No active order found.");

        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/orders/${order._id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "submit" }),
                }
            );
            if (!res.ok) throw new Error("Failed to complete order");

            localStorage.removeItem("currentOrderId");
            navigate("/thankyou", { replace: true });
        } catch (e) {
            alert(e.message);
        }
    };

    if (loading)
        return (
            <div className="flex items-center justify-center h-screen text-xl font-inter text-center">
                Loading order...
            </div>
        );

    if (error)
        return (
            <div className="flex items-center justify-center h-screen text-red-600 text-xl font-inter text-center">
                Error: {error}
            </div>
        );

    if (!order) return <p className="text-center mt-10 font-inter text-lg">No order found.</p>;

    return (
        <div className="min-h-screen bg-blue-50 py-10 px-6 font-inter text-gray-900 text-center">
            <button
                onClick={() => navigate(-1)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 mb-6 text-lg self-start text-left block"
            >
                ← Back
            </button>

            <h1 className="text-4xl md:text-5xl font-bold text-center text-blue-700 mb-10">
                Order Summary
            </h1>

            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-blue-100 p-8 text-left">
                <h2 className="text-2xl font-semibold mb-6 text-blue-700">
                    Table #{order.table?.tableNumber || "?"}
                </h2>
                {order.items.length === 0 ? (
                    <p className="text-gray-500 text-lg">No items in this order.</p>
                ) : (
                    <ul className="divide-y divide-blue-100">
                        {order.items.map((item) => (
                            <li
                                key={item._id}
                                className="flex justify-between items-start py-4"
                            >
                                <div>
                                    <p className="font-semibold text-lg">{item.menuItem?.name}</p>
                                    <p className="text-base text-gray-600">
                                        Qty: {item.quantity}
                                        {item.specialInstructions && (
                                            <span> • {item.specialInstructions}</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <p className="text-blue-700 font-semibold text-lg">
                                        £{(item.menuItem?.price * item.quantity).toFixed(2)}
                                    </p>
                                    <button
                                        onClick={() => handleRemoveItem(item.menuItem._id)}
                                        className="text-red-500 hover:text-red-700 text-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <hr className="my-8 border-blue-100" />

                <div className="flex justify-between text-xl font-semibold">
                    <span>Total:</span>
                    <span>£{order.totalPrice?.toFixed(2)}</span>
                </div>

                <div className="flex justify-end mt-8">
                    <button
                        onClick={handlePlaceOrder}
                        className="bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 text-lg font-semibold"
                    >
                        Place Order
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CheckoutSummaryPage;
