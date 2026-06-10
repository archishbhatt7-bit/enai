import { createContext, useContext, useState, type ReactNode } from "react";

interface ShopData {
  id: number;
  slug: string;
  shopName: string;
  ownerName: string;
  phone: string;
  city: string;
  address?: string | null;
  numChairs: number;
  numBarbers: number;
  isOpen: boolean;
  isPaused: boolean;
  openTime: string;
  closeTime: string;
}

interface AuthState {
  token: string | null;
  shop: ShopData | null;
  isAuthenticated: boolean;
  login: (token: string, shop: ShopData) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthState>({
  token: null,
  shop: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("barber_token"));
  const [shop, setShop] = useState<ShopData | null>(() => {
    try {
      const s = localStorage.getItem("barber_shop");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const login = (newToken: string, newShop: ShopData) => {
    localStorage.setItem("barber_token", newToken);
    localStorage.setItem("barber_shop", JSON.stringify(newShop));
    setToken(newToken);
    setShop(newShop);
  };

  const logout = () => {
    localStorage.removeItem("barber_token");
    localStorage.removeItem("barber_shop");
    setToken(null);
    setShop(null);
  };

  return (
    <AuthContext.Provider value={{ token, shop, isAuthenticated: !!token && !!shop, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
