import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ThankYou() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      nav("/", { replace: true });
    }, 3500);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 px-6 font-inter text-gray-900">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-blue-100 max-w-md w-full">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-blue-700">
          Thank you!
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed">
          Your order has been placed.
        </p>
      </div>
    </div>
  );
}
