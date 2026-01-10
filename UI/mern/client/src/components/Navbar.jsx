import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Navbar({ RequestLeave }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderId, setOrderId] = useState(localStorage.getItem("currentOrderId"));

  const handleHomeClick = () => {
    const currentPath = location.pathname;

    const isWelcome = currentPath === "/";
    const isMainMenu = currentPath === "/menu";
    const isTableSelect = /^\/menu\/[^/]+\/table$/.test(currentPath);

    if (isWelcome || isMainMenu || isTableSelect) {
      navigate("/");
      return;
    }

    if (orderId) {
      RequestLeave("navbar");
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    const updateOrderId = () => {
      setOrderId(localStorage.getItem("currentOrderId"));
    };

    window.addEventListener("storage", updateOrderId);

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      originalSetItem.apply(this, arguments);
      if (key === "currentOrderId") updateOrderId();
    };

    return () => {
      window.removeEventListener("storage", updateOrderId);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  return (
    <>
      <nav className="flex justify-between items-center px-6 py-4 bg-blue-700 text-white font-inter shadow-sm">
        <button
          onClick={handleHomeClick}
          className="font-bold text-xl tracking-wide hover:text-blue-200 transition"
        >
          Nostos
        </button>
      </nav>
    </>
  );
}

export default Navbar;
