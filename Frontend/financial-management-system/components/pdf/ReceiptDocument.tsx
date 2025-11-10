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
// Adapted from your Invoice styles to match the Receipt format
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  // Header: Company Info
  header: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#333333",
  },
  logoImage: {
    width: 100,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  companyInfo: {
    fontSize: 9,
    textAlign: "center",
  },
  // Title
  titleContainer: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  receiptDetails: {
    fontSize: 10,
    textAlign: "right",
  },
  // Customer & Invoice Info
  customerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    fontSize: 10,
    paddingBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: "#333333",
  },
  customerInfo: {
    width: "50%",
  },
  relatedInvoice: {
    width: "50%",
    textAlign: "right",
  },
  // Payment Details
  paymentSection: {
    marginTop: 20,
    fontSize: 10,
    paddingBottom: 20,
    borderBottomWidth: 1.5,
    borderBottomColor: "#333333",
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  paymentLabel: {
    width: 150,
    fontWeight: "bold",
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: "#000",
    marginRight: 5,
  },
  checkboxChecked: {
    backgroundColor: "#000",
  },
  // Signature & Footer
  footer: {
    marginTop: "auto", // Pushes to the bottom
    paddingTop: 20,
    fontSize: 10,
  },
  receivedBy: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  signatureLine: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 5,
    textAlign: "center",
  },
  thankYou: {
    textAlign: "center",
  },
});

// --- CHECKBOX HELPER ---
const Checkbox = ({ checked }: { checked: boolean }) => (
  <View style={styles.checkbox}>
    {checked && <View style={styles.checkboxChecked} />}
  </View>
);

// --- PROP TYPES ---
export type ReceiptData = {
  receipt_number: string;
  payment_date: string;
  customer_name: string;
  customer_address: string;
  i_id: number; // For the related invoice
  invoice_number: string; // The related invoice number
  payment_method: string | null;
  amount: number;
};

export type CompanyInfo = {
  company_name: string;
  company_address: string;
  phone: string;
  email: string;
  tax_id: string;
  logoUrl: string; // Assuming you add a logo URL
};

// --- COMPONENT ---
export function ReceiptDocument({
  data,
  companyInfo,
}: {
  data: ReceiptData;
  companyInfo: CompanyInfo;
}) {
  const receiptDate = new Date(data.payment_date).toLocaleDateString("en-GB");
  const paymentMethod = data.payment_method || "N/A";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER SECTION */}
        <View style={styles.header}>
          {companyInfo.logoUrl && (
            <Image src={companyInfo.logoUrl} style={styles.logoImage} />
          )}
          <Text style={styles.companyName}>{companyInfo.company_name}</Text>
          <Text style={styles.companyInfo}>{companyInfo.company_address}</Text>
          <Text style={styles.companyInfo}>
            Tel: {companyInfo.phone} | Email: {companyInfo.email}
          </Text>
          <Text style={styles.companyInfo}>Tax ID: {companyInfo.tax_id}</Text>
        </View>

        {/* TITLE & RECEIPT INFO */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>RECEIPT</Text>
          <View style={styles.receiptDetails}>
            <Text>Receipt No.: {data.receipt_number}</Text>
            <Text>Receipt Date: {receiptDate}</Text>
          </View>
        </View>

        {/* CUSTOMER & INVOICE INFO */}
        <View style={styles.customerContainer}>
          <View style={styles.customerInfo}>
            <Text>Customer Name: {data.customer_name}</Text>
            <Text>Customer Address: {data.customer_address}</Text>
          </View>
          <View style={styles.relatedInvoice}>
            <Text>Related Invoice: {data.invoice_number}</Text>
          </View>
        </View>

        {/* PAYMENT SECTION */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Method:</Text>
            <Checkbox checked={paymentMethod === "Bank Transfer"} />
            <Text>Bank Transfer</Text>
            <Checkbox checked={paymentMethod === "Cash"} />
            <Text>Cash</Text>
            <Checkbox checked={paymentMethod === "Credit Card"} />
            <Text>Credit Card</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Payment Date:</Text>
            <Text>{receiptDate}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Transaction Reference:</Text>
            <Text>N/A</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount Paid:</Text>
            <Text>{data.amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* FOOTER & SIGNATURE */}
        <View style={styles.footer}>
          <View style={styles.receivedBy}>
            <View>
              <Text>Received by: [Admin/Authorized Person]</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text>Signature</Text>
            </View>
          </View>
          <Text style={styles.thankYou}>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
}