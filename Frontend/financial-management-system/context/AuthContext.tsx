// context/AuthContext.tsx
"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface User {
  id: string;
  role: "Admin" | "User";
  name: string; // TEMPORARY --> NEED TO FIX
  // Add other user fields like name, email if you want
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // On app load, check if we are already logged in
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      setToken(storedToken);
      fetchUser(); // Fetch user details if we have a token
    }
  }, []);

  // Function to fetch the user's data (like their role)
  // This is a separate call from login
  const fetchUser = async () => {
    try {
      // 1. You MUST ask your colleague to create this endpoint
      // 2. It should use the token to find the user and return their info
      const response = await api.get("/users/me"); 
      setUser(response.data); // e.g., { id: "user1", role: "ADMIN" }
      router.push("/quotations"); // Redirect to quotations after successful load
    } catch (err) {
      // Token is invalid
      logout();
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await api.post("/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { access_token } = response.data;
      localStorage.setItem("access_token", access_token);
      setToken(access_token);
      
      // IMPORTANT: Now that we have the token, fetch the user's details
      await fetchUser();

    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid ID or password");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to easily use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};