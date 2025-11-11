"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type LineItem = {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
};

const VAT_RATE = 0.07;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getFormattedDate = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

export default function CreateInvoicePage() {
  const router = useRouter();
  const { token } = useAuth();

  const [invoiceNumber, setInvoiceNumber] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");
  const [paymentTerm, setPaymentTerm] = React.useState("");

  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: 1, description: "", qty: 1, unitPrice: 0 },
  ]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const suggestedId = `INV-${getFormattedDate(new Date())}-`;
    setInvoiceNumber(suggestedId);
  }, []);

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

  const subtotal = React.useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  }, [lineItems]);

  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;

  const handleCreateInvoice = async (status: "Draft" | "Submitted") => {
    setIsLoading(true);
    setError(null);

    if (!token) {
      setError("You are not logged in. Please log in again.");
      setIsLoading(false);
      return;
    }

    const formattedItems = lineItems.map(({ description, qty, unitPrice }) => ({
      description: description,
      quantity: qty,
      unit_price: unitPrice,
    }));

    const payload = {
      invoice_number: invoiceNumber,
      customer_name: customerName,
      customer_address: customerAddress,
      payment_term: paymentTerm,
      itemlist: formattedItems,
      status: status,
      q_id: null,
    };

    try {
      const response = await fetch(`${API_URL}/invoice`, { // Use POST /invoice
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create invoice.");
      }

      alert(`Invoice saved as ${status}!`);
      router.push("/invoices");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateInvoice("Submitted");
  };

  const handleSaveDraft = () => {
    handleCreateInvoice("Draft");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto p-6 space-y-8 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20"
    >
      <h2 className="text-3xl font-bold text-center">Create an Invoice:</h2>

      {/* --- Connect Invoice Information inputs to state --- */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Invoice Information:</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Invoice Number (e.g. INV-YYYYMMDD-001)"
            className="bg-white text-black border-primary border-2 rounded-none"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
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

      {/* --- Show error message --- */}
      {error && (
        <p className="text-red-500 text-sm text-center font-bold">{error}</p>
      )}

      {/* --- Hook up Action Buttons --- */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="secondary"
          className="font-bold"
          onClick={handleSaveDraft}
          disabled={isLoading}
        >
          Save (Draft)
        </Button>
        <Button
          type="submit"
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