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
import SubcategoryItemsPage from "./pages/user/SubcategoryItems.jsx";
import TableSelectPage from "./pages/user/TableSelect.jsx";
import CheckoutSummaryPage from "./pages/user/CheckoutSummary.jsx";
import ThankYou from "./pages/user/ThankYou.jsx";


import WelcomePageUser from "./pages/admin/WelcomeUser.jsx";

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
      { path: "/checkout", element: <CheckoutSummaryPage /> },
      { path: "/menu/:menuId/table/:tableId/sub/:subId", element: <MenuItemsPage /> },
      { path: "/thankyou", element: <ThankYou /> },


      { path: "/login", element: <WelcomePageUser /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
