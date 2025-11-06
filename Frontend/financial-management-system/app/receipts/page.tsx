"use client";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { redirect } from "next/navigation";

// --- MOCK DATA ---
const userReceipts = [
  { id: "RC-20251105-001", status: "Pending" },
  { id: "RC-20251105-002", status: "Pending" },
  { id: "RC-20251105-003", status: "Approved" },
  { id: "RC-20251105-004", status: "Rejected" },
  { id: "RC-20251105-005", status: "Rejected" },
  { id: "RC-20251105-006", status: "Pending" },
  { id: "RC-20251105-007", status: "Approved" },
];
const adminReceipts = [
  { id: "RC-20251105-101", status: "Pending" },
  { id: "RC-20251105-102", status: "Pending" },
  { id: "RC-20251105-103", status: "Pending" },
  { id: "RC-20251105-104", status: "Approved" },
  { id: "RC-20251105-105", status: "Rejected" },
  { id: "RC-20251105-106", status: "Rejected" },
  { id: "RC-20251105-107", status: "Approved" },
];

export default function ReceiptsPage() {
  // TEMPORARY: we can test by being user or admin
  const [mockRole, setMockRole] = React.useState<"User" | "Admin">("User");
  const isUser = mockRole === "User";
  const mockUser = { name: "Test User" }; 

  return (
    <div className="space-y-6">
      {/* TEMPORARY UI*/}
      <div className="absolute top-60 right-8 p-4 bg-gray-300 rounded-lg space-y-2">
        <h4 className="font-bold">Test UI As:</h4>
        <Button onClick={() => setMockRole("User")} variant={isUser ? "default" : "secondary"}>User</Button>
        <Button onClick={() => setMockRole("Admin")} variant={!isUser ? "default" : "secondary"}>Admin</Button>
      </div>

      <div className="flex items-center justify-between bg-primary p-4 ">
        <h2 className="text-2xl font-bold text-primary-foreground">
          Welcome back, {mockUser.name}!
        </h2>
        {!isUser && (
          <Button 
            onClick={() => redirect("/logs")}
            className="bg-white text-black font-bold hover:bg-gray-200">
            Logs
          </Button>
        )}
      </div>

      <h3 className="text-3xl font-bold">
        {isUser ? "Your Receipts:" : "Pending Receipts:"}
      </h3>

      <div className="space-y-4">
        {isUser 
          ? <UserReceiptsList /> 
          : <AdminReceiptsList />
        }
      </div>
    </div>
  );
}


// Regular User:
function UserReceiptsList() {
  const pendingReceipts = userReceipts.filter(
    (q) => q.status === "Pending"
  );
  const approvedReceipts = userReceipts.filter(
    (q) => q.status === "Approved"
  );
  const rejectedReceipts = userReceipts.filter(
    (q) => q.status === "Rejected"
  );

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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Button variant="secondary">Details</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Button variant="secondary">Details</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Button variant="secondary">Details</Button>
          </div>
        </div>
      ))}
    </>
  );
}

// Admins:
function AdminReceiptsList() {
  const pendingReceipts = adminReceipts.filter(
    (q) => q.status === "Pending"
  );
  const approvedReceipts = adminReceipts.filter(
    (q) => q.status === "Approved"
  );
  const rejectedReceipts = adminReceipts.filter(
    (q) => q.status === "Rejected"
  );

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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Button variant="secondary">Details</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Button variant="secondary">Details</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Button variant="secondary">Details</Button>
          </div>
        </div>
      ))}
    </>
  );
}