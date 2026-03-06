import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Leads from "./pages/Leads";
import LeadProfile from "./pages/LeadProfile";
import Quotes from "./pages/Quotes";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Contacts from "./pages/Contacts";
import Providers from "./pages/Providers";
import Products from "./pages/Products";
import Billing from "./pages/Billing";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Categories from "./pages/Categories";
import Support from "./pages/Support";
import DeliveryNotes from "./pages/DeliveryNotes";
import PaymentOrders from "./pages/PaymentOrders";
import PurchaseOrders from "./pages/PurchaseOrders";
import Inventory from "./pages/Inventory";
import Warehouses from "./pages/Warehouses";
import DashboardHub from "./pages/DashboardHub";
import ExchangeRates from "./pages/ExchangeRates";
import ServicePurchases from "./pages/ServicePurchases";
import Email from "./pages/Email";
import WhatsApp from "./pages/WhatsApp";
import Notes from "./pages/Notes";
import Projects from "./pages/Projects";
import ProjectBoard from "./pages/ProjectBoard";
import Wiki from "./pages/Wiki";
import Sellers from "./pages/Sellers";
import Employees from "./pages/Employees";
import TimeTracking from "./pages/TimeTracking";
import RolePermissions from "./pages/RolePermissions";
import Payroll from "./pages/Payroll";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<LeadProfile />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientProfile />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="providers" element={<Providers />} />
            <Route path="billing" element={<Billing />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="settings" element={<Settings />} />
            <Route path="support" element={<Support />} />
            <Route path="delivery-notes" element={<DeliveryNotes />} />
            <Route path="payment-orders" element={<PaymentOrders />} />
            <Route path="purchase-orders" element={<PurchaseOrders />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="dashboards" element={<DashboardHub />} />
            <Route path="exchange-rates" element={<ExchangeRates />} />
            <Route path="service-purchases" element={<ServicePurchases />} />
            <Route path="email" element={<Email />} />
            <Route path="whatsapp" element={<WhatsApp />} />
            <Route path="notes" element={<Notes />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectBoard />} />
            <Route path="wiki" element={<Wiki />} />
            <Route path="sellers" element={<Sellers />} />
            <Route path="employees" element={<Employees />} />
            <Route path="time-tracking" element={<TimeTracking />} />
            <Route path="role-permissions" element={<RolePermissions />} />
            <Route path="payroll" element={<Payroll />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
