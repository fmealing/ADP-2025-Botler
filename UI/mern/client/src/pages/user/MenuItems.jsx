import { useEffect, useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { useNavigate, useParams } from "react-router-dom";
import { updateOrderItems } from "../../utils/api";
import { useLeaveConfirmation } from "../../hooks/useLeaveConfirmation.jsx";


function MenuItemsPage() {
  const { id, menuId, subId, tableId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [order, setOrder] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);

  const orderId = localStorage.getItem("currentOrderId");
  const { LeaveModal, InactivityModal, RequestLeave } = useLeaveConfirmation(orderId);



  useEffect(() => {
    async function fetchData() {
      try {
        const targetMenuId = id || menuId;
        let res;
        if (subId) {
          res = await fetch(`${import.meta.env.VITE_API_URL}/subcategories/${subId}`);
        } else {
          res = await fetch(`${import.meta.env.VITE_API_URL}/menus/${targetMenuId}`);
        }

        if (!res.ok) throw new Error("Failed to fetch menu");
        const data = await res.json();
        setMenu(data);

        const crumbs = [];
        if (data.menuName)
          crumbs.push({ name: data.menuName, type: "menu", id: targetMenuId });
        if (data.ancestors && data.ancestors.length > 0) {
          data.ancestors.forEach((ancestor) =>
            crumbs.push({ name: ancestor.name, type: "sub", id: ancestor._id })
          );
        }
        if (data.name) crumbs.push({ name: data.name, type: "current" });
        setBreadcrumbs(crumbs);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, menuId, subId]);

  const handleAddToOrder = async (customizedItem) => {
    if (!orderId) {
      alert("No active order found. Please select a table first.");
      return;
    }

    try {
      await updateOrderItems(
        orderId,
        "add",
        customizedItem.menuItem,
        customizedItem.quantity,
        customizedItem.specialInstructions
      );
      setOrder((prev) => [...prev, customizedItem]);
      setSelectedItem(null);
    } catch (err) {
      alert("Failed to add item: " + err.message);
    }
  };

  const handleBreadcrumbClick = (crumb) => {
    if (crumb.type === "menu") {
      navigate(`/menu/${crumb.id}/table/${tableId}`);
    } else if (crumb.type === "sub") {
      navigate(`/menu/${menuId || id}/table/${tableId}/sub/${crumb.id}`);
    }
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

  if (!menu) return <p className="text-center mt-10">No menu found</p>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <button
        onClick={() => {
          if (subId) {
            navigate(-1);
          } else { RequestLeave(); }
        }}
        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
      >
        ← Back
      </button>

      {breadcrumbs.length > 0 && (
        <nav className="flex justify-center mb-6 text-gray-600 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {crumb.type === "current" ? (
                <span className="font-semibold text-indigo-700">
                  {crumb.name}
                </span>
              ) : (
                <button
                  onClick={() => handleBreadcrumbClick(crumb)}
                  className="hover:text-indigo-600 underline"
                >
                  {crumb.name}
                </button>
              )}
              {index < breadcrumbs.length - 1 && (
                <span className="mx-2 text-gray-400">›</span>
              )}
            </span>
          ))}
        </nav>
      )}

      <h1 className="text-4xl font-bold text-center text-indigo-600 mb-10">
        {menu.name || "Subcategory"}
      </h1>

      <div className="max-w-4xl mx-auto space-y-10">
        {subId && menu.items ? (
          <SubcategorySection
            sub={menu}
            onSelectItem={setSelectedItem}
            tableId={tableId}
            menuId={menuId || id}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
  {menu.subcategories?.map((sub) => (
    <div
      key={sub._id}
      onClick={() =>
        navigate(
          `/menu/${menu._id}/table/${menu.tableId || tableId || "none"}/sub/${sub._id}`
        )
      }
      className="cursor-pointer bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
    >
      {/* Subcategory Image */}
      {sub.picture && (
        <div className="h-56 w-full overflow-hidden">
          <img
            src={`${import.meta.env.VITE_API_URL}${sub.picture}`}
            alt={sub.name}
            className="object-cover w-full h-full"
          />
        </div>
      )}
      {/* Subcategory Info */}
      <div className="p-6 text-center">
        <h2 className="text-2xl font-semibold text-indigo-700 mb-2">
          {sub.name}
        </h2>
        <p className="text-gray-600">{sub.description}</p>
        <button className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-indigo-700">
          View {sub.name}
        </button>
      </div>
    </div>
  ))}
  </div>
)}
</div>
      {order.length > 0 && (
        <div className="flex justify-center mt-10">
          <button
            onClick={() => navigate("/checkout")}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition"
          >
            Proceed to Checkout
          </button>
        </div>
      )}

      <Dialog
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        className="relative z-50"
      >
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

      <LeaveModal />

    </div>
  );
}

{/* ---------- Subcategory Section ---------- */}
/* ---------- Subcategory Section ---------- */
function SubcategorySection({ sub, onSelectItem, tableId, menuId }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <h2 className="text-2xl font-semibold mb-2">{sub.name}</h2>
      <p className="text-gray-600 mb-4">{sub.description}</p>

      {/* Menu Items with Images */}
      {sub.items && sub.items.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {sub.items.map((item) => (
            <div
              key={item._id}
              onClick={() => onSelectItem(item)}
              className="cursor-pointer bg-white border rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
            >
              {/* Item Image */}
              {item.picture ? (
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={`${import.meta.env.VITE_API_URL}${item.picture}`}
                    alt={item.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}

              {/* Item Info */}
              <div className="p-4 text-center">
                <h3 className="text-xl font-semibold text-indigo-700 mb-1">
                  {item.name}
                </h3>
                <p className="text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                <p className="font-semibold text-indigo-700">
                  ${item.price?.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Child Subcategories with Images */}
      {sub.children && sub.children.length > 0 && (
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {sub.children.map((child) => (
            <div
              key={child._id}
              onClick={() =>
                navigate(`/menu/${menuId}/table/${tableId || "none"}/sub/${child._id}`)
              }
              className="cursor-pointer bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition transform hover:-translate-y-1"
            >
              {/* Child Subcategory Image */}
              {child.picture? (
                <div className="h-48 w-full overflow-hidden">
                  <img
                    src={`${import.meta.env.VITE_API_URL}${child.picture}`}
                    alt={child.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}

              {/* Child Info */}
              <div className="p-5 text-center">
                <h4 className="text-xl font-semibold text-indigo-700 mb-2">
                  {child.name}
                </h4>
                <p className="text-gray-600 line-clamp-2">{child.description}</p>
                <button className="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-indigo-700">
                  View {child.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


{/* ---------- Ingredient Popup ---------- */}
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
    <main>
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
    </main>
  );
}

export default MenuItemsPage;
