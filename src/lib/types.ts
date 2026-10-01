/** Shared types for Bloom Market. */

/** A product as stored in the database. Prices are in kobo (NGN). */
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  stock: number;
  created_at: string;
};

export type CartItem = {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  products: Product | null;
};

export type Cart = {
  id: string;
  user_id: string | null;
  cart_items: CartItem[];
};

export type OrderStatus = "pending" | "paid" | "failed";

export type Order = {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string;
  address: string;
  total: number;
  currency: string;
  status: OrderStatus;
  paystack_reference: string | null;
  email_sent_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
};

export type CheckoutPayload = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
};

export type CheckoutResponse =
  | { ok: true; authorizationUrl: string; reference: string; orderId: string }
  | { ok: false; error: string };
