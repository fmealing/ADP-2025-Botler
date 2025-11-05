// src/utils/api.js
const API_BASE = "http://localhost:5050";

export async function getOrCreateOrder(tableId, menuId) {
    try {
        const res = await fetch(`${API_BASE}/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ table: tableId, menu: menuId }),
        });
        if (!res.ok) throw new Error("Failed to get or create order");
        return await res.json();
    } catch (err) {
        console.error("Error creating/fetching order:", err);
        throw err;
    }
}

export async function updateOrderItems(orderId, action, menuItem, quantity = 1, specialInstructions = "") {
    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action, menuItem, quantity, specialInstructions }),
        });
        if (!res.ok) throw new Error("Failed to update order");
        return await res.json();
    } catch (err) {
        console.error("Error updating order items:", err);
        throw err;
    }
}
