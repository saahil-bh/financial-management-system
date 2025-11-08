"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

interface Invoice {
  id: string;
  status: string;
  // ... add any other fields the API returns
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      return;
    }

    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const endpoint = user.role === "Admin" ? "/invoices" : "/invoices/me";
        
        const response = await api.get(endpoint);
        setInvoices(response.data);
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading invoices...</p>
      </div>
    );
  }

  const isUser = user.role === "User";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-primary p-4 ">
        <h2 className="text-2xl font-bold text-primary-foreground">
          Welcome back, {user.id}!
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
          <UserInvoiceList invoices={invoices} />
        ) : (
          <AdminInvoiceList invoices={invoices} />
        )}
      </div>
    </div>
  );
}

// --- Regular User (Updated to accept props) ---
function UserInvoiceList({ invoices }: { invoices: Invoice[] }) {
  const draftInvoices = invoices.filter((q) => q.status === "Draft");
  const pendingInvoices = invoices.filter((q) => q.status === "Pending");
  const approvedInvoices = invoices.filter((q) => q.status === "Approved");
  const rejectedInvoices = invoices.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Drafts */}
      {draftInvoices.length > 0 && (
        <div className="bg-gray-700 p-3">
          <span className="font-bold text-lg">Drafts</span>
        </div>
      )}
      {draftInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Edit</Button>
            <Button variant="default">Submit</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </div>
      ))}

      {/* Pending */}
      {pendingInvoices.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
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
      {approvedInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Quotation</Button>
            <Button variant="secondary">Receipt</Button>
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
      {rejectedInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

// --- Admins (Updated to accept props) ---
function AdminInvoiceList({ invoices }: { invoices: Invoice[] }) {
  const pendingInvoices = invoices.filter((q) => q.status === "Pending");
  const approvedInvoices = invoices.filter((q) => q.status === "Approved");
  const rejectedInvoices = invoices.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Pending */}
      {pendingInvoices.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="default">Approve</Button>
            <Button variant="destructive">Reject</Button>
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
      {approvedInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Quotation</Button>
            <Button variant="secondary">Receipt</Button>
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
      {rejectedInvoices.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-70Player"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/invoices/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}