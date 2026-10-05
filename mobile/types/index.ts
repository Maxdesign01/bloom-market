export type Product = {
  id: string;
  name: string;
  description: string;
  price: number; // in kobo (NGN), e.g. 2500000 = ₦25,000
  image_url: string | null;
  stock: number;
  created_at: string;
};

export type CartItem = {
  product: Product;
  quantity: number;
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
  created_at: string;
};
