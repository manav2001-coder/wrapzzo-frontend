/** Shared gifting-flavoured dummy data reused across showcase sections — placeholder only, no real API calls. */

export interface Vendor {
  id: string;
  name: string;
}

export const VENDORS: Vendor[] = [
  { id: "printhouse", name: "PrintHouse Mumbai" },
  { id: "giftcraft", name: "GiftCraft Pune" },
  { id: "wrapworks", name: "WrapWorks Delhi" },
  { id: "kraftbox", name: "KraftBox Bengaluru" },
];

export interface DemoOrder {
  orderNo: string;
  recipient: string;
  gift: string;
  vendor: string;
  status: "processing" | "dispatched" | "delivered" | "cancelled";
  placedOn: string;
}

export const ORDERS: DemoOrder[] = [
  {
    orderNo: "ORD-1042",
    recipient: "Dr. Anjali Mehta",
    gift: "Engraved Steel Bottle",
    vendor: "PrintHouse Mumbai",
    status: "processing",
    placedOn: "2026-10-21",
  },
  {
    orderNo: "ORD-1041",
    recipient: "Dr. Rahul Verma",
    gift: "Personalised Diary",
    vendor: "GiftCraft Pune",
    status: "dispatched",
    placedOn: "2026-10-19",
  },
  {
    orderNo: "ORD-1039",
    recipient: "Priya Nair",
    gift: "Festive Hamper",
    vendor: "WrapWorks Delhi",
    status: "delivered",
    placedOn: "2026-10-12",
  },
  {
    orderNo: "ORD-1037",
    recipient: "Dr. Sameer Khan",
    gift: "Photo Frame",
    vendor: "KraftBox Bengaluru",
    status: "cancelled",
    placedOn: "2026-10-08",
  },
  {
    orderNo: "ORD-1036",
    recipient: "Meera Iyer",
    gift: "Engraved Steel Bottle",
    vendor: "PrintHouse Mumbai",
    status: "delivered",
    placedOn: "2026-10-05",
  },
];

/**
 * A larger set for paginated/infinite-scroll demos. Generated rather than literal so the
 * AsyncCombobox demo has enough rows to actually page through.
 */
export interface DemoRecipient {
  id: string;
  name: string;
  city: string;
}

const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru"];

export const RECIPIENTS: DemoRecipient[] = Array.from({ length: 120 }, (_, index) => ({
  id: `recipient-${index + 1}`,
  name: `Dr. Recipient ${index + 1}`,
  city: CITIES[index % CITIES.length]!,
}));

/** A local stand-in for a paginated endpoint, so the showcase makes no real API calls. */
export async function fetchRecipientPage({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search: string;
}) {
  const term = search.trim().toLowerCase();
  const matched = term
    ? RECIPIENTS.filter(
        (recipient) =>
          recipient.name.toLowerCase().includes(term) || recipient.city.toLowerCase().includes(term),
      )
    : RECIPIENTS;
  const offset = page * pageSize;
  const data = matched.slice(offset, offset + pageSize);
  // Simulate latency so the loading and "load more" states are visible.
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    data,
    page,
    pageSize,
    total: matched.length,
    hasMore: offset + data.length < matched.length,
  };
}
