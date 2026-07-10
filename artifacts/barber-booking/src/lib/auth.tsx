import { createContext, useContext, useState, type ReactNode } from "react";

interface OwnerData {
  id: number;
  name: string;
  phone: string;
}

interface ShopData {
  id: number;
  slug: string;
  shopName: string;
  ownerId: number;
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
  owner: OwnerData | null;
  shop: ShopData | null;
  isAuthenticated: boolean;
  login: (token: string, owner: OwnerData, shop: ShopData | null) => void;
  logout: () => void;
  updateShop: (shop: ShopData) => void;
}

export const AuthContext = createContext<AuthState>({
  token: null,
  owner: null,
  shop: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  updateShop: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("barber_token"));
  const [owner, setOwner] = useState<OwnerData | null>(() => {
    try {
      const o = localStorage.getItem("barber_owner");
      return o ? JSON.parse(o) : null;
    } catch {
      return null;
    }
  });
  const [shop, setShop] = useState<ShopData | null>(() => {
    try {
      const s = localStorage.getItem("barber_shop");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const login = (newToken: string, newOwner: OwnerData, newShop: ShopData | null) => {
    localStorage.setItem("barber_token", newToken);
    localStorage.setItem("barber_owner", JSON.stringify(newOwner));
    if (newShop) {
      localStorage.setItem("barber_shop", JSON.stringify(newShop));
    } else {
      localStorage.removeItem("barber_shop");
    }
    setToken(newToken);
    setOwner(newOwner);
    setShop(newShop || null);
  };

  const updateShop = (newShop: ShopData) => {
    localStorage.setItem("barber_shop", JSON.stringify(newShop));
    setShop(newShop);
  };

  const logout = () => {
    localStorage.removeItem("barber_token");
    localStorage.removeItem("barber_owner");
    localStorage.removeItem("barber_shop");
    setToken(null);
    setOwner(null);
    setShop(null);
  };

  return (
    <AuthContext.Provider value={{ token, owner, shop, isAuthenticated: !!token, login, logout, updateShop }}>
      {children}
    </AuthContext.Provider>
  );
}
