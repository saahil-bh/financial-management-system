"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// --- STYLES ---
// Using a simpler, cleaner style based on your template
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 35,
    fontFamily: "Helvetica",
  },
  // --- Header ---
  headerContainer: {
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: 15,
  },
  logo: {
    width: 200,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  companyDetails: {
    fontSize: 9,
    color: "#4B5563",
  },
  // --- Title & Info ---
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#D1D5DB",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  receiptInfo: {
    fontSize: 10,
    textAlign: "right",
  },
  // --- Customer Info ---
  customerInfo: {
    fontSize: 10,
    marginTop: 15,
    lineHeight: 1.4,
  },
  // --- Payment Details ---
  paymentDetails: {
    marginTop: 30,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 5,
    fontSize: 10,
    lineHeight: 1.6,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 5,
    // "Checked"
    backgroundColor: "#000",
  },
  checkboxUnchecked: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 5,
  },
  // --- Footer ---
  footer: {
    position: "absolute",
    bottom: 35,
    left: 35,
    right: 35,
    textAlign: "center",
    fontSize: 10,
    color: "#4B5563",
  },
  signature: {
    marginTop: 40,
    fontSize: 10,
    color: "#374151",
  },
});

// --- PROP TYPES ---
// Simplified types for the receipt
export type ReceiptData = {
  receipt_number: string;
  payment_date: string; // Assumes ISO string
  amount: number;
  status: string;
  approver_name: string | null;
  // Related invoice/customer info
  invoice: {
    invoice_number: string;
    customer_name: string;
    customer_address: string;
  };
};

type CompanyInfo = {
  company_name: string;
  company_address: string;
  email: string;
  phone: string;
  logoUrl: string; // The base64 logo
  tax_id: string;
};

// --- HELPER ---
const formatDate = (dateString: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

// --- COMPONENT ---
export function ReceiptDocument({
  data,
  companyInfo,
}: {
  data: ReceiptData;
  companyInfo: CompanyInfo;
}) {
  const receivedBy =
    data.status === "Approved"
      ? data.approver_name || "Admin" // Fallback if name is null
      : "Not Approved Yet";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* === HEADER === */}
        <View style={styles.headerContainer}>
          <Image src={companyInfo.logoUrl} style={styles.logo} />
          <Text style={styles.companyName}>{companyInfo.company_name}</Text>
          <Text style={styles.companyDetails}>
            {companyInfo.company_address}
          </Text>
          <Text style={styles.companyDetails}>
            Tel: {companyInfo.phone} | Email: {companyInfo.email}
          </Text>
          <Text style={styles.companyDetails}>
            Tax ID: {companyInfo.tax_id}
          </Text>
        </View>

        {/* === TITLE & RECEIPT INFO === */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>RECEIPT</Text>
          <View style={styles.receiptInfo}>
            <Text>Receipt No.: {data.receipt_number}</Text>
            <Text>Receipt Date: {formatDate(data.payment_date)}</Text>
          </View>
        </View>

        {/* === CUSTOMER INFO === */}
        <View style={styles.customerInfo}>
          <Text>Customer Name: {data.invoice.customer_name}</Text>
          <Text>Customer Address: {data.invoice.customer_address}</Text>
          <Text>Related Invoice: {data.invoice.invoice_number}</Text>
        </View>

        {/* === PAYMENT DETAILS === */}
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentTitle}>Payment Details</Text>

          {/* Checkboxes */}
          <View style={styles.checkboxContainer}>
            <View style={styles.checkbox} />
            <Text>Bank Transfer</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <View style={styles.checkboxUnchecked} />
            <Text>Cash</Text>
          </View>
          <View style={styles.checkboxContainer}>
            <View style={styles.checkboxUnchecked} />
            <Text>Credit Card</Text>
          </View>

          {/* Other Details */}
          <Text style={{ marginTop: 10 }}>
            Payment Date: {formatDate(data.payment_date)}
          </Text>
          <Text>
            Transaction Reference: {data.receipt_number}
          </Text>

          {/* Received By & Signature */}
          <View style={styles.signature}>
            <Text>Received by: {receivedBy}</Text>
            <Text style={{ marginTop: 20 }}>
              Signature: _______________________
            </Text>
          </View>
        </View>

        {/* === FOOTER === */}
        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}