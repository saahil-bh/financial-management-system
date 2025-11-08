// app/(auth)/login/page.tsx
"use client";
import Image from "next/image";
import MyFinance from "@/components/svgs/MyFinance.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";
// 1. Import the useAuth hook
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [id, setId] = React.useState("");
  const [password, setPassword] = React.useState("");
  
  // 2. Get everything from the auth context
  const { login, isLoading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // 3. Just call the login function from the context!
    await login(id, password);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-black p-8">
      {/* ... (your Image component) ... */}
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
        {/* ... (your Input and Label components) ... */}
        <div>
          <Label htmlFor="id" className="sr-only">ID</Label>
          <Input
            id="id"
            type="text"
            placeholder="ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            className="bg-white text-black rounded-none"
          />
        </div>

        <div>
          <Label htmlFor="password" className="sr-only">Password</Label>
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
        
        {/* 4. The error and isLoading states come directly from the context */}
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