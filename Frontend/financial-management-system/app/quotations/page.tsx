"use client";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

// --- MOCK DATA ---
const userQuotations = [
  { id: "Q-20251105-001", status: "Draft" },
  { id: "Q-20251105-002", status: "Pending" },
  { id: "Q-20251105-003", status: "Approved" },
  { id: "Q-20251105-004", status: "Rejected" },
  { id: "Q-20251105-005", status: "Draft" },
  { id: "Q-20251105-006", status: "Pending" },
  { id: "Q-20251105-007", status: "Approved" },
];
const adminQuotations = [
  { id: "Q-20251105-101", status: "Pending" },
  { id: "Q-20251105-102", status: "Pending" },
  { id: "Q-20251105-103", status: "Pending" },
  { id: "Q-20251105-104", status: "Approved" },
  { id: "Q-20251105-105", status: "Rejected" },
  { id: "Q-20251105-106", status: "Rejected" },
  { id: "Q-20251105-107", status: "Approved" },
];

export default function QuotationsPage() {
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
        {isUser && (
          <Button 
            onClick={() => redirect("/quotations/create")}
            className="bg-white text-black font-bold hover:bg-gray-200">
            Create Quotation
          </Button>
        )}
        {!isUser && (
          <Button 
            onClick={() => redirect("/logs")}
            className="bg-white text-black font-bold hover:bg-gray-200">
            Logs
          </Button>
        )}
      </div>

      <h3 className="text-3xl font-bold">
        {isUser ? "Your Quotations:" : "Pending Quotations:"}
      </h3>

      <div className="space-y-4">
        {isUser 
          ? <UserQuotationList /> 
          : <AdminQuotationList />
        }
      </div>
    </div>
  );
}


// Regular User:
function UserQuotationList() {
  const draftQuotations = userQuotations.filter(
    (q) => q.status === "Draft"
  );
  const pendingQuotations = userQuotations.filter(
    (q) => q.status === "Pending"
  );
  const approvedQuotations = userQuotations.filter(
    (q) => q.status === "Approved"
  );
  const rejectedQuotations = userQuotations.filter(
    (q) => q.status === "Rejected"
  );

  return (
    <>
      {/* Drafts */}
      {draftQuotations.length > 0 && (
        <div className="bg-gray-700 p-3">
          <span className="font-bold text-lg">Drafts</span>
        </div>
      )}
      {draftQuotations.map((q) => (
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Edit</Button>
            <Button variant="default">Submit</Button>
            <Button variant="destructive">Delete</Button>
          </div>
        </div>
      ))}

      {/* Pending */}
      {pendingQuotations.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingQuotations.map((q) => (
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Edit</Button>
            <Button variant="destructive">Delete</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Invoice</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

// Admins:
function AdminQuotationList() {
  const pendingQuotations = adminQuotations.filter(
    (q) => q.status === "Pending"
  );
  const approvedQuotations = adminQuotations.filter(
    (q) => q.status === "Approved"
  );
  const rejectedQuotations = adminQuotations.filter(
    (q) => q.status === "Rejected"
  );

  return (
    <>
      {/* Pending */}
      {pendingQuotations.length > 0 && (
        <div className="bg-chart-4 p-3">
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingQuotations.map((q) => (
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="default">Approve</Button>
            <Button variant="destructive">Reject</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
            <Button variant="secondary">Invoice</Button>
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
        <div key={q.id} className="p-3 rounded-lg flex items-center justify-between border border-gray-700">
          <span>{q.id}</span>
          <div className="space-x-2">
            <Link href={`/quotations/${q.id}`}>
              <Button variant="secondary">Details</Button>
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}