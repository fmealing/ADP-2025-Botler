import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ThankYou() {
  const nav = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => {
      nav("/", { replace: true }); // welcome route
    }, 3500);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow text-center">
        <h1 className="text-3xl font-bold mb-2">Thank you!</h1>
        <p className="text-gray-600">Your order has been placed.</p>
      </div>
    </div>
  );
}
