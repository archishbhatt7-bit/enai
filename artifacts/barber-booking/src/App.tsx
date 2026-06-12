import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { CustomerAuthProvider } from "@/lib/customerAuth";
import SplashScreen from "@/components/SplashScreen";
import Landing from "@/pages/Landing";
import CustomerLogin from "@/pages/CustomerLogin";
import CustomerHome from "@/pages/CustomerHome";
import CustomerBookings from "@/pages/CustomerBookings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ShopPage from "@/pages/ShopPage";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

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
      <Route path="/customer/bookings" component={CustomerBookings} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/shop/:slug" component={ShopPage} />
      <Route path="/dashboard/:slug" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(
    () => !sessionStorage.getItem("slotcut_splash_shown")
  );

  const handleSplashDone = () => {
    sessionStorage.setItem("slotcut_splash_shown", "1");
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CustomerAuthProvider>
          <TooltipProvider>
            {showSplash && <SplashScreen onDone={handleSplashDone} />}
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
