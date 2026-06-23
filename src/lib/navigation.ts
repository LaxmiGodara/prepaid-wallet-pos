import { STAFF_ROLES } from "@/lib/constants";

export interface NavItem {
  href: string;
  label: string;
  allowedRoles: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    allowedRoles: [
      STAFF_ROLES.SUPER_ADMIN,
      STAFF_ROLES.ADMIN,
      STAFF_ROLES.CASHIER,
    ],
  },
  {
    href: "/staff",
    label: "Staff",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/members",
    label: "Members",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/cards",
    label: "Cards",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/wallets",
    label: "Wallets",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/recharges",
    label: "Recharges",
    allowedRoles: [
      STAFF_ROLES.SUPER_ADMIN,
      STAFF_ROLES.ADMIN,
      STAFF_ROLES.CASHIER,
    ],
  },
  {
    href: "/debits",
    label: "Debits",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/products",
    label: "Products",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/billing",
    label: "Billing",
    allowedRoles: [
      STAFF_ROLES.SUPER_ADMIN,
      STAFF_ROLES.ADMIN,
      STAFF_ROLES.CASHIER,
    ],
  },
  {
    href: "/transactions",
    label: "Transactions",
    allowedRoles: [
      STAFF_ROLES.SUPER_ADMIN,
      STAFF_ROLES.ADMIN,
      STAFF_ROLES.CASHIER,
    ],
  },
  {
    href: "/stock",
    label: "Stock",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
  {
    href: "/reports",
    label: "Reports",
    allowedRoles: [STAFF_ROLES.SUPER_ADMIN, STAFF_ROLES.ADMIN],
  },
];
