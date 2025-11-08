"use client";

import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Import useRouter
import { useAuth } from "@/context/AuthContext"; // Import the Auth hook
import api from "@/lib/api"; // Import the API client

// Define the type for a quotation
interface Quotation {
  id: string;
  status: string;
  // ... add any other fields your API returns
}

export default function QuotationsPage() {
  const { user } = useAuth(); // Get the logged-in user from the context
  const router = useRouter(); // Hook for navigation
  const [quotations, setQuotations] = React.useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // This effect runs when the 'user' object is loaded
  React.useEffect(() => {
    // Don't fetch data until we know who the user is
    if (!user) {
      return;
    }

    const fetchQuotations = async () => {
      setIsLoading(true);
      try {
        // Determine which API endpoint to call based on the user's role
        const endpoint = user.role === "Admin" 
          ? "/quotations"    // Admin gets all quotations
          : "/quotations/me";  // User gets only their own
        
        const response = await api.get(endpoint);
        setQuotations(response.data);
      } catch (err) {
        console.error("Failed to fetch quotations:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuotations();
  }, [user]); // This dependency array ensures the effect re-runs if the user changes

  // --- Show a loading state while fetching or if user is not yet loaded ---
  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading quotations...</p>
      </div>
    );
  }

  // --- Once loaded, render the smart UI ---
  const isUser = user.role === "User";

  return (
    <div className="space-y-6">
      {/* No more temporary UI toggle */}

      <div className="flex items-center justify-between bg-primary p-4 ">
        <h2 className="text-2xl font-bold text-primary-foreground">
          {/* Use the real user's ID (or name, if you fetch it) */}
          Welcome back, {user.name}!
        </h2>
        {isUser && (
          <Button
            onClick={() => router.push("/quotations/create")} // Use router.push
            className="bg-white text-black font-bold hover:bg-gray-200"
          >
            Create Quotation
          </Button>
        )}
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
        {isUser ? "Your Quotations:" : "All Quotations:"}
      </h3>

      <div className="space-y-4">
        {/* Pass the fetched quotations down as a prop */}
        {isUser ? (
          <UserQuotationList quotations={quotations} />
        ) : (
          <AdminQuotationList quotations={quotations} />
        )}
      </div>
    </div>
  );
}

// --- Regular User (Updated to accept props) ---
function UserQuotationList({ quotations }: { quotations: Quotation[] }) {
  // Filter the 'quotations' prop, not the old mock data
  const draftQuotations = quotations.filter((q) => q.status === "Draft");
  const pendingQuotations = quotations.filter((q) => q.status === "Pending");
  const approvedQuotations = quotations.filter((q) => q.status === "Approved");
  const rejectedQuotations = quotations.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Drafts */}
      {draftQuotations.length > 0 && (
        <div className="bg-gray-700 p-3">
          <span className="font-bold text-lg">Drafts</span>
        </div>
      )}
      {draftQuotations.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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
        <div className="bg-chart-4 p-3"> {/* Note: You have a custom color 'bg-chart-4' here */}
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingQuotations.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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

// --- Admins (Updated to accept props) ---
function AdminQuotationList({ quotations }: { quotations: Quotation[] }) {
  // Filter the 'quotations' prop, not the old mock data
  const pendingQuotations = quotations.filter((q) => q.status === "Pending");
  const approvedQuotations = quotations.filter((q) => q.status === "Approved");
  const rejectedQuotations = quotations.filter((q) => q.status === "Rejected");

  return (
    <>
      {/* Pending */}
      {pendingQuotations.length > 0 && (
        <div className="bg-chart-4 p-3"> {/* Note: You have a custom color 'bg-chart-4' here */}
          <span className="font-bold text-lg text-warning-foreground">
            Pending
          </span>
        </div>
      )}
      {pendingQuotations.map((q) => (
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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
        <div
          key={q.id}
          className="p-3 rounded-lg flex items-center justify-between border border-gray-700"
        >
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