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
  i_id: number; // We use this to find the invoice & quotation
  u_id: string;
  receipt_number: string;
  status: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  created_at: string;
}

// --- NEW HELPER: InvoiceLinkButton ---
// Fetches the Invoice Number from the i_id
function InvoiceLinkButton({ i_id, token }: { i_id: number; token: string | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    if (!token || !i_id) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch the invoice by its ID
      const response = await api.get(`/invoice/${i_id}`);
      if (!response.data || !response.data.invoice_number) {
        throw new Error("Invoice number not found.");
      }
      // 2. Navigate to the invoice details page
      router.push(`/invoices/number/${response.data.invoice_number}`);
    } catch (err: any) {
      setError(err.message || "Failed to find invoice.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return <Button variant="secondary" disabled>Error</Button>;
  }

  return (
    <Button variant="secondary" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "..." : "Invoice"}
    </Button>
  );
}

// --- NEW HELPER: QuotationLinkButton (for Receipts) ---
// Fetches the Invoice, then the Quotation
function QuotationLinkButton({ i_id, token }: { i_id: number; token: string | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [q_id, setQ_id] = React.useState<number | null>(null);

  // 1. Fetch the invoice on load to see if a q_id exists
  React.useEffect(() => {
    if (!token || !i_id) return;

    const findQuotationId = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/invoice/${i_id}`);
        if (response.data && response.data.q_id) {
          setQ_id(response.data.q_id);
        }
      } catch (err) {
        console.error("Failed to check for q_id:", err);
      } finally {
        setIsLoading(false);
      }
    };
    findQuotationId();
  }, [i_id, token]);

  const handleClick = async () => {
    if (!token || !q_id) return;

    setIsLoading(true);
    setError(null);
    try {
      // 2. Now that we have the q_id, fetch the quotation
      const response = await api.get(`/quotation/${q_id}`);
      if (!response.data || !response.data.quotation_number) {
        throw new Error("Quotation number not found.");
      }
      // 3. Navigate to the quotation details page
      router.push(`/quotations/number/${response.data.quotation_number}`);
    } catch (err: any) {
      setError(err.message || "Failed to find quotation.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // If no q_id was found, don't render the button
  if (!q_id) {
    return null;
  }
  
  if (error) {
    return <Button variant="secondary" disabled>Error</Button>;
  }

  return (
    <Button variant="secondary" onClick={handleClick} disabled={isLoading}>
      {isLoading ? "..." : "Quotation"}
    </Button>
  );
}
// --- END OF HELPERS ---


export default function ReceiptsPage() {
  const { user, token } = useAuth(); // Get token
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
        {/* Removed Logs button from User view, which was incorrect */}
      </div>

      <h3 className="text-3xl font-bold">
        {isUser ? "Your Receipts:" : "All Receipts:"}
      </h3>

      <div className="space-y-4">
        {isUser ? (
          <UserReceiptsList receipts={receipts} token={token} />
        ) : (
          <AdminReceiptsList
            receipts={receipts}
            token={token} // Pass token
            onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}

// --- Regular User ---
function UserReceiptsList({ receipts, token }: { receipts: Receipt[], token: string | null }) {
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
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            {/* --- FIX: ADDED HELPER BUTTONS --- */}
            <QuotationLinkButton i_id={q.i_id} token={token} />
            <InvoiceLinkButton i_id={q.i_id} token={token} />
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
  token: string | null; // Add token
  onUpdateStatus: (receiptId: number, status: "Approved" | "Rejected") => void;
}

function AdminReceiptsList({ receipts, token, onUpdateStatus }: AdminListProps) {
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
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            {/* --- FIX: ADDED HELPER BUTTONS --- */}
            <QuotationLinkButton i_id={q.i_id} token={token} />
            <InvoiceLinkButton i_id={q.i_id} token={token} />
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
            <Link href={`/receipts/number/${q.receipt_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}