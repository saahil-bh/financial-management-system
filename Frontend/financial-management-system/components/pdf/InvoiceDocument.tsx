"use client";
import * as ReactPDF from "@react-pdf/renderer";

const styles = ReactPDF.StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
    paddingBottom: 10,
  },
  companyInfo: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  logoImage: {
    width: 100,
    marginBottom: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 10,
  },
  customerInfo: {
    fontSize: 10,
    textAlign: "right",
    lineHeight: 1.4,
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableColHeader: {
    width: "15%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: "#F3F4F6",
    padding: 5,
  },
  tableCol: {
    width: "15%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: "bold",
  },
  tableCell: {
    fontSize: 9,
  },
  descriptionCol: {
    width: "40%",
  },
  textRight: {
    textAlign: "right",
  },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  totalsContainer: {
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 5,
  },
  totalText: {
    fontSize: 10,
  },
  grandTotal: {
    backgroundColor: "#10B981",
    color: "#000000",
  },
  grandTotalText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  bankDetails: {
    marginTop: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    fontSize: 10,
    lineHeight: 1.5,
  },
  bankTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  footerNotes: {
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    fontSize: 9,
    color: "#4B5563",
    lineHeight: 1.5,
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  signatureContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    fontSize: 10,
    width: "45%",
  },
});

type InvoiceData = {
  id: string;
  customerInfo: any;
  date: string;
  paymentTerms: string;
  lineItems: any[];
  vatRate: number;
  preparer_name: string;
  approver_name: string;
  approved_date: string;
};

type CompanyInfo = {
  name: string;
  address: string;
  email: string;
  logoUrl: string;
  taxID: string;
};

type BankInfo = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
};


export function InvoiceDocument({
  data,
  companyInfo,
  bankInfo,
}: {
  data: InvoiceData;
  companyInfo: CompanyInfo;
  bankInfo: BankInfo;
}) {
  const subtotal = data.lineItems.reduce(
    (acc, item) => acc + item.qty * item.unitPrice,
    0
  );
  const vatAmount = subtotal * data.vatRate;
  const grandTotal = subtotal + vatAmount;

  const approver = data.approver_name;
  const approvalDate = (approver !== "Not Approved Yet") ? data.approved_date : "N/A";

  return (
    <ReactPDF.Document>
      <ReactPDF.Page size="A4" style={styles.page}>
        <ReactPDF.View> 
          <ReactPDF.View style={styles.header}>
            <ReactPDF.View style={styles.companyInfo}>
              <ReactPDF.Image src={companyInfo.logoUrl} style={styles.logoImage} />
              <ReactPDF.Text>{companyInfo.name}</ReactPDF.Text>
              <ReactPDF.Text>{companyInfo.address}</ReactPDF.Text>
              <ReactPDF.Text>{companyInfo.email}</ReactPDF.Text>
              <ReactPDF.Text>Tax ID: {companyInfo.taxID}</ReactPDF.Text>
            </ReactPDF.View>
            <ReactPDF.View style={{ ...styles.customerInfo, ...styles.companyInfo }}>
              <ReactPDF.Text style={styles.title}>INVOICE</ReactPDF.Text>
              <ReactPDF.Text>No: {data.id}</ReactPDF.Text>
              <ReactPDF.Text>Date: {data.date}</ReactPDF.Text>
              <ReactPDF.Text>Payment Terms: {data.paymentTerms}</ReactPDF.Text>
              <ReactPDF.Text style={{ marginTop: 10, fontWeight: "bold" }}>Bill To:</ReactPDF.Text>
              <ReactPDF.Text>{data.customerInfo.name}</ReactPDF.Text>
              <ReactPDF.Text>{data.customerInfo.address}</ReactPDF.Text>
              <ReactPDF.Text>{data.customerInfo.email}</ReactPDF.Text>
            </ReactPDF.View>
          </ReactPDF.View>

          {/* LINE ITEMS TABLE */}
          <ReactPDF.View style={styles.table}>
            {/* Header */}
            <ReactPDF.View style={styles.tableRow}>
              <ReactPDF.View style={{ ...styles.tableColHeader, ...styles.descriptionCol }}>
                <ReactPDF.Text style={styles.tableCellHeader}>Description</ReactPDF.Text>
              </ReactPDF.View>
              <ReactPDF.View style={styles.tableColHeader}>
                <ReactPDF.Text style={{ ...styles.tableCellHeader, ...styles.textRight }}>
                  Qty
                </ReactPDF.Text>
              </ReactPDF.View>
              <ReactPDF.View style={styles.tableColHeader}>
                <ReactPDF.Text style={{ ...styles.tableCellHeader, ...styles.textRight }}>
                  Unit Price
                </ReactPDF.Text>
              </ReactPDF.View>
              <ReactPDF.View style={styles.tableColHeader}>
                <ReactPDF.Text style={{ ...styles.tableCellHeader, ...styles.textRight }}>
                  Total
                </ReactPDF.Text>
              </ReactPDF.View>
            </ReactPDF.View>
            {/* Body */}
            {data.lineItems.map((item, index) => (
              <ReactPDF.View style={styles.tableRow} key={item.id || index}>
                <ReactPDF.View style={{ ...styles.tableCol, ...styles.descriptionCol }}>
                  <ReactPDF.Text style={styles.tableCell}>{item.description}</ReactPDF.Text>
                </ReactPDF.View>
                <ReactPDF.View style={styles.tableCol}>
                  <ReactPDF.Text style={{ ...styles.tableCell, ...styles.textRight }}>
                    {item.qty}
                  </ReactPDF.Text>
                </ReactPDF.View>
                <ReactPDF.View style={styles.tableCol}>
                  <ReactPDF.Text style={{ ...styles.tableCell, ...styles.textRight }}>
                    {item.unitPrice.toFixed(2)}
                  </ReactPDF.Text>
                </ReactPDF.View>
                <ReactPDF.View style={styles.tableCol}>
                  <ReactPDF.Text style={{ ...styles.tableCell, ...styles.textRight }}>
                    {(item.qty * item.unitPrice).toFixed(2)}
                  </ReactPDF.Text>
                </ReactPDF.View>
              </ReactPDF.View>
            ))}
          </ReactPDF.View>

          {/* TOTALS SECTION */}
          <ReactPDF.View style={styles.totalsSection}>
            <ReactPDF.View style={styles.totalsContainer}>
              <ReactPDF.View style={styles.totalRow}>
                <ReactPDF.Text style={styles.totalText}>Subtotal</ReactPDF.Text>
                <ReactPDF.Text style={styles.totalText}>{subtotal.toFixed(2)}</ReactPDF.Text>
              </ReactPDF.View>
              <ReactPDF.View style={styles.totalRow}>
                <ReactPDF.Text style={styles.totalText}>
                  VAT ({(data.vatRate * 100).toFixed(0)}%)
                </ReactPDF.Text>
                <ReactPDF.Text style={styles.totalText}>{vatAmount.toFixed(2)}</ReactPDF.Text>
              </ReactPDF.View>
              <ReactPDF.View style={{ ...styles.totalRow, ...styles.grandTotal }}>
                <ReactPDF.Text style={styles.grandTotalText}>Grand Total</ReactPDF.Text>
                <ReactPDF.Text style={styles.grandTotalText}>{grandTotal.toFixed(2)}</ReactPDF.Text>
              </ReactPDF.View>
            </ReactPDF.View>
          </ReactPDF.View>
        
          {/* --- BANK DETAILS --- */}
          <ReactPDF.View style={styles.bankDetails}>
            <ReactPDF.Text style={styles.bankTitle}>Payment Details:</ReactPDF.Text>
            <ReactPDF.Text>Bank: {bankInfo.bankName}</ReactPDF.Text>
            <ReactPDF.Text>Account Number: {bankInfo.accountNumber}</ReactPDF.Text>
            <ReactPDF.Text>Account Name: {bankInfo.accountName}</ReactPDF.Text>
            <ReactPDF.Text>SWIFT: {bankInfo.swiftCode}</ReactPDF.Text>
            <ReactPDF.Text>Ref: {data.id}</ReactPDF.Text>
          </ReactPDF.View>

          {/* --- NOTES & SIGNATURES --- */}
          <ReactPDF.View style={styles.footerNotes}>
            <ReactPDF.Text style={styles.footerTitle}>Notes:</ReactPDF.Text>
            <ReactPDF.Text>- Please make payment before the due date.</ReactPDF.Text>
            <ReactPDF.Text>- For proof of payment, please email finance@myfinance.com.</ReactPDF.Text>

            <ReactPDF.View style={styles.signatureContainer}>
              <ReactPDF.View style={styles.signatureBlock}>
                <ReactPDF.Text>Issued by: {data.preparer_name}</ReactPDF.Text>
                <ReactPDF.Text>Date: {data.date}</ReactPDF.Text>
              </ReactPDF.View>
              <ReactPDF.View style={styles.signatureBlock}>
                <ReactPDF.Text>Approved by: {approver}</ReactPDF.Text>
                <ReactPDF.Text>Date: {approvalDate}</ReactPDF.Text>
              </ReactPDF.View>
            </ReactPDF.View>
          </ReactPDF.View>
          
        </ReactPDF.View> 
      </ReactPDF.Page>
    </ReactPDF.Document>
  );
}