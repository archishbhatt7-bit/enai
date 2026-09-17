import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { CustomerAuthProvider } from "@/lib/customerAuth";
import Landing from "@/pages/Landing";
import CustomerLogin from "@/pages/CustomerLogin";
import CustomerHome from "@/pages/CustomerHome";
import CustomerBookings from "@/pages/CustomerBookings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import CreateShop from "@/pages/CreateShop";
import ShopPage from "@/pages/ShopPage";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import RefundPolicy from "@/pages/RefundPolicy";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Pricing from "@/pages/Pricing";
import NotFound from "@/pages/not-found";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// In production, API calls go to the backend URL
if (import.meta.env.VITE_API_URL) {
  setBaseUrl(import.meta.env.VITE_API_URL);
} else if (import.meta.env.PROD) {
  // Fallback for Vercel deployment if env variable is not set
  setBaseUrl("https://enai-api-server.vercel.app");
}

setAuthTokenGetter(() => {
  const path = window.location.pathname;
  // Customer-facing pages: customer login, customer home, and shop booking pages
  if (path.startsWith("/customer") || path === "/customer-login" || path.startsWith("/shop/")) {
    const token = localStorage.getItem("customer_token");
    if (token) {
      // Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp < Date.now()) {
          localStorage.removeItem("customer_token");
          localStorage.removeItem("customer_phone");
          return null;
        }
      } catch { /* ignore parse errors */ }
    }
    return token;
  }
  return localStorage.getItem("barber_token");
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/customer-login" component={CustomerLogin} />
      <Route path="/customer" component={CustomerHome} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/create-shop" component={CreateShop} />
      <Route path="/shop/:slug" component={ShopPage} />
      <Route path="/dashboard/:slug" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsAndConditions} />
      <Route path="/refund" component={RefundPolicy} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/pricing" component={Pricing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomerAuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
