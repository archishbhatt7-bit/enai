import React, { createContext, useContext, useState, useEffect } from "react";
import { Shop } from "@workspace/api-zod/src/generated/types/shop";

interface AuthState {
  token: string | null;
  shop: Shop | null;
  shopSlug: string | null;
}

interface AuthContextType extends AuthState {
  login: (token: string, shop: Shop) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("barber_token");
    const shopSlug = localStorage.getItem("barber_shop_slug");
    const shopStr = localStorage.getItem("barber_shop");
    let shop = null;
    
    try {
      if (shopStr) shop = JSON.parse(shopStr);
    } catch (e) {
      console.error("Failed to parse shop from localStorage", e);
    }

    return { token, shop, shopSlug };
  });

  const login = (token: string, shop: Shop) => {
    localStorage.setItem("barber_token", token);
    localStorage.setItem("barber_shop_slug", shop.slug);
    localStorage.setItem("barber_shop", JSON.stringify(shop));
    setState({ token, shop, shopSlug: shop.slug });
  };

  const logout = () => {
    localStorage.removeItem("barber_token");
    localStorage.removeItem("barber_shop_slug");
    localStorage.removeItem("barber_shop");
    setState({ token: null, shop: null, shopSlug: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
