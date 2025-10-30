import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function getMerchant(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
            merchantWallets: {
                include: {
                    assetNetwork: {
                        include: {
                            asset: true,
                            network: true
                        }
                    }
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
        merchantWallets: merchant.merchantWallets.map(wallet => ({
            ...wallet,
            availableBalance: wallet.availableBalance.toString(),
            pendingBalance: wallet.pendingBalance.toString(),
            lockedBalance: wallet.lockedBalance.toString(),
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

 
