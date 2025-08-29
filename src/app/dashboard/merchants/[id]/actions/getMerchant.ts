import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function getMerchant(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
            merchantBalances: {
                include: {
                    globalWallet: true
                }
            },
            invoices: {
                take: 5,
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!merchant) {
        notFound()
    }

    // Serialize Decimal and BigInt values to strings for Client Component compatibility
    const serializedMerchant = {
        ...merchant,
        merchantBalances: merchant.merchantBalances.map(balance => ({
            ...balance,
            balance: balance.balance.toString(),
            lockedBalance: balance.lockedBalance.toString(),
            totalReceived: balance.totalReceived.toString(),
            totalWithdrawn: balance.totalWithdrawn.toString(),
            globalWallet: {
                ...balance.globalWallet,
                totalPoolBalance: balance.globalWallet.totalPoolBalance.toString(),
                nextAddressIndex: balance.globalWallet.nextAddressIndex.toString()
            }
        })),
        invoices: merchant.invoices.map(invoice => ({
            ...invoice,
            amount: invoice.amount.toString(),
            amountPaid: invoice.amountPaid ? invoice.amountPaid.toString() : null,
            exchangeRate: invoice.exchangeRate ? invoice.exchangeRate.toString() : null,
            fiatAmount: invoice.fiatAmount ? invoice.fiatAmount.toString() : null
        }))
    }

    return serializedMerchant
}

 
