import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

export default async function getMerchant(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
            wallets: true,
            invoices: {
                take: 5,
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!merchant) {
        notFound()
    }

    return merchant
}

 
