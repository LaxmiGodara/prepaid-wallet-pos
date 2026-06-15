

import type { Metadata } from "next";

import LoginForm from "../setup/_components/LoginForm";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return <LoginForm />;
}