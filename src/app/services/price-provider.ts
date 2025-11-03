import axios from 'axios';

const BINANCE_API_URL = 'https://api.binance.com/api/v3';

// Map our currency codes to Binance symbols

export async function fetchPricesFromAPI(codes: string[]) {
  try {
    let CURRENCY_MAPPING: Record<string, string> = codes.reduce((acc, code) => {
      acc[code] = `${code}USDT`;
      return acc;
    }, {} as Record<string, string>);
    // Filter out codes with no Binance symbols
    const filteredCodes = codes.filter((code) => CURRENCY_MAPPING[code]);

    // Fetch Binance prices only for mapped currencies
    const response = await axios.get(`${BINANCE_API_URL}/ticker/price`);
    const binancePrices = response.data;

    // Create a price map
    const priceMap: Record<string, number> = {};

    // Process mapped currencies
    filteredCodes.forEach((code) => {
      const symbol = CURRENCY_MAPPING[code];
      if (symbol) {
        const ticker = binancePrices.find((t: any) => t.symbol === symbol);
        if (ticker) {
          priceMap[code] = parseFloat(ticker.price);
        }
      }
    });

    // Add fixed prices for any code starting with "USDT"
    codes.forEach((code) => {
      if (code.startsWith('USDT')) {
        priceMap[code] = 1; // Assign a fixed value of 1
      }
    });

    return priceMap;
  } catch (error) {
    console.error('Error fetching prices from Binance:', error);
    throw new Error('Failed to fetch prices from Binance');
  }
}

