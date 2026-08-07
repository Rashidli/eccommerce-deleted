// DEMO istifadəçi paneli datası — backend qoşulanda API ilə əvəzlənəcək.

export type OrderStatus = "processing" | "shipped" | "delivered";

// Məhsul adı/şəkli/qiyməti mock-data-da saxlanır — burada yalnız istinad veririk
// ki, eyni məlumat iki yerdə saxlanmasın.
export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  total: string;
  items: OrderItem[];
  courier: string;
  branch: string;
  tracking: string;
  /** processing/shipped üçün təxmini tarix, delivered üçün çatdırılma tarixi */
  deliveryDate: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line: string;
  isDefault: boolean;
}

export interface Card {
  id: string;
  brand: "Visa" | "Mastercard";
  last4: string;
  expires: string;
}

export const userProfile = {
  fullName: "Ada Məmmədova",
  email: "ada@mail.com",
  phone: "+994 50 123 45 67",
  balance: "$120.00",
};

export const userOrders: Order[] = [
  {
    id: "SLR-10428",
    date: "2026-07-02",
    status: "processing",
    total: "$164.80",
    items: [
      { productId: "1", quantity: 1 },
      { productId: "2", quantity: 1 },
      { productId: "5", quantity: 1 },
    ],
    courier: "Kango",
    branch: "Kango 28 May",
    tracking: "KNG7734912AZ",
    deliveryDate: "2026-07-14",
  },
  {
    id: "SLR-10391",
    date: "2026-06-24",
    status: "shipped",
    total: "$89.90",
    items: [{ productId: "11", quantity: 1 }],
    courier: "Findeks",
    branch: "Findeks Nizami",
    tracking: "FDX2210458AZ",
    deliveryDate: "2026-07-11",
  },
  {
    id: "SLR-10355",
    date: "2026-06-11",
    status: "delivered",
    total: "$243.90",
    items: [
      { productId: "14", quantity: 1 },
      { productId: "15", quantity: 1 },
      { productId: "3", quantity: 3 },
    ],
    courier: "166 Kargo",
    branch: "166 Kargo Koroğlu",
    tracking: "166-8890234",
    deliveryDate: "2026-06-19",
  },
  {
    id: "SLR-10302",
    date: "2026-05-29",
    status: "delivered",
    total: "$54.90",
    items: [{ productId: "1", quantity: 1 }],
    courier: "Kango",
    branch: "Kango Yasamal",
    tracking: "KNG7712008AZ",
    deliveryDate: "2026-06-05",
  },
];

export const userAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Ev",
    fullName: "Ada Məmmədova",
    phone: "+994 50 123 45 67",
    line: "Nizami küç. 24, mənzil 12, Nəsimi rayonu, Bakı AZ1005",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "İş",
    fullName: "Ada Məmmədova",
    phone: "+994 55 987 65 43",
    line: "Xaqani küç. 7, ofis 301, Səbail rayonu, Bakı AZ1001",
    isDefault: false,
  },
];

export const userCards: Card[] = [
  { id: "card-1", brand: "Visa", last4: "4242", expires: "09/28" },
  { id: "card-2", brand: "Mastercard", last4: "8817", expires: "03/27" },
];
