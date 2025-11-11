"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { InvoiceDocument } from "@/components/pdf/InvoiceDocument";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  created_at: string;
  preparer_name: string | null;
  approver_name: string | null;
  approved_date: string | null;
}

interface FetchedCompanyInfo {
  company_name: string;
  company_address: string;
  email: string;
  tax_id: string;
}

interface FetchedBankInfo {
  bank_name: string;
  account_name: string;
  account_number: string;
  swift_code: string;
}

interface PdfData {
  id: string;
  paymentTerms: string;
  customerInfo: {
    name: string;
    address: string;
    email: string;
  };
  date: string;
  lineItems: {
    id: number;
    description: string;
    qty: number;
    unitPrice: number;
  }[];
  vatRate: number;
  preparer_name: string;
  approver_name: string;
  approved_date: string;
}

interface CompanyPdfInfo {
  name: string;
  address: string;
  email: string;
  logoUrl: string;
  taxID: string;
}

interface BankPdfInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
}

const DynamicPDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function InvoicePdfPage() {
  const params = useParams();
  const { token } = useAuth();
  const router = useRouter();
  const invoice_number = params.invoice_number as string;

  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyPdfInfo | null>(null);
  const [bankInfo, setBankInfo] = useState<BankPdfInfo | null>(null);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchData = useCallback(async () => {
    if (!token || !invoice_number) return;

    setIsLoading(true);
    setError(null);

    try {
      const [invoiceRes, companyRes, bankRes] = await Promise.all([
        fetch(`${API_URL}/invoice/number/${invoice_number}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/company-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/company-bank-account`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!invoiceRes.ok) {
        const err = await invoiceRes.json();
        throw new Error(err.detail || "Failed to fetch invoice data.");
      }
      if (!companyRes.ok) throw new Error("Failed to fetch company profile.");
      if (!bankRes.ok) throw new Error("Failed to fetch bank account.");
      
      const invoiceData: FetchedInvoiceData = await invoiceRes.json();
      const companyData: FetchedCompanyInfo = await companyRes.json();
      const bankData: FetchedBankInfo = await bankRes.json();

      const createdDate = new Date(invoiceData.created_at);
      const approvedDate = invoiceData.approved_date 
          ? new Date(invoiceData.approved_date) 
          : null;

      const formattedPdfData: PdfData = {
        id: invoiceData.invoice_number,
        paymentTerms: invoiceData.payment_term,
        customerInfo: {
          name: invoiceData.customer_name,
          address: invoiceData.customer_address,
          email: "N/A",
        },
        date: createdDate.toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        lineItems: invoiceData.items.map(item => ({
          id: item.item_id,
          description: item.description,
          qty: item.quantity,
          unitPrice: parseFloat(item.unit_price as any),
        })),
        vatRate: 0.07,
        preparer_name: invoiceData.preparer_name || "N/A",
        approver_name: invoiceData.approver_name || "Not Approved Yet",
        approved_date: approvedDate ? approvedDate.toLocaleDateString("en-GB") : "N/A",
      };
      
      const formattedCompanyInfo: CompanyPdfInfo = {
        name: companyData.company_name,
        address: companyData.company_address,
        email: companyData.email,
        logoUrl: "https://placehold.co/150x50/10B981/FFF?text=MyFinan$e",
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
      setBankInfo(formattedBankInfo);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [invoice_number, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


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
          <Button onClick={fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!pdfData || !companyInfo || !bankInfo) {
     return (
      <div className="flex items-center justify-center h-screen">
        <p>Missing data to generate PDF.</p>
      </div>
    );
  }

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
            {invoice_number}
          </h1>
        </div>
      </header>
      <div className="flex-1">
        <DynamicPDFViewer style={{ width: "100%", height: "100%" }}>
          <InvoiceDocument data={pdfData} companyInfo={companyInfo} bankInfo={bankInfo} />
        </DynamicPDFViewer>
      </div>
    </div>
  );
}