"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

// Define the shape of a line item
type LineItem = {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
};

// VAT Rate
const VAT_RATE = 0.07; // 7%

// Your backend API URL
const API_URL = "http://localhost:8000";

// --- Helper Function to generate date string ---
const getFormattedDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

export default function CreateQuotationPage() {
  const router = useRouter();
  const { token } = useAuth();

  // State for line items
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: 1, description: "", qty: 1, unitPrice: 0 },
  ]);

  // --- Add state for the new Quotation ID ---
  const [quotationId, setQuotationId] = React.useState("");

  // 4. Add state for customer fields
  const [customerName, setCustomerName] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");

  // 5. Add loading and error states
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // --- Auto-generate a suggested Quotation ID on load ---
  React.useEffect(() => {
    const suggestedId = `Q-${getFormattedDate(new Date())}-`;
    setQuotationId(suggestedId);
  }, []); // Empty array means this runs once on mount

  // --- Line Item Handlers (Unchanged) ---
  const handleLineItemChange = (
    id: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (field === "qty" || field === "unitPrice") {
            const numValue = parseFloat(value as string);
            return { ...item, [field]: isNaN(numValue) ? 0 : numValue };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleAddItem = () => {
    const newId = (lineItems.at(-1)?.id ?? 0) + 1;
    setLineItems([
      ...lineItems,
      { id: newId, description: "", qty: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (id: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // --- Calculations (Unchanged) ---
  const subtotal = React.useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  }, [lineItems]);

  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;

  // --- 1. NEW GENERIC FUNCTION ---
  // This function will be called by both "Save" and "Submit"
  const handleCreateQuotation = async (status: "Draft" | "Submitted") => {
    setIsLoading(true);
    setError(null);

    if (!token) {
      setError("You are not logged in. Please log in again.");
      setIsLoading(false);
      return;
    }

    // Format the line items to match the backend
    const formattedItems = lineItems.map(({ description, qty, unitPrice }) => ({
      description: description,
      quantity: qty,
      unit_price: unitPrice,
    }));

    // Build the payload with the correct status
    const payload = {
      quotation_number: quotationId,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_email: customerEmail,
      itemlist: formattedItems,
      status: status, // <-- Send the correct status
    };

    try {
      const response = await fetch(`${API_URL}/quotation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create quotation.");
      }

      alert(`Quotation saved as ${status}!`);
      router.push("/quotations"); // Redirect on success
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. handleSubmit now calls the generic function with "Submitted" ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateQuotation("Submitted");
  };

  // --- 3. handleSaveDraft calls the generic function with "Draft" ---
  const handleSaveDraft = () => {
    handleCreateQuotation("Draft");
  };

  return (
    // 4. Hook up the form's onSubmit
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto p-6 space-y-8 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20"
    >
      <h2 className="text-3xl font-bold text-center">Create a Quotation:</h2>

      {/* --- Quotation Information (Customer) --- */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Quotation Information:</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Quotation ID (e.g. Q-YYYYMMDD-001)"
            className="bg-white text-black border-primary border-2 rounded-none"
            value={quotationId}
            onChange={(e) => setQuotationId(e.target.value)}
            required
          />
          <Input
            placeholder="Customer Name"
            className="bg-white text-black border-primary border-2 rounded-none"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
          <Input
            placeholder="Customer Address"
            className="bg-white text-black border-primary border-2 rounded-none"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            required
          />
          <Input
            placeholder="Customer Email"
            type="email"
            className="bg-white text-black border-primary border-2 rounded-none"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            required
          />
        </div>
      </section>

      {/* --- Quotation Line Items (Unchanged) --- */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Quotation:</h3>
          <Button type="button" size="icon" onClick={handleAddItem}>
            <Plus />
          </Button>
        </div>
        <div className="grid grid-cols-12 gap-2 p-2 bg-gray-700 rounded-lg font-bold">
          <span className="col-span-1">No.</span>
          <span className="col-span-5">Description</span>
          <span className="col-span-1">Qty.</span>
          <span className="col-span-2">Unit Price</span>
          <span className="col-span-2">Total</span>
          <span className="col-span-1"></span>
        </div>
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-1 text-center">{index + 1}</span>
              <Input
                placeholder="Item 1"
                className="col-span-5 bg-white text-black border-primary border-2 rounded-none"
                value={item.description}
                onChange={(e) =>
                  handleLineItemChange(item.id, "description", e.target.value)
                }
              />
              <Input
                type="number"
                placeholder="1"
                className="col-span-1 bg-white text-black border-primary border-2 rounded-none"
                value={item.qty}
                onChange={(e) =>
                  handleLineItemChange(item.id, "qty", e.target.value)
                }
              />
              <Input
                type="number"
                placeholder="999.00"
                className="col-span-2 bg-white text-black border-primary border-2 rounded-none"
                value={item.unitPrice}
                onChange={(e) =>
                  handleLineItemChange(item.id, "unitPrice", e.target.value)
                }
              />
              <span className="col-span-2 text-right">
                {(item.qty * item.unitPrice).toFixed(2)}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="col-span-1"
                onClick={() => handleRemoveItem(item.id)}
                disabled={lineItems.length <= 1}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* --- Totals Section (Unchanged) --- */}
      <section className="flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold">Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">
              Vat Rate: ({(VAT_RATE * 100).toFixed(0)}%)
            </span>
            <span>{vatAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between p-2 bg-primary text-primary-foreground rounded-lg">
            <span className="font-bold text-lg">Grand Total:</span>
            <span className="font-bold text-lg">{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Show error message if it exists */}
      {error && (
        <p className="text-red-500 text-sm text-center font-bold">{error}</p>
      )}

      {/* --- 5. Hook up the new handleSaveDraft function --- */}
      <div className="flex justify-end gap-4">
        <Button
          type="button" // <-- MUST be type="button"
          variant="secondary"
          className="font-bold"
          disabled={isLoading}
          onClick={handleSaveDraft} // <-- Add onClick
        >
          Save (Draft)
        </Button>
        <Button
          type="submit" // <-- This triggers the form's onSubmit
          variant="default"
          className="font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  );
}