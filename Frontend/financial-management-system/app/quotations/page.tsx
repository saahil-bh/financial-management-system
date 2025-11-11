"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Quotation {
  q_id: number;
  quotation_number: string;
  customer_name: string;
  status: string;
  total: number;
  tax: number;
  u_id: string;
  items: any[];
}

function InvoiceLinkButton({ q_id, token }: { q_id: number; token: string | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    if (!token || !q_id) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/invoice/by_quotation/${q_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Invoice not found for this quotation.");
      }
      
      const data = await response.json();
      
      if (!data.invoice_number) {
         throw new Error("Invoice number not found in response.");
      }

      router.push(`/invoices/number/${data.invoice_number}`);

    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
     return <Button variant="secondary" disabled>Error</Button>
  }

  return (
    <Button 
      variant="secondary"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? "..." : "Invoice"}
    </Button>
  );
}

export default function QuotationsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchQuotations = React.useCallback(async () => {
    if (!user || !token) return;

    setIsLoading(true);
    setError(null);
    try {
      const endpoint =
        user.role === "Admin" ? "/quotation" : "/quotation/me";
        
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch quotations");
      }
      const data = await response.json();
      setQuotations(data);
    } catch (err: any) {
      console.error("Failed to fetch quotations:", err);
      setError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [user, token]);

  React.useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading quotations...</p>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[50vh]">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchQuotations} className="mt-4">Try Again</Button>
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
            onClick={() => router.push("/quotations/create")}
            className="bg-white text-black font-bold hover:bg-gray-200"
          >
            Create Quotation
          </Button>
        )}
      </div>

      <h3 className="text-3xl font-bold">
        {isUser ? "Your Quotations:" : "All Quotations:"}
      </h3>

      <div className="space-y-4">
        {isUser ? (
          <UserQuotationList
            quotations={quotations}
            token={token}
            onUpdate={fetchQuotations}
          />
        ) : (
          <AdminQuotationList
            quotations={quotations}
            token={token}
            onUpdate={fetchQuotations}
          />
        )}
      </div>
    </div>
  );
}

interface UserListProps {
  quotations: Quotation[];
  token: string | null;
  onUpdate: () => void;
}

function UserQuotationList({ quotations, token, onUpdate }: UserListProps) {
  const [isUpdating, setIsUpdating] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (quotationId: number) => {
    if (!token) return;
    setIsUpdating(quotationId);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/quotation/${quotationId}/submit`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to submit quotation.");
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };
  
  const handleDelete = async (quotationId: number) => {
    if (!token) return;
    setIsUpdating(quotationId);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/quotation/${quotationId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to delete quotation.");
      }
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const draftQuotations = quotations.filter((q) => q.status === "Draft");
  const pendingQuotations = quotations.filter((q) => q.status === "Submitted");
  const approvedQuotations = quotations.filter((q) => q.status === "Approved");
  const rejectedQuotations = quotations.filter((q) => q.status === "Rejected");

  return (
    <>
      {error && <p className="text-red-500 text-center">{error}</p>}

      {/* Drafts */}
      {draftQuotations.length > 0 && (
        <div className="bg-gray-700 p-3">
          <span className="font-bold text-lg">Drafts</span>
        </div>
      )}
      {draftQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">
            
            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary" disabled={isUpdating === q.q_id}>
                Details
              </Button>
            </Link>
            
            <Link href={`/quotations/edit/${q.quotation_number}`}>
              <Button variant="secondary" disabled={isUpdating === q.q_id}>
                Edit
              </Button>
            </Link>
            
            <Button
              variant="default"
              onClick={() => handleSubmit(q.q_id)}
              disabled={isUpdating === q.q_id}
            >
              {isUpdating === q.q_id ? "..." : "Submit"}
            </Button>
            
            <Button
              variant="destructive"
              onClick={() => handleDelete(q.q_id)}
              disabled={isUpdating === q.q_id}
            >
              {isUpdating === q.q_id ? "..." : "Delete"}
            </Button>
          </div>
        </div>
      ))}

      {/* Submitted */}
      {pendingQuotations.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Submitted
          </span>
        </div>
      )}
      {pendingQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">

            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary" disabled={isUpdating === q.q_id}>
                Details
              </Button>
            </Link>

            <Link href={`/quotations/edit/${q.quotation_number}`}>
              <Button variant="secondary" disabled={isUpdating === q.q_id}>
                Edit
              </Button>
            </Link>

            <Button
              variant="destructive"
              onClick={() => handleDelete(q.q_id)}
              disabled={isUpdating === q.q_id}
            >
              {isUpdating === q.q_id ? "..." : "Delete"}
            </Button>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedQuotations.length > 0 && (
        <div className="bg-primary p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">

            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            
            <InvoiceLinkButton q_id={q.q_id} token={token} />

          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedQuotations.length > 0 && (
        <div className="bg-destructive p-3">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">

            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>

            <Button
              variant="destructive"
              onClick={() => handleDelete(q.q_id)}
              disabled={isUpdating === q.q_id}
            >
              {isUpdating === q.q_id ? "..." : "Delete"}
            </Button>
          </div>
        </div>
      ))}
    </>
  );
}

interface AdminListProps {
  quotations: Quotation[];
  token: string | null;
  onUpdate: () => void;
}

function AdminQuotationList({ quotations, token, onUpdate }: AdminListProps) {
  const [isUpdating, setIsUpdating] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleUpdateStatus = async (
    quotationId: number,
    newStatus: "Approved" | "Rejected"
  ) => {
    if (!token) {
      setError("Not authenticated");
      return;
    }
    setIsUpdating(quotationId);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/quotation/${quotationId}/approve?status=${newStatus}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || `Failed to ${newStatus.toLowerCase()} quotation.`);
      }

      onUpdate(); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const pendingQuotations = quotations.filter((q) => q.status === "Submitted");
  const approvedQuotations = quotations.filter((q) => q.status === "Approved");
  const rejectedQuotations = quotations.filter((q) => q.status === "Rejected");

  return (
    <>
      {error && <p className="text-red-500 text-center">{error}</p>}
      
      {/* Submitted */}
      {pendingQuotations.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Submitted
          </span>
        </div>
      )}
      {pendingQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">

            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary" disabled={isUpdating === q.q_id}>
                Details
              </Button>
            </Link>

            <Button
              variant="default"
              onClick={() => handleUpdateStatus(q.q_id, "Approved")}
              disabled={isUpdating === q.q_id}
            >
              {isUpdating === q.q_id ? "..." : "Approve"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleUpdateStatus(q.q_id, "Rejected")}
              disabled={isUpdating === q.q_id}
            >
              {isUpdating === q.q_id ? "..." : "Reject"}
            </Button>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedQuotations.length > 0 && (
        <div className="bg-primary p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">

            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            
            <InvoiceLinkButton q_id={q.q_id} token={token} />

          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedQuotations.length > 0 && (
        <div className="bg-destructive p-3">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedQuotations.map((q) => (
        <div
          key={q.q_id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span className="w-1/4">{q.quotation_number}</span>
          <span className="w-1/4 pl-70">{q.customer_name}</span>
          <div className="space-x-2 ml-auto">

            <Link href={`/quotations/number/${q.quotation_number}`}>
              <Button variant="secondary">Details</Button>
            </Link>

          </div>
        </div>
      ))}
    </>
  );
}