'use client';

import { useShopify } from '@/components/ShopifyProvider';
import { useState, useEffect, useCallback } from 'react';
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import Link from 'next/link';
import { useTranslation } from '@/i18n/useTranslation';

export default function Dashboard() {
  const { t } = useTranslation();
  const { shop, isLoading, isAuthenticated } = useShopify();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const productsResponse = await fetch(`/api/products?shop=${shop}`);
      const productsData = await productsResponse.json();
      if (productsData.products) {
        setProducts(productsData.products);
      }

      const ordersResponse = await fetch(`/api/orders?shop=${shop}`);
      const ordersData = await ordersResponse.json();
      if (ordersData.orders) {
        setOrders(ordersData.orders);
      }
    } catch (error) {
      // Error fetching data
    } finally {
      setLoading(false);
    }
  }, [shop]);
const syncProducts = async () => {
  if (!shop) return;

  setLoading(true);

  try {
    const response = await fetch(
      "/api/sync-products",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Product sync failed"
      );
    }

    alert(
      `Successfully synced ${data.count} products`
    );
  } catch (error) {
    console.error(error);
    alert("Failed to sync products");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    if (shop && isAuthenticated) {
      fetchData();
    }
  }, [shop, isAuthenticated, fetchData]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">{t("common.loading")}</div>
      </div>
    );
  }

  if (!shop || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">{t("dashboard.pleaseAuth")}</div>
          <div className="text-gray-600">
            {t("dashboard.authGoTo")} <span className="font-mono">/api/auth?shop=your-store.myshopify.com</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("dashboard.title")}</h1>
          <p className="text-gray-600">{t("dashboard.shop", { shop: shop || "" })}</p>
          <div className="mt-4">
            <Link
              href="/configurator"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t("dashboard.openConfigurator")}
            </Link>
            <button
              onClick={syncProducts}
              disabled={!shop || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
             {loading ? "Syncing..." : "Sync Products"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Products Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t("dashboard.products")}</h2>
            {loading ? (
              <div className="text-gray-500">{t("dashboard.loadingProducts")}</div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">{t("dashboard.totalProducts", { count: products.length })}</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products.slice(0, 10).map((product: any) => (
                    <div key={product.id} className="border-b pb-2">
                      <h3 className="font-medium">{product.title}</h3>
                      <p className="text-sm text-gray-500">ID: {product.id}</p>
                      <p className="text-sm text-gray-500">{t("dashboard.price", { price: product.variants?.[0]?.price || 'N/A' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Orders Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{t("dashboard.recentOrders")}</h2>
            {loading ? (
              <div className="text-gray-500">{t("dashboard.loadingOrders")}</div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">{t("dashboard.totalOrders", { count: orders.length })}</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orders.slice(0, 10).map((order: any) => (
                    <div key={order.id} className="border-b pb-2">
                      <h3 className="font-medium">{t("dashboard.order", { number: order.order_number })}</h3>
                      <p className="text-sm text-gray-500">
                        {order.financial_status} - {order.fulfillment_status}
                      </p>
                      <p className="text-sm text-gray-500">{t("dashboard.total", { total: order.total_price, currency: order.currency })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t("dashboard.refreshing") : t("dashboard.refresh")}
          </button>
          <button
            onClick={() => window.open(`/api/auth?shop=${shop}`, '_self')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {t("dashboard.reauth")}123
          </button>
        </div>
      </div>
    </div>
  );
}

