"use client";
import Image from "next/image";
import MyFinance from "@/components/svgs/MyFinance.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as React from "react";

export default function LoginPage() {
  const [id, setId] = React.useState("");
  const [password, setPassword] = React.useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Logging in with:", { id, password });
    // Call auth logic here:
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-black p-8">
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

        <Button
          type="submit"
          className="w-full text-lg font-semibold"
        >
          Log In
        </Button>
      </form>
    </main>
  );
}