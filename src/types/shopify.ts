export interface ShopifySession {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope?: string;
  expires?: Date;
  accessToken?: string;
  userId?: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  accountOwner: boolean;
  locale?: string;
  collaborator: boolean;
  emailVerified: boolean;
}

export interface Shop {
  id: string;
  shop: string;
  accessToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShopifyAppConfig {
  apiKey: string;
  apiSecretKey: string;
  scopes: string[];
  appUrl: string;
  apiVersion: string;
}

export interface CustomProduct {
  title: string;
  description: string;
  price: number;
  configuration: {
    shopId: string;
    bottleType: string;
    lidType?: string;
    ringType?: string;
    quantity: number;
    price: number;
  };
}
