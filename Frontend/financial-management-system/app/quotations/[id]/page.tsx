"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PDFViewer } from "@react-pdf/renderer";
import { QuotationDocument } from "@/components/pdf/QuotationDocument";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const API_URL = "http://localhost:8000";

// --- STATIC COMPANY INFORMATION ---
// IMPORTANT: @react-pdf cannot use relative paths like "/MyFinance.png".
// It needs an absolute URL. I've used a placeholder.
const STATIC_COMPANY_INFO = {
  name: "MyFinan$e Solutions",
  address: "Faculty of ICT, Mahidol University",
  email: "saahil@myfinance.com",
  logoUrl: "https://placehold.co/150x50/10B981/FFF?text=MyFinan$e", // Use an absolute URL
  taxID: "420420",
};


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
  const id = params.id as string; // The q_id from the URL

  const [isClient, setIsClient] = useState(false);
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // --- 3. Fetch and Map Data ---
  useEffect(() => {
    if (!id || !token) {
      return; // Wait for ID and token
    }

    const fetchAndFormatQuotation = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/quotation/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.detail || "Failed to fetch quotation details.");
        }

        const data: ApiQuotationResponse = await response.json();

        // --- 4. Map API data to PDF data format ---
        const subtotal = data.total - data.tax;
        const vatRate = subtotal > 0 ? data.tax / subtotal : 0.07; // Calculate VAT rate

        const createdDate = new Date(data.created_at);
        const validDate = new Date(createdDate);
        validDate.setDate(createdDate.getDate() + 30); // Set validity for 30 days

        const formattedLineItems = data.items.map((item) => ({
          id: item.item_id,
          description: item.description,
          qty: item.quantity, // Map quantity -> qty
          unitPrice: parseFloat(item.unit_price), // Map unit_price -> unitPrice
        }));

        const mappedData: PdfData = {
          id: data.quotation_number, // Use the string ID
          customerInfo: {
            name: data.customer_name,
            address: data.customer_address,
            email: data.customer_email,
          },
          date: createdDate.toLocaleDateString(),
          validUntil: validDate.toLocaleDateString(),
          lineItems: formattedLineItems,
          vatRate: vatRate,
        };

        setPdfData(mappedData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndFormatQuotation();
  }, [id, token]); // Re-run if ID or token changes

  // --- 5. Handle Loading/Error/Client States ---
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

  if (!pdfData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Could not load quotation data.</p>
      </div>
    );
  }

  // --- 6. Render PDF ---
  return (
    <PDFViewer style={{ width: "100%", height: "100vh" }}>
      <QuotationDocument data={pdfData} companyInfo={STATIC_COMPANY_INFO} />
    </PDFViewer>
  );
}