"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";

// Define the shape of a line item
type LineItem = {
  id: number | string; // Can be DB ID (number) or temp ID (string)
  description: string;
  quantity: number; // Match backend model
  unit_price: number; // Match backend model
};

// VAT Rate
const VAT_RATE = 0.07; // 7%

// Your backend API URL
const API_URL = "http://localhost:8000";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();

  const id = params.id as string; // This is the i_id from the URL

  // --- State for all form fields ---
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");
  const [paymentTerm, setPaymentTerm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // --- 1. Fetch existing invoice data on load ---
  React.useEffect(() => {
    if (!id || !token) return;

    const fetchInvoice = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/invoice/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Failed to fetch invoice details.");
        }
        const data = await response.json();

        // --- 2. Pre-populate the form with fetched data ---
        setInvoiceNumber(data.invoice_number);
        setCustomerName(data.customer_name);
        setCustomerAddress(data.customer_address);
        setPaymentTerm(data.payment_term);
        
        // Format the items from the DB to match our local state
        const formattedItems = data.items.map((item: any) => ({
          id: item.item_id, // Use the real database ID
          description: item.description,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price), // Ensure it's a number
        }));
        setLineItems(formattedItems);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchInvoice();
  }, [id, token]); // Re-run if ID or token changes

  // --- Line Item Handlers ---
  const handleLineItemChange = (
    id: number | string,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (field === "quantity" || field === "unit_price") {
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
    const newId = `temp-${Math.random()}`; 
    setLineItems([
      ...lineItems,
      { id: newId, description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const handleRemoveItem = (id: number | string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // --- Calculations ---
  const subtotal = React.useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  }, [lineItems]);

  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;

  // --- 3. Handle the UPDATE (PUT) request ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!token) {
      setError("You are not logged in.");
      setIsLoading(false);
      return;
    }

    // Format items for the backend (match InvoiceUpdate model)
    const formattedItems = lineItems.map(({ description, quantity, unit_price }) => ({
      description,
      quantity,
      unit_price,
    }));

    // This payload matches your backend's InvoiceUpdate model
    const payload = {
      customer_name: customerName,
      customer_address: customerAddress,
      payment_term: paymentTerm,
      itemlist: formattedItems,
    };

    try {
      const response = await fetch(`${API_URL}/invoice/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update invoice.");
      }

      alert("Invoice updated successfully!");
      router.push("/invoices"); // Go back to the list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. Loading/Error states for the page ---
  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading invoice...</p>
      </div>
    );
  }

  if (error && !isFetching) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[50vh]">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={() => router.push("/invoices")} className="mt-4">Back to List</Button>
      </div>
    );
  }

  // --- 5. The Form ---
  return (
    <form
      onSubmit={handleUpdate}
      className="max-w-4xl mx-auto p-6 space-y-8 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20"
    >
      <h2 className="text-3xl font-bold text-center">
        Edit Invoice: {invoiceNumber}
      </h2>

      {/* --- Invoice Information --- */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Invoice Information:</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Invoice Number"
            className="bg-gray-200 text-black border-primary border-2 rounded-none"
            value={invoiceNumber}
            disabled // The Invoice Number (INV-2025...) cannot be edited
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
            placeholder="Payment Terms (e.g. Net 30 Days)"
            className="bg-white text-black border-primary border-2 rounded-none"
            value={paymentTerm}
            onChange={(e) => setPaymentTerm(e.target.value)}
            required
          />
        </div>
      </section>

      {/* --- Invoice Line Items --- */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold">Invoice:</h3>
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
                value={item.quantity}
                onChange={(e) =>
                  handleLineItemChange(item.id, "quantity", e.target.value)
                }
              />
              <Input
                type="number"
                placeholder="999.00"
                className="col-span-2 bg-white text-black border-primary border-2 rounded-none"
                value={item.unit_price}
                onChange={(e) =>
                  handleLineItemChange(item.id, "unit_price", e.target.value)
                }
              />
              <span className="col-span-2 text-right">
                {(item.quantity * item.unit_price).toFixed(2)}
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

      {/* --- Totals Section --- */}
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

      {/* --- Action Buttons --- */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="secondary"
          className="font-bold"
          disabled={isLoading}
          onClick={() => router.push("/invoices")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="default"
          className="font-bold"
          disabled={isLoading}
        >
          {isLoading ? "Saving Changes..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}