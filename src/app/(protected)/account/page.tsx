

import type { Metadata } from "next";

import AccountContent from "./_components/AccountContent";

export const metadata: Metadata = {
  title: "My Account",
};

export default function AccountPage() {
  return <AccountContent />;
}