"use client";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
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
    marginBottom: 15,
  },
  customerInfo: {
    fontSize: 10,
    textAlign: "right",
    lineHeight: 1.4,
  },
  section: {
    marginBottom: 10,
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
  footerNotes: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    fontSize: 9,
    color: "#4B5563",
    lineHeight: 1.5,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#111827",
  },
  signatureContainer: {
    marginTop: 25,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    fontSize: 10,
    width: "45%",
  },
});

type QuotationData = {
  id: string;
  customerInfo: any;
  date: string;
  validUntil: string;
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

export function QuotationDocument({
  data,
  companyInfo,
}: {
  data: QuotationData;
  companyInfo: CompanyInfo;
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
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ paddingBottom: 150 }}> 
          
          {/* HEADER SECTION */}
          <View style={styles.header}>
            <View style={styles.companyInfo}>
              <Image src={companyInfo.logoUrl} style={styles.logoImage} />
              <Text>{companyInfo.name}</Text>
              <Text>{companyInfo.address}</Text>
              <Text>{companyInfo.email}</Text>
              <Text>Tax ID: {companyInfo.taxID}</Text>
            </View>
            <View style={{ ...styles.customerInfo, ...styles.companyInfo }}>
              <Text style={styles.title}>QUOTATION</Text>
              <Text>No: {data.id}</Text>
              <Text>Date: {data.date}</Text>
              <Text>Valid Until: {data.validUntil}</Text>
              <Text style={{ marginTop: 10, fontWeight: "bold" }}>Bill To:</Text>
              <Text>{data.customerInfo.name}</Text>
              <Text>{data.customerInfo.address}</Text>
              <Text>{data.customerInfo.email}</Text>
            </View>
          </View>

          {/* LINE ITEMS TABLE */}
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableRow}>
              <View style={{ ...styles.tableColHeader, ...styles.descriptionCol }}>
                <Text style={styles.tableCellHeader}>Description</Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={{ ...styles.tableCellHeader, ...styles.textRight }}>
                  Qty
                </Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={{ ...styles.tableCellHeader, ...styles.textRight }}>
                  Unit Price
                </Text>
              </View>
              <View style={styles.tableColHeader}>
                <Text style={{ ...styles.tableCellHeader, ...styles.textRight }}>
                  Total
                </Text>
              </View>
            </View>
            {/* Table Body */}
            {data.lineItems.map((item) => (
              <View style={styles.tableRow} key={item.id}>
                <View style={{ ...styles.tableCol, ...styles.descriptionCol }}>
                  <Text style={styles.tableCell}>{item.description}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={{ ...styles.tableCell, ...styles.textRight }}>
                    {item.qty}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={{ ...styles.tableCell, ...styles.textRight }}>
                    {item.unitPrice.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={{ ...styles.tableCell, ...styles.textRight }}>
                    {(item.qty * item.unitPrice).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* TOTALS SECTION */}
          <View style={styles.totalsSection}>
            <View style={styles.totalsContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Subtotal</Text>
                <Text style={styles.totalText}>{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>
                  VAT ({(data.vatRate * 100).toFixed(0)}%)
                </Text>
                <Text style={styles.totalText}>{vatAmount.toFixed(2)}</Text>
              </View>
              <View style={{ ...styles.totalRow, ...styles.grandTotal }}>
                <Text style={styles.grandTotalText}>Grand Total</Text>
                <Text style={styles.grandTotalText}>{grandTotal.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* --- NOTES & SIGNATURE SECTION --- */}
        <View style={styles.footerNotes}>
          <Text style={styles.notesTitle}>Notes:</Text>
          <Text>- This quotation is valid for 30 days from the issue date.</Text>
          <Text>- Prices exclude/include VAT as specified.</Text>
          <Text>- Please confirm acceptance by signing and returning this quotation.</Text>

          <View style={styles.signatureContainer}>
            <View style={styles.signatureBlock}>
              <Text>Prepared by: {data.preparer_name}</Text>
              <Text>Date: {data.date}</Text>
            </View>
            <View style={styles.signatureBlock}>
              <Text>Approved by: {approver}</Text>
              <Text>Date: {approvalDate}</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
}