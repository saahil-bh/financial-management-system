"use client";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { Lock } from "lucide-react";

// --- MOCK DATA ---
const mockLogs = [
  {
    l_id: 1,
    actor_id: 101,
    action: "Approved",
    document_id: "Q001",
    timestamp: "2025-11-05 10:30:00",
  },
  {
    l_id: 2,
    actor_id: 101,
    action: "Rejected",
    document_id: "Q002",
    timestamp: "2025-11-05 10:32:00",
  },
  {
    l_id: 3,
    actor_id: 202,
    action: "Submitted",
    document_id: "Q003",
    timestamp: "2025-11-05 10:35:00",
  },
  {
    l_id: 4,
    actor_id: 203,
    action: "Created",
    document_id: "Q004",
    timestamp: "2025-11-05 10:40:00",
  },
  {
    l_id: 5,
    actor_id: 101,
    action: "Approved",
    document_id: "Q005",
    timestamp: "2025-11-05 10:42:00",
  },
  {
    l_id: 6,
    actor_id: 101,
    action: "Approved",
    document_id: "Q006",
    timestamp: "2025-11-05 10:42:00",
  },
  {
    l_id: 7,
    actor_id: 101,
    action: "Approved",
    document_id: "Q007",
    timestamp: "2025-11-05 10:42:00",
  },
  {
    l_id: 8,
    actor_id: 101,
    action: "Approved",
    document_id: "Q008",
    timestamp: "2025-11-05 10:42:00",
  },
];

export default function LogsPage() {
  const [mockRole, setMockRole] = React.useState<"User" | "Admin">("Admin");
  const isAdmin = mockRole === "Admin";

  return (
    <div className="space-y-6">
      {/* TEMPORARY: we can test by being user or admin */}
      <div className="absolute top-80 right-8 p-4 bg-gray-800 rounded-lg space-y-2">
        <h4 className="font-bold">Test UI As:</h4>
        <Button
          onClick={() => setMockRole("User")}
          variant={!isAdmin ? "default" : "secondary"}
        >
          User
        </Button>
        <Button
          onClick={() => setMockRole("Admin")}
          variant={isAdmin ? "default" : "secondary"}
        >
          Admin
        </Button>
      </div>

      <h3 className="text-3xl font-bold">System Activity Logs</h3>

      {isAdmin ? (
        <LogsList />
      ) : (
        <AccessDenied />
      )}
    </div>
  );
}

// --- ADMIN'S LOG LIST COMPONENT ---
function LogsList() {
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "approved":
        return "text-primary"; // Green
      case "rejected":
        return "text-destructive"; // Red
      case "submitted":
      case "created":
        return "text-warning"; // Yellow
      default:
        return "text-white";
    }
  };

  return (
    <div className="space-y-3">
      {/* HEADER ROW */}
      <div className="flex p-3 rounded-lg bg-gray-700 font-bold">
        <span className="w-1/4">Timestamp</span>
        <span className="w-1/4">Actor ID</span>
        <span className="w-1/4">Action</span>
        <span className="w-1/4">Document ID</span>
      </div>

      {/* LOG ROWS */}
      {mockLogs.map((log) => (
        <div
          key={log.l_id}
          className="flex p-3 rounded-lg border border-gray-700 items-center"
        >
          <span className="w-1/4 font-mono text-sm">{log.timestamp}</span>
          <span className="w-1/4">{log.actor_id}</span>
          <span className={`w-1/4 font-bold ${getActionColor(log.action)}`}>
            {log.action}
          </span>
          <span className="w-1/4">{log.document_id}</span>
        </div>
      ))}
    </div>
  );
}

// --- ACCESS DENIED COMPONENT ---
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 rounded-lg border-2 border-dashed border-destructive bg-destructive/10">
      <Lock size={64} className="text-destructive mb-4" />
      <h2 className="text-3xl font-bold text-destructive">Access Denied</h2>
      <p className="text-lg text-gray-300 mt-2">
        You do not have permission to view this page.
        <br />
        This area is restricted to Administrators.
      </p>
    </div>
  );
}