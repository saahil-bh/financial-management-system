"use client";
import Image from "next/image";
import MyFinance from "@/components/svgs/MyFinance.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const { login, isLoading, error } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-black p-8">
      {/* Company Logo */}
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
        <div>
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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