"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Trash2, Upload } from "lucide-react";

// Define the shape of a line item
type LineItem = {
  id: number;
  description: string;
  qty: number;
  unitPrice: number;
};

// VAT Rate
const VAT_RATE = 0.07; // 7%

export default function CreateQuotationPage() {

  const [quotationNumber, setQuotationNumber] = React.useState("");
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [validUntil, setValidUntil] = React.useState<Date | undefined>();

  // State for line items
  const [lineItems, setLineItems] = React.useState<LineItem[]>([
    { id: 1, description: "", qty: 1, unitPrice: 0 },
  ]);

  // --- Line Item Handlers ---

  const handleLineItemChange = (
    id: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    setLineItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          // Ensure qty and unitPrice are treated as numbers
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
    // Don't remove the last item
    if (lineItems.length <= 1) return;
    setLineItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  // --- Calculations ---
  const subtotal = React.useMemo(() => {
    return lineItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  }, [lineItems]);

  const vatAmount = subtotal * VAT_RATE;
  const grandTotal = subtotal + vatAmount;

  return (
    // Main form card
    <form className="max-w-4xl mx-auto p-6 space-y-8 border-2 border-primary rounded-2xl shadow-lg shadow-primary/20">
      <h2 className="text-3xl font-bold text-center">Create an Invoice:</h2>

      {/* --- Invoice Information --- */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Invoice Information:</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="Invoice Number" className="bg-white text-black border-primary border-2 rounded-none" />
          <Input placeholder="Customer Name" className="bg-white text-black border-primary border-2 rounded-none" />
          <Input placeholder="Customer Address" className="bg-white text-black border-primary border-2 rounded-none" />
          <Input placeholder="Payment Terms" className="bg-white text-black border-primary border-2 rounded-none" />
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

        {/* Header Row */}
        <div className="grid grid-cols-12 gap-2 p-2 bg-gray-700 rounded-lg font-bold">
          <span className="col-span-1">No.</span>
          <span className="col-span-5">Description</span>
          <span className="col-span-1">Qty.</span>
          <span className="col-span-2">Unit Price</span>
          <span className="col-span-2">Total</span>
          <span className="col-span-1"></span> {/* For delete button */}
        </div>

        {/* Dynamic Item Rows */}
        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
              <span className="col-span-1 text-center">{index + 1}</span>
              <Input
                placeholder="Item 1"
                className="col-span-5 bg-white text-black border-primary border-2 rounded-none"
                value={item.description}
                onChange={(e) => handleLineItemChange(item.id, "description", e.target.value)}
              />
              <Input
                type="number"
                placeholder="1"
                className="col-span-1 bg-white text-black border-primary border-2 rounded-none"
                value={item.qty}
                onChange={(e) => handleLineItemChange(item.id, "qty", e.target.value)}
              />
              <Input
                type="number"
                placeholder="999.00"
                className="col-span-2 bg-white text-black border-primary border-2 rounded-none"
                value={item.unitPrice}
                onChange={(e) => handleLineItemChange(item.id, "unitPrice", e.target.value)}
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
          {/* Subtotal */}
          <div className="flex justify-between">
            <span className="font-semibold">Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          {/* VAT */}
          <div className="flex justify-between">
            <span className="font-semibold">Vat Rate: ({(VAT_RATE * 100).toFixed(0)}%)</span>
            <span>{vatAmount.toFixed(2)}</span>
          </div>
          {/* Grand Total */}
          <div className="flex justify-between p-2 bg-primary text-primary-foreground rounded-lg">
            <span className="font-bold text-lg">Grand Total:</span>
            <span className="font-bold text-lg">{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* --- Action Buttons --- */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="secondary" className="font-bold">
          Save (Draft)
        </Button>
        <Button type="submit" variant="default" className="font-bold">
          Submit
        </Button>
      </div>
    </form>
  );
}