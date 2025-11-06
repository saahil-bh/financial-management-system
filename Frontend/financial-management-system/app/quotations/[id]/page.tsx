"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { QuotationDocument } from "@/components/pdf/QuotationDocument";

// STATIC COMPANY INFORMATION
const STATIC_COMPANY_INFO = {
  name: "MyFinan$e Solutions",
  address: "Faculty of ICT, Mahidol University",
  email: "saahil@myfinance.com",
  logoUrl: "/MyFinance.png",
  taxID: "420420",
};

const mockQuotationData = {
  id: "Q-20251105-001", // This ID will be overridden
  customerInfo: {
    name: "Phurinat Intawichian",
    address: "515 Uniloft Salaya",
    email: "phurinat.int@student.mahidol.edu",
  },
  date: "November 5, 2025",
  validUntil: "December 5, 2025",
  lineItems: [
    { id: 1, description: "Dildo", qty: 1, unitPrice: 5000 },
    { id: 2, description: "George Floyd Inhaler", qty: 69, unitPrice: 50 },
    { id: 3, description: "Flight to Epstein Island", qty: 1, unitPrice: 299999 },
    { id: 4, description: "Baby Oil", qty: 10000, unitPrice: 150 }, // Fixed duplicate ID
  ],
  vatRate: 0.07,
};

export default function QuotationPdfPage() {
  const params = useParams();
  const id = params.id as string; // This is the correct ID from the URL

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- THIS IS THE FIX ---
  // 1. Create a new data object for the PDF
  const pdfData = {
    ...mockQuotationData, // 2. Copy all the mock data
    id: id, // 3. OVERRIDE the 'id' with the one from the URL
  };
  // --- END OF FIX ---

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading PDF...</p>
      </div>
    );
  }

  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      {/* 4. Pass the new, corrected pdfData object as the prop */}
      <QuotationDocument
        data={pdfData}
        companyInfo={STATIC_COMPANY_INFO}
      />
    </PDFViewer>
  );
}