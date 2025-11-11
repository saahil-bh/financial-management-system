"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";

type LineItem = {
  id: number | string;
  description: string;
  quantity: number;
  unit_price: number;
};

const VAT_RATE = 0.07;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function EditQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();

  const quotation_number = params.quotation_number as string;

  const [databaseId, setDatabaseId] = React.useState<number | null>(null);
  const [lineItems, setLineItems] = React.useState<LineItem[]>([]);
  const [quotationNumber, setQuotationNumber] = React.useState("");
  const [customerName, setCustomerName] = React.useState("");
  const [customerAddress, setCustomerAddress] = React.useState("");
  const [customerEmail, setCustomerEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!quotation_number || !token) return;

    const fetchQuotation = async () => {
      setIsFetching(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/quotation/number/${quotation_number}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch quotation details.");
        }
        const data = await response.json();

        setDatabaseId(data.q_id);
        setQuotationNumber(data.quotation_number);
        setCustomerName(data.customer_name);
        setCustomerAddress(data.customer_address);
        setCustomerEmail(data.customer_email);
        
        const formattedItems = data.items.map((item: any) => ({
          id: item.item_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: parseFloat(item.unit_price),
        }));
        setLineItems(formattedItems);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsFetching(false);
      }
    };

    fetchQuotation();
  }, [quotation_number, token]);

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

  const subtotal = React.useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  }, [lineItems]);

  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!token || !databaseId) {
      setError("You are not logged in or the quotation ID is missing.");
      setIsLoading(false);
      return;
    }

    const formattedItems = lineItems.map(({ description, quantity, unit_price }) => ({
      description,
      quantity,
      unit_price,
    }));

    const payload = {
      customer_name: customerName,
      customer_address: customerAddress,
      customer_email: customerEmail,
      itemlist: formattedItems,
    };

    try {
      const response = await fetch(`${API_URL}/quotation/${databaseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update quotation.");
      }

      alert("Quotation updated successfully!");
      router.push("/quotations");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <p>Loading quotation...</p>
      </div>
    );
  }

  if (error && !isFetching) {
     return (
      <div className="flex flex-col justify-center items-center min-h-[50vh]">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={() => router.push("/quotations")} className="mt-4">Back to List</Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleUpdate}
      className="max-w-4xl mx-auto p-6 space-y-8 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20"
    >
      <h2 className="text-3xl font-bold text-center">
        Edit Quotation: {quotationNumber}
      </h2>

      {/* --- Quotation Information --- */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Quotation Information:</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Quotation ID"
            className="bg-gray-200 text-black border-primary border-2 rounded-none"
            value={quotationNumber}
            disabled
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

      {/* --- Quotation Line Items --- */}
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
          onClick={() => router.push("/quotations")}
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