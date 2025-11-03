import { createTRPCRouter, publicProcedure } from '../procedures';

export const currencyRouter = createTRPCRouter({
  // Get all active assets with their networks (for invoice creation)
  getActiveAssets: publicProcedure.query(async ({ ctx }) => {
    const assets = await ctx.prisma.asset.findMany({
      where: {
        isActive: true,
        assetOnNetworks: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        assetOnNetworks: {
          where: { isActive: true },
          include: {
            network: true,
          },
          orderBy: [{ network: { code: 'asc' } }],
        },
      },
      orderBy: { symbol: 'asc' },
    });

    // Transform to frontend-friendly format
    return assets.map((asset) => ({
      code: asset.symbol,
      name: asset.name,
      icon: asset.logoUrl || `/icons/crypto/${asset.symbol.toLowerCase()}.png`,
      type: asset.type,
      networks: asset.assetOnNetworks.map((assetNetwork) => ({
        network: assetNetwork.network.code,
        displayName: assetNetwork.network.name,
        networkId: assetNetwork.network.id,
        assetNetworkId: assetNetwork.id,
        tatumChainId: assetNetwork.network.tatumChainId,
        isTestnet: assetNetwork.network.isTestnet,
        contractAddress: assetNetwork.contractAddress,
        tokenStandard: assetNetwork.tokenStandard,
        decimals: assetNetwork.decimals,
      })),
    }));
  }),
});
