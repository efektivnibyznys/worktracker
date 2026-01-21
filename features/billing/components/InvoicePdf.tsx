import React from 'react'
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer'
import { InvoiceWithRelations } from '../types/invoice.types'
import { Settings } from '@/features/time-tracking/types/settings.types'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'

// Register fonts for Czech support
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-400-normal.woff', fontWeight: 400 },
        { src: 'https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-ext-700-normal.woff', fontWeight: 700 }
    ]
})

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        padding: 30,
        fontSize: 10,
        color: '#333'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30
    },
    title: {
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 10,
        color: '#000'
    },
    label: {
        fontSize: 8,
        color: '#666',
        marginBottom: 2
    },
    value: {
        marginBottom: 8,
        fontWeight: 700
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20
    },
    column: {
        flex: 1
    },
    table: {
        marginTop: 20,
        marginBottom: 20
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 5,
        marginBottom: 5,
        fontWeight: 700
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingVertical: 5
    },
    colDesc: { flex: 4 },
    colQty: { flex: 1, textAlign: 'right' },
    colUnit: { flex: 1, textAlign: 'center' },
    colPrice: { flex: 2, textAlign: 'right' },
    colTotal: { flex: 2, textAlign: 'right' },
    totals: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginTop: 10
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 5
    },
    totalLabel: {
        width: 100,
        textAlign: 'right',
        paddingRight: 10
    },
    totalValue: {
        width: 100,
        textAlign: 'right',
        fontWeight: 700
    },
    totalFinal: {
        fontSize: 14,
        fontWeight: 700,
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 5
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        fontSize: 8,
        color: '#666',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10
    }
})

interface InvoicePdfProps {
    invoice: InvoiceWithRelations
    settings: Settings | null
}

export function InvoicePdf({ invoice, settings }: InvoicePdfProps) {
    const isOverdue = invoice.status !== 'paid' &&
        invoice.status !== 'cancelled' &&
        new Date(invoice.due_date) < new Date()

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>FAKTURA - DAŇOVÝ DOKLAD</Text>
                        <Text>Číslo: {invoice.invoice_number}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        {isOverdue && <Text style={{ color: 'red', fontWeight: 700 }}>PO SPLATNOSTI</Text>}
                    </View>
                </View>

                {/* Supplier & Subscriber */}
                <View style={styles.row}>
                    <View style={styles.column}>
                        <Text style={styles.label}>DODAVATEL:</Text>
                        <Text style={{ fontWeight: 700, fontSize: 12 }}>{settings?.company_name || 'Jakub Vaněk'}</Text>
                        <Text>{settings?.company_address || 'Dr. Nováka 496, 294 71, Benátky nad Jizerou'}</Text>
                        <View style={{ marginTop: 5 }}>
                            <Text>IČO: {settings?.company_ico || '88699030'}</Text>
                            {settings?.company_dic && <Text>DIČ: {settings?.company_dic}</Text>}
                        </View>
                        <View style={{ marginTop: 10 }}>
                            <Text style={styles.label}>BANKOVNÍ SPOJENÍ:</Text>
                            <Text>Číslo účtu: {invoice.bank_account || settings?.bank_account || '4482411352/6363'}</Text>
                            <Text style={{ marginTop: 2 }}>Variabilní symbol: {invoice.variable_symbol || invoice.invoice_number.replace('-', '')}</Text>
                        </View>
                    </View>

                    <View style={styles.column}>
                        <Text style={styles.label}>ODBĚRATEL:</Text>
                        <Text style={{ fontWeight: 700, fontSize: 12 }}>{invoice.client?.name || invoice.client_name}</Text>
                        <Text>{invoice.client_address}</Text>
                        <View style={{ marginTop: 5 }}>
                            {invoice.client_ico && <Text>IČO: {invoice.client_ico}</Text>}
                            {/* Client DIC is not stored on invoice currently, assuming it might be in address or not needed */}
                        </View>
                    </View>
                </View>

                {/* Dates */}
                <View style={[styles.row, { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee', paddingVertical: 10 }]}>
                    <View style={styles.column}>
                        <Text style={styles.label}>DATUM VYSTAVENÍ</Text>
                        <Text style={styles.value}>{formatDate(invoice.issue_date)}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>DATUM SPLATNOSTI</Text>
                        <Text style={styles.value}>{formatDate(invoice.due_date)}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>DATUM ZDAN. PLNĚNÍ</Text>
                        <Text style={styles.value}>{formatDate(invoice.issue_date)}</Text>
                    </View>
                    <View style={styles.column}>
                        <Text style={styles.label}>FORMA ÚHRADY</Text>
                        <Text style={styles.value}>Hoto / Převod</Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colDesc}>Popis</Text>
                        <Text style={styles.colQty}>Mn.</Text>
                        <Text style={styles.colUnit}>J.</Text>
                        <Text style={styles.colPrice}>Cena/j.</Text>
                        <Text style={styles.colTotal}>Celkem</Text>
                    </View>

                    {invoice.items?.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colUnit}>{item.unit}</Text>
                            <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
                            <Text style={styles.colTotal}>{formatCurrency(item.quantity * item.unit_price)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Mezisoučet:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
                    </View>
                    {invoice.tax_rate > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>DPH {invoice.tax_rate}%:</Text>
                            <Text style={styles.totalValue}>{formatCurrency(invoice.tax_amount)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.totalFinal]}>
                        <Text style={styles.totalLabel}>CELKEM K ÚHRADĚ:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.total_amount)}</Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    {invoice.notes && (
                        <View style={{ marginBottom: 10 }}>
                            <Text style={{ fontWeight: 700, marginBottom: 2 }}>Poznámka:</Text>
                            <Text>{invoice.notes}</Text>
                        </View>
                    )}
                    <Text>Faktura byla vystavena elektronicky.</Text>
                </View>
            </Page>
        </Document>
    )
}
