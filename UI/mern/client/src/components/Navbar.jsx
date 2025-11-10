import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Navbar({ RequestLeave }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderId, setOrderId] = useState(localStorage.getItem("currentOrderId"));

  //botler click (return to welcome screen)
  const handleHomeClick = () => {
    const currentPath = location.pathname;

    const isWelcome = currentPath === "/";
    const isMainMenu = currentPath === "/menu";
    const isTableSelect = /^\/menu\/[^/]+\/table$/.test(currentPath);
    const isMenuItems = /^\/menu\/[^/]+\/table\/[^/]+$/.test(currentPath);

    //if on menu or table select no popup
    if (isWelcome || isMainMenu || isTableSelect) {
      navigate("/");
      return;
    }

    //show popup if order exists
    if (orderId) {
      RequestLeave("navbar"); // will handle clearing and redirect inside hook
    } else {
      navigate("/"); // if no order, just go home
    }
  };

  // keep orderId synced with localStorage changes
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
      localStorage.setItem = originalSetItem; // restore default
    };
  }, []);


  return (
    <>
      <nav className="flex justify-between p-4 bg-indigo-600 text-white">
        <button
          onClick={handleHomeClick}
          className="font-bold text-lg hover:text-indigo-200 transition"
        >
          Botler
        </button>
      </nav>
      {/* global modal handled in App.jsx */}
    </>
  );
}

export default Navbar;
