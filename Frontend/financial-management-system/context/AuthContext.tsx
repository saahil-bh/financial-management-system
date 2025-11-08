"use client";

import React, { createContext, useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
// import api from "@/lib/api"; // <-- We are bypassing this for the test

// --- Your User interface ---
// (Make sure this matches your /users/me response)
interface User {
  u_id: string; 
  name: string;
  email: string;
  role: "Admin" | "User";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>; 
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Your API Base URL ---
// Make sure this matches your running backend
const API_URL = "http://localhost:8000";


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
      fetchUser(storedToken); // <-- Pass token to fetchUser
    }
  }, []);

  const fetchUser = async (currentToken: string) => {
    try {
      // --- Use fetch for this call too ---
      const response = await fetch(`${API_URL}/users/me`, {
        headers: {
          "Authorization": `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token is invalid");
      }

      const userData = await response.json();
      setUser(userData); 
      router.push("/quotations");
    } catch (err) {
      logout();
    }
  };

  // --- **** THIS IS THE MODIFIED FUNCTION **** ---
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      // --- We are using FETCH instead of api.post ---
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      if (!response.ok) {
        // Handle failed login
        const errorData = await response.json();
        throw new Error(errorData.detail || "Invalid Email or password");
      }

      // Login was successful
      const data = await response.json(); // data = { access_token: "...", token_type: "..." }
      
      localStorage.setItem("access_token", data.access_token);
      setToken(data.access_token);
      
      // Now that we have the token, fetch the user's details
      await fetchUser(data.access_token);

    } catch (err: any) {
      setError(err.message); // Use err.message since we threw a new Error
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