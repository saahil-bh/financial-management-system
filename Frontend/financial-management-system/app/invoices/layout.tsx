"use client";
import Image from "next/image";
import MyFinance from "@/components/svgs/MyFinance.svg";
import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { label: "Quotations", href: "/quotations", roles: ["Admin", "User"] },
  { label: "Invoices", href: "/invoices", roles: ["Admin", "User"] },
  { label: "Receipts", href: "/receipts", roles: ["Admin", "User"] },
  { label: "Logs", href: "/logs", roles: ["Admin"] },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  // Loading
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading user session...</p>
      </div>
    );
  }

  const accessibleLinks = navLinks.filter((link) =>
    link.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 border-b border-gray-700">
        <Image
          src={MyFinance}
          alt="MyFinance Logo"
          width={200}
          height={60}
          priority
        />

        <nav className="flex gap-4">
          {accessibleLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "text-primary"
                      : "text-white hover:bg-gray-700"
                  }
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Button
          onClick={handleLogout}
          variant="default"
          className="font-semibold"
        >
          Log Out
        </Button>
      </header>

      <main className="p-8">
        {children}
      </main>
    </div>
  );
}