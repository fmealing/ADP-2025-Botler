import { useEffect, useState } from "react";
import { useLeaveConfirmation } from "./hooks/useLeaveConfirmation";
import Navbar from "./components/Navbar";
import { Outlet } from "react-router-dom";

const App = () => {
  //initialise orderId for global leave confirmation
  const [orderId, setOrderId] = useState(localStorage.getItem("currentOrderId"));

  //keep orderId synced with localStorage changes (for multi-tab updates)
  useEffect(() => {
    const updateOrderId = () => {
      setOrderId(localStorage.getItem("currentOrderId"));
    };
    window.addEventListener("storage", updateOrderId);
    return () => window.removeEventListener("storage", updateOrderId);
  }, []);

  //mount the global leave confirmation hook once 
  const { LeaveModal, InactivityModal, RequestLeave } = useLeaveConfirmation(orderId);

  return (
    <div className="w-full p-6">
      {/* global navigation bar with Botler button */}
      <Navbar RequestLeave={RequestLeave} />

      {/* global modals for leave confirmation and inactivity warning */}
      <LeaveModal />
      <InactivityModal />

      {/* nested routes render here*/}
      <Outlet context={{ RequestLeave }} />
    </div>
  );
};

export default App;
