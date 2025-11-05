import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function SubcategoryItemsPage() {
    const { menuId, tableId, subId } = useParams();
    const [subcategory, setSubcategory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchSubcategory() {
            try {
                const res = await fetch(`http://localhost:5050/subcategories/${subId}`);
                if (!res.ok) throw new Error("Failed to fetch subcategory");
                const data = await res.json();
                setSubcategory(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchSubcategory();
    }, [subId]);

    if (loading)
        return (
            <div className="flex items-center justify-center h-screen text-xl">
                Loading subcategory...
            </div>
        );

    if (error)
        return (
            <div className="flex items-center justify-center h-screen text-red-600 text-xl">
                Error: {error}
            </div>
        );

    if (!subcategory)
        return (
            <div className="flex items-center justify-center h-screen text-gray-600 text-xl">
                No subcategory found
            </div>
        );

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-5">
            <div className="max-w-4xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 mb-6"
                >
                    ← Back
                </button>

                <h1 className="text-4xl font-bold text-center text-indigo-600 mb-8">
                    {subcategory.name}
                </h1>

                <p className="text-gray-600 text-center mb-10">
                    {subcategory.description || "Explore delicious items below"}
                </p>

                {/* Items */}
                {subcategory.items && subcategory.items.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-6">
                        {subcategory.items.map((item) => (
                            <div
                                key={item._id}
                                className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-lg transition cursor-pointer"
                            >
                                <h2 className="text-2xl font-semibold mb-2">{item.name}</h2>
                                <p className="text-gray-600 mb-2">{item.description}</p>
                                <p className="font-semibold text-indigo-700">
                                    Price: ${item.price?.toFixed(2) ?? "N/A"}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No items available.</p>
                )}

                {/* Nested subcategories */}
                {subcategory.children && subcategory.children.length > 0 && (
                    <div className="mt-10">
                        <h2 className="text-2xl font-bold mb-4 text-indigo-600 text-center">
                            More Options
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            {subcategory.children.map((child) => (
                                <div
                                    key={child._id}
                                    onClick={() =>
                                        navigate(
                                            `/menu/${menuId}/table/${tableId}/sub/${child._id}`
                                        )
                                    }
                                    className="cursor-pointer border border-gray-200 rounded-2xl p-6 bg-white shadow-sm hover:shadow-lg transition"
                                >
                                    <h3 className="text-xl font-semibold">{child.name}</h3>
                                    <p className="text-gray-600">{child.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
