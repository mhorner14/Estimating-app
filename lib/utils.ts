import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function generateEstimateNumber(prefix = "EST"): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${year}${month}${day}-${random}`;
}

export function calculateEstimateTotals(
  lineItems: Array<{ totalPrice: number; cost?: number | null; isOptional?: boolean }>,
  discountAmount = 0,
  discountPercent = 0,
  taxRate = 0
) {
  const includedItems = lineItems.filter((item) => !item.isOptional);
  const subtotal = includedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalCost = includedItems.reduce((sum, item) => sum + (item.cost ?? 0), 0);

  const discountValue =
    discountAmount > 0 ? discountAmount : (subtotal * discountPercent) / 100;

  const afterDiscount = subtotal - discountValue;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const totalAmount = afterDiscount + taxAmount;
  const margin = totalCost > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0;

  return {
    subtotal,
    discountValue,
    taxAmount,
    totalAmount,
    totalCost,
    margin,
  };
}

export const ESTIMATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  NEEDS_CLARIFICATION: "Needs Clarification",
  READY_FOR_REVIEW: "Ready for Review",
  SENT: "Sent",
  VIEWED: "Viewed",
  ACCEPTED: "Accepted",
  DEPOSIT_PAID: "Deposit Paid",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  BALANCE_DUE: "Balance Due",
  PAID_IN_FULL: "Paid in Full",
  LOST: "Lost",
};

export const ESTIMATE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  NEEDS_CLARIFICATION: "bg-yellow-100 text-yellow-700",
  READY_FOR_REVIEW: "bg-blue-100 text-blue-700",
  SENT: "bg-purple-100 text-purple-700",
  VIEWED: "bg-indigo-100 text-indigo-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DEPOSIT_PAID: "bg-emerald-100 text-emerald-700",
  SCHEDULED: "bg-teal-100 text-teal-700",
  IN_PROGRESS: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-800",
  BALANCE_DUE: "bg-red-100 text-red-700",
  PAID_IN_FULL: "bg-emerald-100 text-emerald-800",
  LOST: "bg-gray-100 text-gray-500",
};
