// /app/login/page.tsx

"use client";
import Image from "next/image";
import MyFinance from "@/components/svgs/MyFinance.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  // --- CHANGE 1: Rename 'username' state to 'email' for clarity ---
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const { login, isLoading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // --- CHANGE 2: Pass 'email' to the login function ---
    await login(email, password);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-black p-8">
      {/* ... (Image component) ... */}
      <Image
        src={MyFinance}
        alt="MyFinance Logo"
        width={800}
        height={200}
        priority
      />

      <form
        onSubmit={handleLogin}
        className="w-full max-w-xs rounded-lg border border-white p-6 space-y-4"
      >
        {/* --- CHANGE 3: Update the input field for Email --- */}
        <div>
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email" // <-- Use 'email' type
            placeholder="Email" // <-- Change placeholder
            value={email}
            onChange={(e) => setEmail(e.target.value)} // <-- Update state
            required
            className="bg-white text-black rounded-none"
          />
        </div>

        <div>
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white text-black rounded-none"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full text-lg font-semibold"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>
    </main>
  );
}