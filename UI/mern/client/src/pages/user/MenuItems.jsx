import { useEffect, useState } from "react";
import { Dialog } from "@headlessui/react";
import { useNavigate, useParams } from "react-router-dom";

function MenuItemsPage() {
  const { id } = useParams(); // menu ID
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState([]);

  // Fetch menu + items
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`http://localhost:5050/menus/${id}`);
        if (!res.ok) throw new Error("Failed to fetch menu");
        const data = await res.json();
        setMenu(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, [id]);

  const handleAddToOrder = (customizedItem) => {
    setOrder((prev) => [...prev, customizedItem]);
    setSelectedItem(null);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl">
        Loading menu items...
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen text-red-600 text-xl">
        Error: {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <button
        onClick={() => navigate(-1)}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
      >
        ← Back
      </button>

      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
        {menu.name}
      </h1>

      {/* Grid of menu items */}
      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        {menu.items.map((item) => (
          <div
            key={item._id}
            onClick={() => setSelectedItem(item)}
            className="cursor-pointer border border-gray-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-lg transition"
          >
            <h2 className="text-2xl font-semibold mb-2">{item.name}</h2>
            <p className="text-gray-600 mb-2">{item.description}</p>
            <p className="font-semibold text-indigo-700">
              Price: ${item.price?.toFixed(2) ?? "N/A"}
            </p>
          </div>
        ))}
      </div>

      {/* Popup (Modal) */}
      <Dialog open={!!selectedItem} onClose={() => setSelectedItem(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          {selectedItem && (
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
              <Dialog.Title className="text-2xl font-semibold mb-4">
                {selectedItem.name}
              </Dialog.Title>

              <p className="text-gray-600 mb-3">{selectedItem.description}</p>
              <p className="text-indigo-700 font-semibold mb-6">
                ${selectedItem.price?.toFixed(2)}
              </p>

              <IngredientSelector
                ingredients={selectedItem.ingredients || []}
                onConfirm={(customization) =>
                  handleAddToOrder({
                    menuItem: selectedItem._id,
                    quantity: customization.quantity,
                    specialInstructions: customization.specialInstructions,
                    removedIngredients: customization.removedIngredients,
                  })
                }
                onCancel={() => setSelectedItem(null)}
              />
            </Dialog.Panel>
          )}
        </div>
      </Dialog>
    </div>
  );
}

/* ---------- Popup inner component ---------- */
function IngredientSelector({ ingredients, onConfirm, onCancel }) {
  const [removed, setRemoved] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [special, setSpecial] = useState("");

  const toggleRemove = (id) => {
    setRemoved((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm({
      removedIngredients: removed,
      quantity,
      specialInstructions: special,
    });
  };

  return (
    <div>
      <h3 className="font-semibold mb-2">Ingredients:</h3>
      <ul className="space-y-2 mb-4">
        {ingredients.length > 0 ? (
          ingredients.map((ing) => (
            <li key={ing._id}>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={removed.includes(ing._id)}
                  onChange={() => toggleRemove(ing._id)}
                />
                <span
                  className={
                    removed.includes(ing._id)
                      ? "line-through text-gray-400"
                      : "text-gray-800"
                  }
                >
                  {ing.name}
                </span>
              </label>
            </li>
          ))
        ) : (
          <li className="text-gray-500">No ingredients listed.</li>
        )}
      </ul>

      <label className="block mb-3">
        <span className="font-semibold">Quantity:</span>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-2 py-1 ml-2 w-20"
        />
      </label>

      <label className="block mb-3">
        <span className="font-semibold">Special Instructions:</span>
        <textarea
          value={special}
          onChange={(e) => setSpecial(e.target.value)}
          className="w-full border border-gray-300 rounded-lg p-2 mt-1"
          placeholder="e.g. No sauce, extra cheese"
        />
      </label>

      <div className="flex justify-end space-x-3 mt-5">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Add to Order
        </button>
      </div>
    </div>
  );
}

export default MenuItemsPage;
