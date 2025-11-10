"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const API_URL = "http://localhost:8000";

// --- Define types for the fetched data ---
interface InvoiceLineItem {
  item_id: number;
  description: string;
  quantity: number;
  unit_price: number;
}

interface FetchedInvoiceData {
  invoice_number: string;
  payment_term: string;
  customer_name: string;
  customer_address: string;
  items: InvoiceLineItem[];
  // We'll use the hardcoded VAT rate
}

interface FetchedCompanyInfo {
  company_name: string;
  company_address: string;
  email: string;
  tax_id: string;
}

// 1. FIX: Added type for Bank Info
interface FetchedBankInfo {
  bank_name: string;
  account_name: string;
  account_number: string;
  swift_code: string;
}

// --- Define types for the PDF component props ---
interface PdfData {
  id: string;
  paymentTerms: string;
  customerInfo: {
    name: string;
    address: string;
  };
  date: string;
  lineItems: {
    id: number;
    description: string;
    qty: number;
    unitPrice: number;
  }[];
  vatRate: number;
}

interface CompanyPdfInfo {
  name: string;
  address: string;
  email: string;
  logoUrl: string;
  taxID: string;
}

// 2. FIX: Added type for Bank Info Prop
interface BankPdfInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
}


export default function InvoicePdfPage() {
  const params = useParams();
  const { token } = useAuth();
  const invoice_number = params.invoice_number as string;

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State to hold the data for the PDF
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyPdfInfo | null>(null);
  // 3. FIX: Added state for Bank Info
  const [bankInfo, setBankInfo] = useState<BankPdfInfo | null>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  // 4. FIX: Fetch ALL real data from the API
  const fetchData = useCallback(async () => {
    if (!token || !invoice_number) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all three data sources concurrently
      const [invoiceRes, companyRes, bankRes] = await Promise.all([
        fetch(`${API_URL}/invoice/number/${invoice_number}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/company-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        // Fetch the new bank endpoint
        fetch(`${API_URL}/company-bank-account`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!invoiceRes.ok) throw new Error("Failed to fetch invoice data.");
      if (!companyRes.ok) throw new Error("Failed to fetch company profile.");
      if (!bankRes.ok) throw new Error("Failed to fetch bank account.");
      
      const invoiceData: FetchedInvoiceData = await invoiceRes.json();
      const companyData: FetchedCompanyInfo = await companyRes.json();
      const bankData: FetchedBankInfo = await bankRes.json();

      // 5. FIX: Format all fetched data for the PDF component
      const formattedPdfData: PdfData = {
        id: invoiceData.invoice_number,
        paymentTerms: invoiceData.payment_term,
        customerInfo: {
          name: invoiceData.customer_name,
          address: invoiceData.customer_address,
        },
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        lineItems: invoiceData.items.map(item => ({
          id: item.item_id,
          description: item.description,
          qty: item.quantity,
          unitPrice: parseFloat(item.unit_price as any),
        })),
        vatRate: 0.07, // Using hardcoded VAT rate
      };
      
      const formattedCompanyInfo: CompanyPdfInfo = {
        name: companyData.company_name,
        address: companyData.company_address,
        email: companyData.email,
        logoUrl: "/MyFinance.png", // Keep static logo URL
        taxID: companyData.tax_id,
      };

      const formattedBankInfo: BankPdfInfo = {
        bankName: bankData.bank_name,
        accountName: bankData.account_name,
        accountNumber: bankData.account_number,
        swiftCode: bankData.swift_code,
      };

      setPdfData(formattedPdfData);
      setCompanyInfo(formattedCompanyInfo);
      setBankInfo(formattedBankInfo); // Set the bank info state

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [invoice_number, token]);

  // Trigger the data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // 6. FIX: Update loading/error states
  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  // Check for all data before rendering
  if (!pdfData || !companyInfo || !bankInfo) {
     return (
      <div className="flex items-center justify-center h-screen">
        <p>Missing data to generate PDF.</p>
      </div>
    );
  }

  // 7. FIX: Pass all real data into the PDFViewer
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <InvoiceDocument
        data={pdfData}
        companyInfo={companyInfo}
        bankInfo={bankInfo} 
      />
    </PDFViewer>
  );
}