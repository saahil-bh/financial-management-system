// app/(main)/invoices/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";

// --- STATIC COMPANY INFORMATION ---
const STATIC_COMPANY_INFO = {
  name: "MyFinan$e Solutions",
  address: "Faculty of ICT, Mahidol University",
  email: "saahil@myfinance.com",
  logoUrl: "/MyFinance.png",
  taxID: "420420",
};

// --- STATIC BANK INFORMATION ---
const STATIC_BANK_INFO = {
  bankName: "KBank",
  accountName: "MyFinance Co. Ltd.",
  accountNumber: "1-234-5678-90",
  swiftCode: "3333",
};

// --- MOCK INVOICE DATA ---
// (We'll use the same data as the quotation for this example)
const mockInvoiceData = {
  id: "INV-20251105-001", // Note: Changed to INV-
  paymentTerms: "Due upon receipt",
  customerInfo: {
    name: "Phurinat Intawichian",
    address: "515 Uniloft Salaya",
    email: "phurinat.int@student.mahidol.edu",
  },
  date: "November 5, 2025",
  lineItems: [
    { id: 1, description: "Dildo", qty: 1, unitPrice: 5000 },
    { id: 2, description: "George Floyd Inhaler", qty: 69, unitPrice: 50 },
    { id: 3, description: "Flight to Epstein Island", qty: 1, unitPrice: 299999 },
    { id: 4, description: "Baby Oil", qty: 10000, unitPrice: 150 },
  ],
  vatRate: 0.07,
};

export default function InvoicePdfPage() {
  const params = useParams();
  const id = params.id as string; // This is the ID from the URL

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Create the final data object for the PDF
  const pdfData = {
    ...mockInvoiceData,
    id: id, // Override mock ID with the one from the URL
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading PDF...</p>
      </div>
    );
  }

  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <InvoiceDocument
        data={pdfData}
        companyInfo={STATIC_COMPANY_INFO}
        bankInfo={STATIC_BANK_INFO}
      />
    </PDFViewer>
  );
}