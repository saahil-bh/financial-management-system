"use client";
import * as React from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../lib/api";

interface Log {
  l_id: number;
  actor_id: number;
  action: string;
  document_id: number;
  timestamp: string;
}

export default function LogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const isAdmin = user?.role === "Admin";

  React.useEffect(() => {
    if (user && isAdmin) {
      const fetchLogs = async () => {
        setIsLoading(true);
        try {
          const response = await api.get("/logs");
          setLogs(response.data);
        } catch (err) {
          console.error("Failed to fetch logs:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchLogs();
    } else if (user) {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading user session...</p>
      </div>
    );
  }

  if (isLoading && isAdmin) {
      return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-3xl font-bold">System Activity Logs</h3>

      {isAdmin ? (
        <LogsList logs={logs} />
      ) : (
        <AccessDenied />
      )}
    </div>
  );
}

function LogsList({ logs }: { logs: Log[] }) {
  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case "approved":
        return "text-primary";
      case "rejected":
        return "text-destructive";
      case "submitted":
      case "created":
        return "text-warning";
      default:
        return "text-white";
    }
  };

  return (
    <div className="space-y-3">
      
      <div className="flex p-3 rounded-lg bg-gray-700 font-bold">
        <span className="w-1/4">Timestamp</span>
        <span className="w-1/4">Actor ID</span>
        <span className="w-1/4">Action</span>
        <span className="w-1/4 pl-20">Document ID</span>
      </div>

      {logs.map((log) => (
        <div
          key={log.l_id}
          className="flex p-3 rounded-lg border border-gray-700 items-center"
        >
          <span className="w-1/4 font-mono text-sm">{log.timestamp}</span>
          <span className="w-1/4">{log.actor_id}</span>
          <span className={`w-1/4 font-bold ${getActionColor(log.action)}`}>
            {log.action}
          </span>
          <span className="w-1/4 pl-30">{log.document_id}</span>
        </div>
      ))}
    </div>
  );
}

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