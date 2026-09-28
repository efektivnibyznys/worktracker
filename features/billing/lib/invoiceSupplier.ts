export function resolveInvoiceSupplier(
  invoice: { bank_account?: string | null },
  settings: {
    company_name?: string | null
    company_address?: string | null
    company_ico?: string | null
    bank_account?: string | null
  } | null
): { companyName: string; companyAddress: string; companyIco: string; bankAccount: string } {
  const companyName = settings?.company_name?.trim()
  const companyAddress = settings?.company_address?.trim()
  const companyIco = settings?.company_ico?.trim()
  const bankAccount = invoice.bank_account?.trim() || settings?.bank_account?.trim()

  if (!companyName || !companyAddress || !companyIco || !bankAccount) {
    throw new Error('Nastavení fakturace musí obsahovat jméno, adresu, IČO a bankovní účet.')
  }

  return { companyName, companyAddress, companyIco, bankAccount }
}
