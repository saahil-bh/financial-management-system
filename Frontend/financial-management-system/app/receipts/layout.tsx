// app/(main)/layout.tsx
"use client";

import Image from "next/image";
import MyFinance from "@/components/svgs/MyFinance.svg";
import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { redirect } from "next/navigation";
// We will import this for real later
// import { useAuth } from "@/context/AuthContext";

// 1. Define links with roles
const navLinks = [
  { label: "Quotations", href: "/quotations", roles: ["ADMIN", "USER"] },
  { label: "Invoices", href: "/invoices", roles: ["ADMIN", "USER"] },
  { label: "Receipts", href: "/receipts", roles: ["ADMIN", "USER"] },
  { label: "Logs", href: "/logs", roles: ["ADMIN"] },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // const { user, logout } = useAuth(); // We'll use this later

  // 2. Add a temporary mock user (and a toggle for testing)
  // We'll replace this with the real user from useAuth()
  const [mockRole, setMockRole] = React.useState<"USER" | "ADMIN">("USER");
  const mockUser = { role: mockRole };

  const handleLogout = () => {
    // TEMPORARY:
        console.log("Logging out...");
        redirect("/login");
    // logout();
  };

  // 3. Filter the links based on the user's role
  const accessibleLinks = navLinks.filter((link) =>
    link.roles.includes(mockUser.role)
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
          {/* 4. Map over the *filtered* links */}
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
                      ? "text-primary" // Green
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

      {/* PAGE CONTENT */}
      <main className="p-8">
        {/* This is a TEMPORARY UI toggle. You can delete this later.
        */}
        <div className="absolute top-32 right-8 p-4 bg-gray-800 rounded-lg space-y-2 z-10">
          <h4 className="font-bold">Test UI As:</h4>
          <Button
            onClick={() => setMockRole("USER")}
            variant={mockRole === "USER" ? "default" : "secondary"}
          >
            User
          </Button>
          <Button
            onClick={() => setMockRole("ADMIN")}
            variant={mockRole === "ADMIN" ? "default" : "secondary"}
          >
            Admin
          </Button>
        </div>

        {children}
      </main>
    </div>
  );
}