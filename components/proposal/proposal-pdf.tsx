import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#1e293b",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#3b82f6",
    borderBottomStyle: "solid",
  },
  companyName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1e40af", marginBottom: 4 },
  companyMeta: { fontSize: 9, color: "#64748b", lineHeight: 1.5 },
  proposalTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#0f172a", textAlign: "right", marginBottom: 4 },
  proposalMeta: { fontSize: 9, color: "#64748b", textAlign: "right", lineHeight: 1.5 },
  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1e40af", marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid" },
  // Customer info
  infoGrid: { flexDirection: "row", gap: 24, marginBottom: 20 },
  infoBox: { flex: 1, backgroundColor: "#f8fafc", padding: 12, borderRadius: 4 },
  infoLabel: { fontSize: 8, color: "#64748b", fontFamily: "Helvetica-Bold", marginBottom: 2, textTransform: "uppercase" },
  infoValue: { fontSize: 10, color: "#0f172a" },
  // Body text
  bodyText: { fontSize: 10, color: "#334155", lineHeight: 1.6 },
  // Line items table
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderStyle: "solid", borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 8, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid" },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", borderBottomStyle: "solid" },
  tableRowLast: { flexDirection: "row", padding: 8 },
  colDesc: { flex: 3, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" },
  colQty: { width: 50, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" },
  colUnit: { width: 60, textAlign: "center", fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" },
  colPrice: { width: 70, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" },
  colTotal: { width: 70, textAlign: "right", fontSize: 9, fontFamily: "Helvetica-Bold", color: "#475569" },
  cellDesc: { flex: 3, fontSize: 9, color: "#334155" },
  cellQty: { width: 50, textAlign: "right", fontSize: 9, color: "#334155" },
  cellUnit: { width: 60, textAlign: "center", fontSize: 9, color: "#334155" },
  cellPrice: { width: 70, textAlign: "right", fontSize: 9, color: "#334155" },
  cellTotal: { width: 70, textAlign: "right", fontSize: 9, color: "#334155", fontFamily: "Helvetica-Bold" },
  // Totals
  totalsBox: { alignItems: "flex-end", marginTop: 12 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginBottom: 4 },
  totalLabel: { fontSize: 10, color: "#64748b", width: 100, textAlign: "right" },
  totalValue: { fontSize: 10, color: "#0f172a", width: 80, textAlign: "right" },
  grandTotalRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#e2e8f0", borderTopStyle: "solid" },
  grandTotalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#0f172a", width: 100, textAlign: "right" },
  grandTotalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1e40af", width: 80, textAlign: "right" },
  // Payment
  paymentBox: { flexDirection: "row", gap: 12, marginTop: 8 },
  paymentCard: { flex: 1, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderStyle: "solid", borderRadius: 4, padding: 12 },
  paymentLabel: { fontSize: 8, color: "#3b82f6", fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 4 },
  paymentAmount: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1e40af" },
  paymentNote: { fontSize: 8, color: "#64748b", marginTop: 2 },
  // Footer
  footer: { marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0", borderTopStyle: "solid" },
  footerText: { fontSize: 8, color: "#94a3b8", textAlign: "center", lineHeight: 1.5 },
  // Signature
  sigBox: { marginTop: 24, flexDirection: "row", gap: 40 },
  sigLine: { flex: 1 },
  sigLineBar: { borderBottomWidth: 1, borderBottomColor: "#94a3b8", borderBottomStyle: "solid", marginBottom: 4, height: 32 },
  sigLabel: { fontSize: 8, color: "#94a3b8" },
});

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

interface Props {
  estimate: any;
}

export function ProposalPDF({ estimate }: Props) {
  const { company, project, lineItems, proposal } = estimate;
  const customer = project?.customer;

  const visibleItems = lineItems?.filter((i: any) => !i.isOptional) || [];
  const optionalItems = lineItems?.filter((i: any) => i.isOptional) || [];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{company?.name || "Your Company"}</Text>
            <Text style={styles.companyMeta}>
              {[company?.phone, company?.email, company?.website].filter(Boolean).join("  ·  ")}
            </Text>
            {company?.licenseNumber && (
              <Text style={styles.companyMeta}>License #{company.licenseNumber}</Text>
            )}
          </View>
          <View>
            <Text style={styles.proposalTitle}>PROPOSAL</Text>
            <Text style={styles.proposalMeta}>
              {estimate.estimateNumber}
            </Text>
            <Text style={styles.proposalMeta}>
              {formatDate(estimate.createdAt)}
            </Text>
          </View>
        </View>

        {/* Customer / Project */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Prepared For</Text>
            <Text style={{ ...styles.infoValue, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{customer?.name}</Text>
            {customer?.phone && <Text style={styles.infoValue}>{customer.phone}</Text>}
            {customer?.email && <Text style={styles.infoValue}>{customer.email}</Text>}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Project Address</Text>
            <Text style={styles.infoValue}>{customer?.projectAddress || "—"}</Text>
            {(customer?.city || customer?.state) && (
              <Text style={styles.infoValue}>
                {[customer.city, customer.state, customer.zip].filter(Boolean).join(", ")}
              </Text>
            )}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Valid Until</Text>
            <Text style={styles.infoValue}>
              {estimate.expiresAt ? formatDate(estimate.expiresAt) : "30 days from issue"}
            </Text>
          </View>
        </View>

        {/* Scope of Work */}
        {proposal?.scopeOfWork && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>
            <Text style={styles.bodyText}>{proposal.scopeOfWork}</Text>
          </View>
        )}

        {/* Preparation */}
        {proposal?.prepSteps && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Surface Preparation</Text>
            <Text style={styles.bodyText}>{proposal.prepSteps}</Text>
          </View>
        )}

        {/* Products */}
        {proposal?.productsIncluded && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products & Materials</Text>
            <Text style={styles.bodyText}>{proposal.productsIncluded}</Text>
          </View>
        )}

        {/* Line Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDesc}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colUnit}>Unit</Text>
              <Text style={styles.colPrice}>Unit Price</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {visibleItems.map((item: any, i: number) => (
              <View key={item.id} style={i === visibleItems.length - 1 ? styles.tableRowLast : styles.tableRow}>
                <Text style={styles.cellDesc}>{item.description}</Text>
                <Text style={styles.cellQty}>{Number(item.quantity)}</Text>
                <Text style={styles.cellUnit}>{item.unit}</Text>
                <Text style={styles.cellPrice}>{formatCurrency(Number(item.unitPrice))}</Text>
                <Text style={styles.cellTotal}>{formatCurrency(Number(item.totalPrice))}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsBox}>
            {Number(estimate.taxAmount) > 0 && (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>{formatCurrency(Number(estimate.subtotal))}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tax ({Number(estimate.taxRate || 0)}%)</Text>
                  <Text style={styles.totalValue}>{formatCurrency(Number(estimate.taxAmount))}</Text>
                </View>
              </>
            )}
            {Number(estimate.discountAmount) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={{ ...styles.totalValue, color: "#16a34a" }}>-{formatCurrency(Number(estimate.discountAmount))}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(Number(estimate.totalAmount))}</Text>
            </View>
          </View>
        </View>

        {/* Optional items */}
        {optionalItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Optional Add-ons</Text>
            <View style={styles.table}>
              {optionalItems.map((item: any, i: number) => (
                <View key={item.id} style={i === optionalItems.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={styles.cellDesc}>{item.description}</Text>
                  <Text style={styles.cellQty}>{Number(item.quantity)}</Text>
                  <Text style={styles.cellUnit}>{item.unit}</Text>
                  <Text style={styles.cellPrice}>{formatCurrency(Number(item.unitPrice))}</Text>
                  <Text style={styles.cellTotal}>{formatCurrency(Number(item.totalPrice))}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Payment terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Schedule</Text>
          <View style={styles.paymentBox}>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentLabel}>Deposit Due</Text>
              <Text style={styles.paymentAmount}>{formatCurrency(Number(estimate.depositAmount))}</Text>
              <Text style={styles.paymentNote}>Due to schedule work</Text>
            </View>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentLabel}>Balance Due</Text>
              <Text style={styles.paymentAmount}>{formatCurrency(Number(estimate.balanceDue))}</Text>
              <Text style={styles.paymentNote}>Due upon completion</Text>
            </View>
          </View>
        </View>

        {/* Warranty */}
        {proposal?.warrantyInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warranty</Text>
            <Text style={styles.bodyText}>{proposal.warrantyInfo}</Text>
          </View>
        )}

        {/* Terms */}
        {proposal?.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.bodyText}>{proposal.terms}</Text>
          </View>
        )}

        {/* Signature */}
        <View style={styles.sigBox}>
          <View style={styles.sigLine}>
            <View style={styles.sigLineBar} />
            <Text style={styles.sigLabel}>Customer Signature</Text>
          </View>
          <View style={styles.sigLine}>
            <View style={styles.sigLineBar} />
            <Text style={styles.sigLabel}>Date</Text>
          </View>
          <View style={styles.sigLine}>
            <View style={styles.sigLineBar} />
            <Text style={styles.sigLabel}>Authorized Signature</Text>
          </View>
        </View>

        {/* Footer */}
        {company?.proposalFooter && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>{company.proposalFooter}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
