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
                const res = await fetch(`${import.meta.env.VITE_API_URL}/subcategories/${subId}`);
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
            <div className="flex items-center justify-center h-screen text-xl font-inter text-center">
                Loading subcategory...
            </div>
        );

    if (error)
        return (
            <div className="flex items-center justify-center h-screen text-red-600 text-xl font-inter text-center">
                Error: {error}
            </div>
        );

    if (!subcategory)
        return (
            <div className="flex items-center justify-center h-screen text-gray-600 text-xl font-inter text-center">
                No subcategory found
            </div>
        );

    return (
        <div className="min-h-screen bg-blue-50 py-10 px-6 font-inter text-gray-900 text-center">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 mb-6 text-lg mx-auto block"
                >
                    ← Back
                </button>

                <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-6">
                    {subcategory.name}
                </h1>

                <p className="text-gray-700 text-lg mb-10 leading-relaxed">
                    {subcategory.description || "Explore delicious items below"}
                </p>

                {subcategory.items && subcategory.items.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-8">
                        {subcategory.items.map((item) => (
                            <div
                                key={item._id}
                                className="border border-blue-100 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition cursor-pointer"
                            >
                                <h2 className="text-2xl font-semibold mb-2 text-blue-700">
                                    {item.name}
                                </h2>
                                <p className="text-gray-700 text-lg mb-3">
                                    {item.description}
                                </p>
                                <p className="font-semibold text-blue-700 text-lg">
                                    Price: £{item.price?.toFixed(2) ?? "N/A"}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-lg">No items available.</p>
                )}

                {subcategory.children && subcategory.children.length > 0 && (
                    <div className="mt-12">
                        <h2 className="text-2xl font-bold mb-6 text-blue-700">
                            More Options
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            {subcategory.children.map((child) => (
                                <div
                                    key={child._id}
                                    onClick={() =>
                                        navigate(
                                            `/menu/${menuId}/table/${tableId}/sub/${child._id}`
                                        )
                                    }
                                    className="cursor-pointer border border-blue-100 rounded-2xl p-6 bg-white shadow-sm hover:shadow-md transition"
                                >
                                    <h3 className="text-xl font-semibold text-blue-700 mb-2">
                                        {child.name}
                                    </h3>
                                    <p className="text-gray-700 text-lg">
                                        {child.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
