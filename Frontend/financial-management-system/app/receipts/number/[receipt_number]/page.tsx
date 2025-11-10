"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import axios from "axios";
import {
  ReceiptDocument,
  type ReceiptData,
  type CompanyInfo,
} from "@/components/pdf/ReceiptDocument";

// --- API CLIENT WITH AUTH ---
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- HELPER TYPES ---
// Type for the receipt data from /receipt/number/{num}
type ApiReceiptResponse = {
  r_id: number;
  i_id: number;
  u_id: string;
  receipt_number: string;
  status: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  created_at: string;
};

// Type for the invoice data from /invoice/{id}
type ApiInvoiceResponse = {
  invoice_number: string;
  customer_name: string;
  customer_address: string;
  // ... other invoice fields we don't need
};

// Type for company profile from /company-profile
type ApiCompanyInfo = {
  company_name: string;
  company_address: string;
  phone: string;
  email: string;
  tax_id: string;
  // logoUrl: string; // Add this if you have it
};

export default function ReceiptDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const receipt_number = params.receipt_number as string;

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!receipt_number) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch Company Profile
        const companyRes = await api.get<ApiCompanyInfo>("/company-profile");
        const companyData = {
          ...companyRes.data,
          logoUrl: "/logo.png", // Hardcoding logo, you can fetch this
        };
        setCompanyInfo(companyData);

        // 2. Fetch the Receipt by its number
        // This requires the new endpoint in receipt.py
        const receiptRes = await api.get<ApiReceiptResponse>(
          `/receipt/number/${receipt_number}`
        );
        const receipt = receiptRes.data;

        // 3. Fetch the related Invoice to get customer info
        const invoiceRes = await api.get<ApiInvoiceResponse>(
          `/invoice/${receipt.i_id}`
        );
        const invoice = invoiceRes.data;

        // 4. Combine data for the PDF
        const combinedData: ReceiptData = {
          receipt_number: receipt.receipt_number,
          payment_date: receipt.payment_date,
          customer_name: invoice.customer_name,
          customer_address: invoice.customer_address,
          i_id: receipt.i_id,
          invoice_number: invoice.invoice_number,
          payment_method: receipt.payment_method,
          amount: receipt.amount,
        };

        setReceiptData(combinedData);
      } catch (err) {
        console.error("Failed to fetch receipt data:", err);
        setError("Failed to load receipt. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [receipt_number]);

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header Bar */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
        <Button
          variant="outline"
          onClick={() => router.push("/receipts")}
          className="text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Receipts
        </Button>
        <h1 className="text-xl font-bold text-white">
          Receipt: {receipt_number}
        </h1>
        <div className="w-32"></div> {/* Spacer */}
      </div>

      {/* PDF Viewer or Loading/Error State */}
      <div className="flex-grow w-full">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <p>Loading document...</p>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">{error}</p>
          </div>
        )}
        {!isLoading && !error && receiptData && companyInfo && (
          <PDFViewer width="100%" height="100%">
            <ReceiptDocument data={receiptData} companyInfo={companyInfo} />
          </PDFViewer>
        )}
      </div>
    </div>
  );
}