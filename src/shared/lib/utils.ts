import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins classes; later Tailwind classes win over earlier ones (e.g. a page's `h-8` beats a variant's `h-9`). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeRange(start: string, end: string) {
  return `${start} – ${end}`;
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
