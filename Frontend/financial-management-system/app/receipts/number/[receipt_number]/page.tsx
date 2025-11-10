"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { ReceiptDocument } from "@/components/pdf/ReceiptDocument"; // Use alias
import { useAuth } from "@/context/AuthContext"; // Use alias
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { ArrowLeft } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// --- Helper Interfaces ---

// 1. Matches GET /company-profile
interface ApiCompanyProfile {
  company_name: string;
  company_address: string;
  tax_id: string;
  phone: string;
  email: string;
}

// 2. Matches GET /receipt/number/{receipt_number}
interface ApiReceiptResponse {
  r_id: number;
  i_id: number;
  receipt_number: string;
  status: string;
  amount: number;
  payment_date: string;
  approver_name: string | null;
  // ... other fields
}

// 3. Matches GET /invoice/{invoice_id} (we only need a subset)
interface ApiInvoiceResponse {
  invoice_number: string;
  customer_name: string;
  customer_address: string;
  // ... other fields
}

// 4. Matches props for <ReceiptDocument> (Company Info)
// This must match what ReceiptDocument expects
interface PdfCompanyInfo {
  company_name: string;
  company_address: string;
  email: string;
  phone: string;
  logoUrl: string; // The placeholder logo
  tax_id: string;
}

// 5. Matches props for <ReceiptDocument> (Receipt Data)
// This must match what ReceiptDocument expects
interface PdfData {
  receipt_number: string;
  payment_date: string;
  amount: number;
  status: string;
  approver_name: string | null;
  // Nested invoice/customer info
  invoice: {
    invoice_number: string;
    customer_name: string;
    customer_address: string;
  };
}

// --- Dynamic PDFViewer ---
// Prevents SSR issues, as seen in your template
const DynamicPDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function ReceiptPdfPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth(); // Get token from AuthContext

  const receipt_number = params.receipt_number as string;

  const [isClient, setIsClient] = useState(false);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<PdfCompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch and Map Data
  useEffect(() => {
    if (!receipt_number || !token) {
      return; // Wait for number and token
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch company profile and receipt details
        const [companyRes, receiptRes] = await Promise.all([
          fetch(`${API_URL}/company-profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/receipt/number/${receipt_number}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!companyRes.ok) {
          throw new Error("Failed to fetch company profile.");
        }
        if (!receiptRes.ok) {
          const err = await receiptRes.json();
          throw new Error(err.detail || "Failed to fetch receipt details.");
        }

        const companyData: ApiCompanyProfile = await companyRes.json();
        const receiptData: ApiReceiptResponse = await receiptRes.json();

        // --- Now fetch the related invoice ---
        const invoiceRes = await fetch(`${API_URL}/invoice/${receiptData.i_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!invoiceRes.ok) {
          throw new Error("Failed to fetch related invoice details.");
        }
        const invoiceData: ApiInvoiceResponse = await invoiceRes.json();

        // --- Map Company Data (using placeholder logo) ---
        const mappedCompanyInfo: PdfCompanyInfo = {
          company_name: companyData.company_name,
          company_address: companyData.company_address,
          email: companyData.email,
          tax_id: companyData.tax_id,
          phone: companyData.phone,
          // --- USING YOUR EXACT LOGO METHOD ---
          logoUrl: "/MyFinance.png",
        };
        setCompanyInfo(mappedCompanyInfo);

        // --- Map Receipt Data ---
        const mappedPdfData: PdfData = {
          receipt_number: receiptData.receipt_number,
          payment_date: receiptData.payment_date,
          amount: receiptData.amount,
          status: receiptData.status,
          approver_name: receiptData.approver_name,
          invoice: {
            invoice_number: invoiceData.invoice_number,
            customer_name: invoiceData.customer_name,
            customer_address: invoiceData.customer_address,
          },
        };
        setPdfData(mappedPdfData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [receipt_number, token]); // Re-run if number or token changes

  // --- Handle Loading/Error/Client States ---
  if (!isClient || isLoading) {
    return (
      <div className="flex flex-col h-screen w-full">
        <header className="flex items-center space-x-4 p-4 bg-primary text-primary-foreground">
           <ArrowLeft className="h-5 w-5" />
          <h1 className="text-xl font-bold">Loading Document...</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <p>Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen w-full">
         <header className="flex items-center space-x-4 p-4 bg-destructive text-destructive-foreground">
           <Button variant="outline" size="icon" onClick={() => router.back()} className="bg-transparent border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground/20">
             <ArrowLeft className="h-5 w-5" />
           </Button>
          <h1 className="text-xl font-bold">Error</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-destructive mb-4">Error: {error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!pdfData || !companyInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Could not load receipt data.</p>
      </div>
    );
  }

  // --- Render PDF ---
  // This includes the green header bar you wanted
  return (
    <div className="flex flex-col h-screen w-full">
      <header className="flex items-center justify-between p-4 bg-primary text-primary-foreground">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary-foreground">
            {pdfData.receipt_number}
          </h1>
        </div>
      </header>
      <div className="flex-1">
        <DynamicPDFViewer style={{ width: "100%", height: "100%" }}>
          <ReceiptDocument data={pdfData} companyInfo={companyInfo} />
        </DynamicPDFViewer>
      </div>
    </div>
  );
}