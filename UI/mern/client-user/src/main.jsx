import React from "react";
import ReactDOM from "react-dom/client";
import {createBrowserRouter, RouterProvider, Navigate} from "react-router-dom";

import App from "./App.jsx";
import Help from "./pages/admin/Help.jsx";
import Login from "./pages/admin/LoginUser.jsx";
import EditMenuItems from "./pages/admin/MenuItemsEdit.jsx";
import EditMenus from "./pages/admin/MenusEdit.jsx";
import OrderHistory from "./pages/admin/OrderHistory.jsx";
import TrackRobits from "./pages/admin/RobotTrack.jsx";
import AssignTables from "./pages/admin/TableAssign.jsx";
import EditUsers from "./pages/admin/UserEdit.jsx";
import WelcomePageUser from "./pages/admin/WelcomeUser.jsx";
import ControlCentre from "./pages/admin/ControlCentre.jsx"; // ✅ new import

import "./index.css";

//Protected routes for admins
function PrivateRoute({ element }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/pages/admin/login" replace />;
  
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const isExpired = payload.exp * 1000 < Date.now();
    if (isExpired) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/pages/admin/login" replace />;
    }
  } catch {
    return <Navigate to="/pages/admin/login" replace />;}
  return element;
}

function AdminRoute({ element }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "admin") {
    return <Navigate to="/user/control" replace />;
  }
  return element;
}

//route
const router = createBrowserRouter([
  {
    path: "/pages/admin",
    element: <App />,
    children: [
      { path: "login", element: <Login /> },
      { index: true, element: <WelcomePageUser /> },
      { path: "control", element: <PrivateRoute element={<ControlCentre />} />,},
      { path: "help", element: <PrivateRoute element={<Help />} /> },
      { path: "history", element: <PrivateRoute element={<OrderHistory />} /> },
      { path: "tracker", element: <PrivateRoute element={<TrackRobits />} /> },
      { path: "assign", element: <PrivateRoute element={<AssignTables />} /> },
      { path: "itemEdits", element: <AdminRoute element={<EditMenuItems />} /> },
      { path: "menusEdit", element: <AdminRoute element={<EditMenus />} /> },
      { path: "users", element: <AdminRoute element={<EditUsers />} /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
