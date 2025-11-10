"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link"; // Import Link
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext"; // Use standard alias
import axios from "axios";

// --- API CLIENT WITH AUTH FIX ---
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// --- END OF FIX ---

// Updated Receipt interface based on your database schema
interface Receipt {
  r_id: number;
  i_id: number;
  u_id: string;
  receipt_number: string;
  status: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  created_at: string;
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [receipts, setReceipts] = React.useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchReceipts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const endpoint = user.role === "Admin" ? "/receipt/" : "/receipt/me/";
      const response = await api.get(endpoint);
      setReceipts(response.data);
    } catch (err) {
      console.error("Failed to fetch receipts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchReceipts();
    }
  }, [user]);

  const handleUpdateStatus = async (
    receiptId: number,
    newStatus: "Approved" | "Rejected"
  ) => {
    try {
      await api.put(`/receipt/${receiptId}/approve?status=${newStatus}`);
      fetchReceipts(); // Refresh the list
    } catch (err) {
      console.error(`Failed to ${newStatus} receipt:`, err);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading receipts...</p>
      </div>
    );
  }

  const isUser = user.role === "User";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-primary p-4 rounded-lg">
        <h2 className="text-2xl font-bold text-primary-foreground">
          Welcome back, {user?.name || "User"}!
        </h2>
        {!isUser && (
          <Button
            onClick={() => router.push("/logs")}
            className="bg-white text-black font-bold hover:bg-gray-200"
          >
            Logs
          </Button>
        )}
      </div>

      <h3 className="text-3xl font-bold">
        {isUser ? "Your Receipts:" : "All Receipts:"}
      </h3>

      <div className="space-y-4">
        {isUser ? (
          <UserReceiptsList receipts={receipts} />
        ) : (
          <AdminReceiptsList
            receipts={receipts}
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}

// --- Regular User ---
function UserReceiptsList({ receipts }: { receipts: Receipt[] }) {
  const pendingReceipts = receipts.filter((q) => q.status === "Pending");
  const approvedReceipts = receipts.filter((q) => q.status === "Approved");
  const rejectedReceipts = receipts.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Pending */}
      {pendingReceipts.length > 0 && (
        <div className="bg-chart-4 p-3 rounded-t-lg">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingReceipts.map((q) => (
        <div
          key={q.r_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.receipt_number}</span>
          <div className="space-x-2">
            {/* --- UPDATED BUTTON --- */}
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedReceipts.length > 0 && (
        <div className="bg-primary p-3 rounded-t-lg mt-4">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedReceipts.map((q) => (
        <div
          key={q.r_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.receipt_number}</span>
          <div className="space-x-2">
            {/* --- UPDATED BUTTONS --- */}
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Quotation</Button>
            <Button variant="secondary">Invoice</Button>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedReceipts.length > 0 && (
        <div className="bg-destructive p-3 rounded-t-lg mt-4">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedReceipts.map((q) => (
        <div
          key={q.r_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.receipt_number}</span>
          <div className="space-x-2">
            {/* --- UPDATED BUTTON --- */}
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

// --- Admins ---
interface AdminListProps {
  receipts: Receipt[];
  onUpdateStatus: (receiptId: number, status: "Approved" | "Rejected") => void;
}

function AdminReceiptsList({ receipts, onUpdateStatus }: AdminListProps) {
  const pendingReceipts = receipts.filter((q) => q.status === "Pending");
  const approvedReceipts = receipts.filter((q) => q.status === "Approved");
  const rejectedReceipts = receipts.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Pending */}
      {pendingReceipts.length > 0 && (
        <div className="bg-chart-4 p-3 rounded-t-lg">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingReceipts.map((q) => (
        <div
          key={q.r_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.receipt_number}</span>
          <div className="space-x-2">
            {/* --- UPDATED BUTTON --- */}
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button
              variant="default"
              onClick={() => onUpdateStatus(q.r_id, "Approved")}
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              onClick={() => onUpdateStatus(q.r_id, "Rejected")}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedReceipts.length > 0 && (
        <div className="bg-primary p-3 rounded-t-lg mt-4">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedReceipts.map((q) => (
        <div
          key={q.r_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.receipt_number}</span>
          <div className="space-x-2">
            {/* --- UPDATED BUTTONS --- */}
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Quotation</Button>
            <Button variant="secondary">Invoice</Button>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedReceipts.length > 0 && (
        <div className="bg-destructive p-3 rounded-t-lg mt-4">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedReceipts.map((q) => (
        <div
          key={q.r_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.receipt_number}</span>
          <div className="space-x-2">
            {/* --- UPDATED BUTTON --- */}
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}