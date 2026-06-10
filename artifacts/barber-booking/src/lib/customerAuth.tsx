import { createContext, useContext, useState, type ReactNode } from "react";

interface CustomerState {
  phone: string | null;
  isLoggedIn: boolean;
  loginCustomer: (phone: string) => void;
  logoutCustomer: () => void;
  favourites: string[];
  toggleFavourite: (slug: string) => void;
  isFavourite: (slug: string) => boolean;
}

const CustomerContext = createContext<CustomerState>({
  phone: null,
  isLoggedIn: false,
  loginCustomer: () => {},
  logoutCustomer: () => {},
  favourites: [],
  toggleFavourite: () => {},
  isFavourite: () => false,
});

export function useCustomerAuth() {
  return useContext(CustomerContext);
}

function getFavouritesKey(phone: string) {
  return `slotcut_favs_${phone}`;
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [phone, setPhone] = useState<string | null>(() => localStorage.getItem("customer_phone"));
  const [favourites, setFavourites] = useState<string[]>(() => {
    const p = localStorage.getItem("customer_phone");
    if (!p) return [];
    try {
      return JSON.parse(localStorage.getItem(getFavouritesKey(p)) ?? "[]");
    } catch {
      return [];
    }
  });

  const loginCustomer = (newPhone: string) => {
    localStorage.setItem("customer_phone", newPhone);
    setPhone(newPhone);
    try {
      const saved = JSON.parse(localStorage.getItem(getFavouritesKey(newPhone)) ?? "[]");
      setFavourites(saved);
    } catch {
      setFavourites([]);
    }
  };

  const logoutCustomer = () => {
    localStorage.removeItem("customer_phone");
    setPhone(null);
    setFavourites([]);
  };

  const toggleFavourite = (slug: string) => {
    if (!phone) return;
    setFavourites((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      localStorage.setItem(getFavouritesKey(phone), JSON.stringify(next));
      return next;
    });
  };

  const isFavourite = (slug: string) => favourites.includes(slug);

  return (
    <CustomerContext.Provider value={{ phone, isLoggedIn: !!phone, loginCustomer, logoutCustomer, favourites, toggleFavourite, isFavourite }}>
      {children}
    </CustomerContext.Provider>
  );
}
