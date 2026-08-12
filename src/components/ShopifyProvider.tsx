'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ShopifyContextType {
  shop: string | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setShop: (shop: string) => void;
  setSession: (session: any) => void;
}

const ShopifyContext = createContext<ShopifyContextType | undefined>(undefined);

export function ShopifyProvider({ children }: { children: React.ReactNode }) {
  const [shop, setShop] = useState<string | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for shop parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const shopParam = urlParams.get('shop');
    
    if (shopParam) {
      setShop(shopParam);
    }
    
    setIsLoading(false);
  }, []);

  const value = {
    shop,
    session,
    isLoading,
    isAuthenticated: Boolean(shop),
    setShop,
    setSession,
  };

  return (
    <ShopifyContext.Provider value={value}>
      {children}
    </ShopifyContext.Provider>
  );
}

export function useShopify() {
  const context = useContext(ShopifyContext);
  if (context === undefined) {
    throw new Error('useShopify must be used within a ShopifyProvider');
  }
  return context;
}
