"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";

interface Receipt {
  id: string;
  status: string;
  name: string;
  // ... add any other fields the API returns
}

export default function ReceiptsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [receipts, setReceipts] = React.useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  
  React.useEffect(() => {
    if (!user) {
      return;
    }

    const fetchReceipts = async () => {
      setIsLoading(true);
      try {
        
        const endpoint = user.role === "Admin" 
          ? "/receipts"
          : "/receipts/me";
        
        const response = await api.get(endpoint);
        setReceipts(response.data);
      } catch (err) {
        console.error("Failed to fetch receipts:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipts();
  }, [user]);

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

      <div className="flex items-center justify-between bg-primary p-4 ">
        <h2 className="text-2xl font-bold text-primary-foreground">
          Welcome back, {user.name}!
        </h2>
        {!isUser && (
          <Button
            onClick={() => router.push("/logs")} // Use router.push
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
        {/* Pass the fetched receipts down as a prop */}
        {isUser ? (
          <UserReceiptsList receipts={receipts} />
        ) : (
          <AdminReceiptsList receipts={receipts} />
        )}
      </div>
    </div>
  );
}

// --- Regular User (Updated to accept props) ---
function UserReceiptsList({ receipts }: { receipts: Receipt[] }) {
  // Filter the 'receipts' prop, not the old mock data
  const pendingReceipts = receipts.filter((q) => q.status === "Pending");
  const approvedReceipts = receipts.filter((q) => q.status === "Approved");
  const rejectedReceipts = receipts.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Pending */}
      {pendingReceipts.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingReceipts.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            {/* TODO: Add Link when /receipts/[id] page exists */}
            {/* <Link href={`/receipts/${q.id}`}> */}
              <Button variant="secondary">Details</Button>
            {/* </Link> */}
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedReceipts.length > 0 && (
        <div className="bg-primary p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedReceipts.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            {/* <Link href={`/receipts/${q.id}`}> */}
              <Button variant="secondary">Details</Button>
            {/* </Link> */}
            <Button variant="secondary">Quotation</Button>
            <Button variant="secondary">Invoice</Button>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedReceipts.length > 0 && (
        <div className="bg-destructive p-3">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedReceipts.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            {/* <Link href={`/receipts/${q.id}`}> */}
              <Button variant="secondary">Details</Button>
            {/* </Link> */}
          </div>
        </div>
      ))}
    </>
  );
}

// --- Admins (Updated to accept props) ---
function AdminReceiptsList({ receipts }: { receipts: Receipt[] }) {
  // Filter the 'receipts' prop, not the old mock data
  const pendingReceipts = receipts.filter((q) => q.status === "Pending");
  const approvedReceipts = receipts.filter((q) => q.status === "Approved");
  const rejectedReceipts = receipts.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Pending */}
      {pendingReceipts.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingReceipts.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            {/* <Link href={`/receipts/${q.id}`}> */}
              <Button variant="secondary">Details</Button>
            {/* </Link> */}
            <Button variant="default">Approve</Button>
            <Button variant="destructive">Reject</Button>
          </div>
        </div>
      ))}

      {/* Approved */}
      {approvedReceipts.length > 0 && (
        <div className="bg-primary p-3">
          <span className="font-bold text-lg text-primary-foreground">
            Approved
          </span>
        </div>
      )}
      {approvedReceipts.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            {/* <Link href={`/receipts/${q.id}`}> */}
              <Button variant="secondary">Details</Button>
            {/* </Link> */}
            <Button variant="secondary">Quotation</Button>
            <Button variant="secondary">Invoice</Button>
          </div>
        </div>
      ))}

      {/* Rejected */}
      {rejectedReceipts.length > 0 && (
        <div className="bg-destructive p-3">
          <span className="font-bold text-lg text-destructive-foreground">
            Rejected
          </span>
        </div>
      )}
      {rejectedReceipts.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
          <span>{q.id}</span>
          <div className="space-x-2">
            {/* <Link href={`/receipts/${q.id}`}> */}
              <Button variant="secondary">Details</Button>
            {/* </Link> */}
          </div>
        </div>
      ))}
    </>
  );
}