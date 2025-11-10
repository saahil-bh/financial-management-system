"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API_URL = "http://localhost:8000";

// --- 1. UPDATED INVOICE INTERFACE ---
// This now matches your backend's InvoiceResponse model
interface Invoice {
  i_id: number;
  q_id: number | null;
  invoice_number: string;
  customer_name: string;
  status: string;
  total: number;
  tax: number | null;
  u_id: string;
  items: any[];
}

export default function InvoicesPage() {
  const { user, token } = useAuth(); // Get token
  const router = useRouter();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // --- 2. UPDATED fetchInvoices ---
  const fetchInvoices = React.useCallback(async () => {
    if (!user || !token) return;

    setIsLoading(true);
    setError(null);
    try {
      // --- FIX: Use correct endpoints ---
      const endpoint =
        user.role === "Admin" ? "/invoice" : "/invoice/me";
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }
      const data = await response.json();
      setInvoices(data);
    } catch (err: any) {
      console.error("Failed to fetch invoices:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading invoices...</p>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[50vh]">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchInvoices} className="mt-4">Try Again</Button>
      </div>
    );
  }

  const isUser = user.role === "User";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-primary p-4 ">
        <h2 className="text-2xl font-bold text-primary-foreground">
          Welcome back, {user.name}!
        </h2>
        {isUser && (
          <Button
            onClick={() => router.push("/invoices/create")}
            className="bg-white text-black font-bold hover:bg-gray-200"
          >
            Create Invoice
          </Button>
        )}
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
        {isUser ? "Your Invoices:" : "All Invoices:"}
      </h3>

      <div className="space-y-4">
        {isUser ? (
          // --- 3. Pass token and onUpdate ---
          <UserInvoiceList
            invoices={invoices}
            token={token}
            onUpdate={fetchInvoices}
          />
        ) : (
          <AdminInvoiceList
            invoices={invoices}
            token={token}
            onUpdate={fetchInvoices}
          />
        )}
      </div>
    </div>
  );
}

// --- 4. UPDATED UserInvoiceList ---
interface UserListProps {
  invoices: Invoice[];
  token: string | null;
  onUpdate: () => void;
}

function UserInvoiceList({ invoices, token, onUpdate }: UserListProps) {
  const [isUpdating, setIsUpdating] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // --- API Handlers ---
  const handleSubmit = async (invoiceId: number) => {
    if (!token) return;
    setIsUpdating(invoiceId);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/invoice/${invoiceId}/submit`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to submit invoice.");
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };
  
  const handleDelete = async (invoiceId: number) => {
    if (!token) return;
    setIsUpdating(invoiceId);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/invoice/${invoiceId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to delete invoice.");
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  // --- FIX: Statuses match DB model ---
  const draftInvoices = invoices.filter((inv) => inv.status === "Draft");
  const pendingInvoices = invoices.filter((inv) => inv.status === "Submitted");
  const approvedInvoices = invoices.filter((inv) => inv.status === "Approved");
  const rejectedInvoices = invoices.filter((inv) => inv.status === "Rejected");
  const paidInvoices = invoices.filter((inv) => inv.status === "Paid");

  return (
    <>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Drafts */}
      {draftInvoices.length > 0 && (
        <div className="bg-gray-700 p-3">
          <span className="font-bold text-lg">Drafts</span>
        </div>
      )}
      {draftInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary" disabled={isUpdating === inv.i_id}>
                Details
              </Button>
            </Link>
            <Link href={`/invoices/edit/${inv.i_id}`}>
              <Button variant="secondary" disabled={isUpdating === inv.i_id}>
                Edit
              </Button>
            </Link>
            <Button
              variant="default"
              onClick={() => handleSubmit(inv.i_id)}
              disabled={isUpdating === inv.i_id}
            >
              {isUpdating === inv.i_id ? "..." : "Submit"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDelete(inv.i_id)}
              disabled={isUpdating === inv.i_id}
            >
              {isUpdating === inv.i_id ? "..." : "Delete"}
            </Button>
          </div>
        </div>
      ))}

      {/* Submitted (Pending) */}
      {pendingInvoices.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Submitted
          </span>
        </div>
      )}
      {pendingInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedInvoices.length > 0 && (
        <div className="bg-primary p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            {inv.q_id && <Link href={`/quotations/${inv.q_id}`}>
              <Button variant="secondary">Quotation</Button>
            </Link>}
            <Button variant="secondary">Receipt</Button>
          </div>
        </div>
      ))}
      
      {/* Paid */}
      {paidInvoices.length > 0 && (
        <div className="bg-green-600 p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Paid
          </span>
        </div>
      )}
      {paidInvoices.map((inv) => (
         <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
           <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedInvoices.length > 0 && (
        <div className="bg-destructive p-3">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

// --- 5. UPDATED AdminInvoiceList ---
interface AdminListProps {
  invoices: Invoice[];
  token: string | null;
  onUpdate: () => void;
}

function AdminInvoiceList({ invoices, token, onUpdate }: AdminListProps) {
  const [isUpdating, setIsUpdating] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleUpdateStatus = async (
    invoiceId: number,
    newStatus: "Approved" | "Rejected"
  ) => {
    if (!token) {
      setError("Not authenticated");
      return;
    }
    setIsUpdating(invoiceId);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/invoice/${invoiceId}/approve?status=${newStatus}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || `Failed to ${newStatus.toLowerCase()} invoice.`);
      }

      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  // --- FIX: Statuses match DB model ---
  const pendingInvoices = invoices.filter((inv) => inv.status === "Submitted");
  const approvedInvoices = invoices.filter((inv) => inv.status === "Approved");
  const rejectedInvoices = invoices.filter((inv) => inv.status === "Rejected");
  const paidInvoices = invoices.filter((inv) => inv.status === "Paid");


  return (
    <>
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      {/* Submitted (Pending) */}
      {pendingInvoices.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Submitted
          </span>
        </div>
      )}
      {pendingInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary" disabled={isUpdating === inv.i_id}>
                Details
              </Button>
            </Link>
            <Button
              variant="default"
              onClick={() => handleUpdateStatus(inv.i_id, "Approved")}
              disabled={isUpdating === inv.i_id}
            >
              {isUpdating === inv.i_id ? "..." : "Approve"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus(inv.i_id, "Rejected")}
              disabled={isUpdating === inv.i_id}
            >
              {isUpdating === inv.i_id ? "..." : "Reject"}
            </Button>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedInvoices.length > 0 && (
        <div className="bg-primary p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            {inv.q_id && <Link href={`/quotations/${inv.q_id}`}>
              <Button variant="secondary">Quotation</Button>
            </Link>}
            <Button variant="secondary">Receipt</Button>
          </div>
        </div>
      ))}
      
      {/* Paid */}
      {paidInvoices.length > 0 && (
        <div className="bg-green-600 p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Paid
          </span>
        </div>
      )}
      {paidInvoices.map((inv) => (
         <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
           <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedInvoices.length > 0 && (
        <div className="bg-destructive p-3">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedInvoices.map((inv) => (
        <div
          key={inv.i_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{inv.invoice_number}</span>
          <span>{inv.customer_name}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${inv.i_id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}