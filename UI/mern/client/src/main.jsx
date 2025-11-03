import * as React from "react";
import * as ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import App from "./App";
import WelcomePage from "./pages/user/Welcome.jsx";
import MenuPage from "./pages/user/MenuSelect.jsx";
import MenuItemsPage from "./pages/user/MenuItems.jsx";
import TableSelectPage from "./pages/user/TableSelect.jsx";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <WelcomePage /> },
      { path: "/menu", element: <MenuPage /> },
      { path: "/menu/:menuId/table", element: <TableSelectPage /> },
      { path: "/menu/:id", element: <MenuItemsPage /> },
      { path: "/menu/:id/table/:tableId", element: <MenuItemsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
