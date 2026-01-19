import { useEffect, useState } from "react";
import { useLeaveConfirmation } from "./hooks/useLeaveConfirmation";
import { useDragScroll } from "./hooks/useDragScroll";
import Navbar from "./components/Navbar";
import { Outlet } from "react-router-dom";

const App = () => {
  const [orderId, setOrderId] = useState(localStorage.getItem("currentOrderId"));
  const scrollRef = useDragScroll(true);

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

  const { LeaveModal, InactivityModal, RequestLeave } = useLeaveConfirmation(orderId);

  return (
    <div ref={scrollRef} className="touch-scroll w-full h-screen flex flex-col">
      <div className="sticky top-0 z-50 bg-white">
        <Navbar RequestLeave={RequestLeave} />
      </div>

      <LeaveModal />
      <InactivityModal />

      <div className="p-6 flex-1">
        <Outlet context={{ RequestLeave }} />
      </div>
    </div>
  );
};

export default App;
