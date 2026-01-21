/**
 * Utility functions for payment processing and QR codes
 */

/**
 * Calculates MOD 97-10 checksum for IBAN
 */
function mod97(string: string): number {
    let checksum = string.slice(0, 2)
    let fragment = string.slice(2)

    while (fragment.length > 0) {
        checksum = (parseInt(checksum + fragment.slice(0, 7), 10) % 97).toString()
        fragment = fragment.slice(7)
    }

    return parseInt(checksum, 10)
}

/**
 * Converts a standard Czech bank account number (prefix-number/bankCode) to IBAN
 * Example: 4482411352/6363 -> CZ...
 */
export function convertCzechAccountToIban(accountString: string): string | null {
    // Remove whitespace
    const cleanAccount = accountString.replace(/\s/g, '')

    // Basic validation for format: (prefix-)?number/bankCode
    const matches = cleanAccount.match(/^((?:[0-9]{0,6}-)?[0-9]{1,10})\/([0-9]{4})$/)
    if (!matches) {
        // Check if it's already an IBAN
        if (/^CZ[0-9]{22}$/.test(cleanAccount)) return cleanAccount
        return null
    }

    const [_, fullNumber, bankCode] = matches
    let prefix = ''
    let number = fullNumber

    if (fullNumber.includes('-')) {
        const parts = fullNumber.split('-')
        prefix = parts[0]
        number = parts[1]
    }

    // Pad parts
    const paddedBank = bankCode.padStart(4, '0')
    const paddedPrefix = prefix.padStart(6, '0')
    const paddedNumber = number.padStart(10, '0')

    // Calculate checksum
    // CZ = 1235 (C=12, Z=35)
    // Format for check: Bank (4) + Prefix (6) + Number (10) + Country (4) + 00
    const bban = `${paddedBank}${paddedPrefix}${paddedNumber}`
    const numericString = `${bban}123500`

    const remainder = mod97(numericString)
    const checkDigits = (98 - remainder).toString().padStart(2, '0')

    return `CZ${checkDigits}${bban}`
}

/**
 * Generates Short Payment Descriptor (SPAYD) string for QR code
 */
export interface SpaydParams {
    accountNumber: string // Can be standard format or IBAN
    amount: number
    currency?: string // Default CZK
    vs?: string // Variable symbol
    ks?: string // Constant symbol
    ss?: string // Specific symbol
    message?: string
}

export function generateSpaydString({
    accountNumber,
    amount,
    currency = 'CZK',
    vs,
    ks,
    ss,
    message
}: SpaydParams): string | null {
    const iban = convertCzechAccountToIban(accountNumber)
    if (!iban) return null

    // Format amount: 2 decimal places
    const formattedAmount = amount.toFixed(2)

    let spayd = `SPD*1.0*ACC:${iban}*AM:${formattedAmount}*CC:${currency}`

    if (vs) spayd += `*X-VS:${vs}`
    if (ks) spayd += `*X-KS:${ks}`
    if (ss) spayd += `*X-SS:${ss}`
    if (message) spayd += `*MSG:${message.toUpperCase().slice(0, 60)}` // MSG usually limited and uppercase recommended

    return spayd
}
