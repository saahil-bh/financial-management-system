"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { QuotationDocument } from "@/components/pdf/QuotationDocument";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const API_URL = "http://localhost:8000";

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
}

export default function QuotationPdfPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  
  // 1. Get the quotation_number from the URL
  const quotation_number = params.quotation_number as string;

  const [isClient, setIsClient] = useState(false);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<PdfCompanyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 2. Fetch and Map Data
  useEffect(() => {
    if (!quotation_number || !token) {
      return; // Wait for number and token
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 3. Fetch both endpoints concurrently
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

        // --- 4. Map Quotation Data ---
        const subtotal = quotationData.total - quotationData.tax;
        const vatRate = subtotal > 0 ? quotationData.tax / subtotal : 0.07;
        const createdDate = new Date(quotationData.created_at);
        const validDate = new Date(createdDate);
        validDate.setDate(createdDate.getDate() + 30); // 30-day validity

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
        };
        setPdfData(mappedPdfData);

        // --- 5. Map Company Data ---
        const mappedCompanyInfo: PdfCompanyInfo = {
          name: companyData.company_name,
          address: companyData.company_address,
          email: companyData.email,
          taxID: companyData.tax_id,
          phone: companyData.phone,
          // @react-pdf cannot use local URLs. We must use an absolute URL.
          logoUrl: "https://placehold.co/150x50/10B981/FFF?text=MyFinan$e", 
        };
        setCompanyInfo(mappedCompanyInfo);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [quotation_number, token]); // Re-run if number or token changes

  // --- 6. Handle Loading/Error/Client States ---
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

  // --- 7. Render PDF ---
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <QuotationDocument data={pdfData} companyInfo={companyInfo} />
    </PDFViewer>
  );
}