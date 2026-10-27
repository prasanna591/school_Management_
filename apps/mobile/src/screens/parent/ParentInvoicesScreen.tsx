import { Text, View } from 'react-native';

import { Layout } from '../../components/Layout';
import { ParentEmpty, ParentPanel, ParentRow } from '../../components/parent/parentUi';
import { formatCurrency, formatDate, humanize } from '../../lib/format';
import { DEMO_INVOICE } from '../../lib/demoData';

interface InvoiceItem {
  id: string;
  description: string;
  amount: number | string;
}

interface InvoicePayment {
  id: string;
  amount: number | string;
  method: string;
  reference: string | null;
  paidAt: string;
}

interface ChildInvoice {
  id: string;
  invoiceNo: string;
  issueDate: string;
  dueDate: string;
  status: string;
  total: number | string;
  amountPaid: number | string;
  balance: number | string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

function buildInvoices(): ChildInvoice[] {
  const invoice = DEMO_INVOICE;
  return [
    {
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      balance: invoice.balance,
      items: invoice.items.map((item) => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
      })),
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        reference: payment.reference ?? '',
        paidAt: payment.paidAt,
      })),
    },
  ];
}

export function ParentInvoicesScreen() {
  const data: ChildInvoice[] = buildInvoices();

  return (
    <Layout heading="Fees">
      {data.length === 0 ? (
        <ParentEmpty message="No invoices have been issued." hint="Fee invoices will appear here once issued by the school." />
      ) : (
        <View style={styles.grid}>
          {data.map((invoice) => (
            <InvoiceCard key={invoice.id ?? 'unknown'} invoice={invoice} />
          ))}
        </View>
      )}
    </Layout>
  );
}

function InvoiceCard({ invoice }: { invoice: ChildInvoice }) {
  return (
    <ParentPanel title={invoice.invoiceNo} icon="finance">
      <View style={styles.cardBody}>
        <ParentRow title="Status" meta={humanize(invoice.status)} />
        <ParentRow title="Issued" meta={formatDate(invoice.issueDate)} />
        <ParentRow title="Due" meta={formatDate(invoice.dueDate)} />

        {invoice.items.map((item) => (
          <ParentRow key={item.id} title={item.description} meta={formatCurrency(item.amount)} />
        ))}
        <ParentRow title="Total" meta={formatCurrency(invoice.total)} />
        <ParentRow title="Paid" meta={formatCurrency(invoice.amountPaid)} />
        <ParentRow title="Balance" meta={formatCurrency(invoice.balance)} />

        {invoice.payments.length > 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.subtitle}>Payments</Text>
            {invoice.payments.map((payment) => (
              <ParentRow
                key={payment.id}
                title={`${formatDate(payment.paidAt)} · ${humanize(payment.method)}`}
                meta={formatCurrency(payment.amount)}
              />
            ))}
          </View>
        ) : null}
      </View>
    </ParentPanel>
  );
}

const styles = {
  grid: {
    gap: 12,
  },
  cardBody: {
    gap: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
} as const;
