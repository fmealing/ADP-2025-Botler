// client/src/hooks/useLeaveConfirmation.js
import { useEffect, useState, useRef } from "react";
import { Dialog } from "@headlessui/react";
import { useNavigate } from "react-router-dom";

export function useLeaveConfirmation(orderId) {
    console.log("%cuseLeaveConfirmation init:", "color: orange; font-weight: bold", orderId);

    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [showInactivity, setShowInactivity] = useState(false);
    const [leaveSource, setLeaveSource] = useState("default");

    // timers declared outside effect so they can be accessed globally in hook
    const inactivityTimer = useRef(null);
    const warningTimer = useRef(null);

    // reusable timer starter
    const startTimer = () => {
        clearTimeout(warningTimer.current);
        clearTimeout(inactivityTimer.current);

        warningTimer.current = setTimeout(() => {
            setShowInactivity(true);
        }, 900000);

        inactivityTimer.current = setTimeout(async () => {
            if (!orderId) return;
            try {
                await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "clear" }),
                });
                localStorage.removeItem("currentOrderId");
                console.log("Order auto-cleared after inactivity");
                navigate("/", { replace: true });
            } catch (err) {
                console.error("Auto-clear failed:", err);
            }
        }, 960000);
    };

    useEffect(() => {
        if (!orderId) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        // reset timer when user interacts
        const resetTimer = () => {
            setShowInactivity(false); // hide modal if active
            startTimer(); // restart timers
        };

        const eventTypes = ["click", "keypress", "mousemove"];
        eventTypes.forEach((type) => window.addEventListener(type, resetTimer));

        // start when hook runs
        startTimer();

        // cleanup on unmount
        return () => {
            clearTimeout(inactivityTimer.current);
            clearTimeout(warningTimer.current);
            eventTypes.forEach((type) =>
                window.removeEventListener(type, resetTimer)
            );
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [orderId, navigate]);

    // confirm leave modal
    const handleConfirmLeave = async () => {
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clear" }),
            });
        } catch (err) {
            console.error("Failed to clear order:", err);
        } finally {
            localStorage.removeItem("currentOrderId");
            setShowConfirm(false);
            if (leaveSource === "navbar") {
                navigate("/", { replace: true });
            } else {
                navigate("/menu", { replace: true });
            }
        }
    };

    // modals
    const LeaveModal = () => (
        <Dialog
            open={showConfirm}
            onClose={() => setShowConfirm(false)}
            className="relative z-50"
        >
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <Dialog.Title className="text-2xl font-semibold mb-4 text-gray-800">
                        {leaveSource === "navbar" ? "Return to Welcome Screen?" : "Leave This Page?"}
                    </Dialog.Title>
                    <p className="text-gray-600 mb-6">
                        {leaveSource === "navbar"
                            ? "Returning to the welcome screen will delete your current order. Do you wish to continue?"
                            : "Leaving this screen will delete your current order. Are you sure you want to continue?"}
                    </p>
                    <div className="flex justify-center space-x-4">
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="px-5 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmLeave}
                            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            Continue
                        </button>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );

    const InactivityModal = () => (
        <Dialog
            open={showInactivity}
            onClose={() => setShowInactivity(false)}
            className="relative z-50"
        >
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <Dialog.Title className="text-2xl font-semibold mb-4 text-gray-800">
                        You’ve Been Inactive
                    </Dialog.Title>
                    <p className="text-gray-600 mb-6">
                        You haven’t interacted for a while. Your current order will be
                        cleared automatically soon if you don’t do anything.
                    </p>
                </Dialog.Panel>
            </div>
        </Dialog>
    );

    const RequestLeave = (source = "default") => {
        console.log("%c[RequestLeave called]", "color: purple; font-weight: bold;", { orderId, source });

        if (!orderId) return;
        setLeaveSource(source);
        setShowConfirm(true);
        console.log("%cRequestLeave called:", "color: purple; font-weight: bold", { orderId, source });

    };


    return { LeaveModal, InactivityModal, RequestLeave };
}

