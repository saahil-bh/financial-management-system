"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { QuotationDocument } from "@/components/pdf/QuotationDocument";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- Helper Interfaces ---

// 1. Matches GET /company-profile
interface ApiCompanyProfile {
  company_id: number;
  company_name: string;
  company_address: string;
  tax_id: string;
  phone: string;
  email: string;
}

// 2. Matches GET /quotation/number/{quotation_number}
interface ApiQuotationResponse {
  q_id: number;
  quotation_number: string;
  customer_name: string;
  customer_address: string;
  customer_email: string;
  u_id: string;
  status: string;
  total: number;
  tax: number;
  created_at: string;
  items: {
    item_id: number;
    description: string;
    quantity: number;
    unit_price: string;
    total: string;
  }[];
  preparer_name: string | null;
  approver_name: string | null;
  approved_date: string | null;
}

// 3. Matches props for <QuotationDocument> (Company Info)
interface PdfCompanyInfo {
  name: string;
  address: string;
  email: string;
  logoUrl: string; // We'll still hardcode the logo URL
  taxID: string;
  phone: string; // Added phone
}

// 4. Matches props for <QuotationDocument> (Quotation Data)
interface PdfData {
  id: string;
  customerInfo: {
    name: string;
    address: string;
    email: string;
  };
  date: string;
  validUntil: string;
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

const DynamicPDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

export default function QuotationPdfPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  
  const quotation_number = params.quotation_number as string;

  const [isClient, setIsClient] = useState(false);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<PdfCompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!quotation_number || !token) {
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [quotationRes, companyRes] = await Promise.all([
          fetch(`${API_URL}/quotation/number/${quotation_number}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/company-profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!quotationRes.ok) {
          const err = await quotationRes.json();
          throw new Error(err.detail || "Failed to fetch quotation details.");
        }
        if (!companyRes.ok) {
          throw new Error("Failed to fetch company profile.");
        }

        const quotationData: ApiQuotationResponse = await quotationRes.json();
        const companyData: ApiCompanyProfile = await companyRes.json();

        const subtotal = quotationData.total - quotationData.tax;
        const vatRate = subtotal > 0 ? quotationData.tax / subtotal : 0.07;
        const createdDate = new Date(quotationData.created_at);
        const validDate = new Date(createdDate);
        validDate.setDate(createdDate.getDate() + 30);

        const approvedDate = quotationData.approved_date 
          ? new Date(quotationData.approved_date) 
          : null;

        const formattedLineItems = quotationData.items.map((item) => ({
          id: item.item_id,
          description: item.description,
          qty: item.quantity,
          unitPrice: parseFloat(item.unit_price),
        }));

        const mappedPdfData: PdfData = {
          id: quotationData.quotation_number,
          customerInfo: {
            name: quotationData.customer_name,
            address: quotationData.customer_address,
            email: quotationData.customer_email,
          },
          date: createdDate.toLocaleDateString(),
          validUntil: validDate.toLocaleDateString(),
          lineItems: formattedLineItems,
          vatRate: vatRate,
          preparer_name: quotationData.preparer_name || "N/A",
          approver_name: quotationData.approver_name || "Not Approved Yet",
          approved_date: approvedDate ? approvedDate.toLocaleDateString("en-GB") : "N/A",
        };
        setPdfData(mappedPdfData);

        const mappedCompanyInfo: PdfCompanyInfo = {
          name: companyData.company_name,
          address: companyData.company_address,
          email: companyData.email,
          taxID: companyData.tax_id,
          phone: companyData.phone,
          logoUrl: "/MyFinance.png", 
        };
        setCompanyInfo(mappedCompanyInfo);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [quotation_number, token]);

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!pdfData || !companyInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Could not load quotation data.</p>
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
            {quotation_number}
          </h1>
        </div>
      </header>
      <div className="flex-1">
        <DynamicPDFViewer style={{ width: "100%", height: "100%" }}>
          <QuotationDocument data={pdfData} companyInfo={companyInfo} />
        </DynamicPDFViewer>
      </div>
    </div>
  );
}