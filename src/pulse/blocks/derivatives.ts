import type { PulseConfig, WatchlistCoin } from '../config.js';
import type { CoinDailySeries } from '../types.js';
import { fetchFundingRate, fetchOpenInterestChangePct, fetchLiquidations } from '../services/okxDerivatives.js';

function formatUsdCompact(amount: number): string {
  if (amount >= 10_000_000) return `$${Math.round(amount / 1_000_000)}M`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${Math.round(amount)}`;
}

interface DerivativesInput {
  coin: WatchlistCoin;
  funding: number | null;
  oiChange: number | null;
  liqLong: number;
  liqShort: number;
}

/** Step: Block 4 — up to three fragments (liquidations, funding, OI), each
 * included only if it clears its own notability bar; jargon is fine here
 * (spec §0 — this audience trades). Returns null if nothing cleared any bar
 * (quiet derivatives night is a valid, silent outcome — matches Block 2's
 * philosophy) or if every underlying fetch failed. */
export async function buildDerivativesLine(
  watchlist: readonly WatchlistCoin[],
  seriesList: Array<CoinDailySeries | null>,
  config: PulseConfig,
): Promise<string | null> {
  const inputs: DerivativesInput[] = await Promise.all(
    watchlist.map(async (coin) => {
      const [funding, oiChange, liq] = await Promise.all([
        fetchFundingRate(coin.swapInstId),
        fetchOpenInterestChangePct(coin.swapInstId),
        fetchLiquidations(coin.uly, coin.swapInstId, config.liquidationsLookbackHours),
      ]);
      return { coin, funding, oiChange, liqLong: liq?.longUsd ?? 0, liqShort: liq?.shortUsd ?? 0 };
    }),
  );

  const fragments: string[] = [];

  // Liquidations — combined across the whole watchlist ("кто кого" over the night).
  const totalLong = inputs.reduce((sum, i) => sum + i.liqLong, 0);
  const totalShort = inputs.reduce((sum, i) => sum + i.liqShort, 0);
  if (totalLong + totalShort >= config.liquidationsNotableUsd) {
    if (totalLong >= totalShort * 1.5) {
      fragments.push(`За ночь вынесли ${formatUsdCompact(totalLong)} лонгов.`);
    } else if (totalShort >= totalLong * 1.5) {
      fragments.push(`За ночь вынесли ${formatUsdCompact(totalShort)} шортов.`);
    } else {
      fragments.push(`За ночь вынесли ${formatUsdCompact(totalLong)} лонгов и ${formatUsdCompact(totalShort)} шортов.`);
    }
  }

  // Funding — most extreme (farthest from 0) across the watchlist.
  const withFunding = inputs.filter((i): i is DerivativesInput & { funding: number } => i.funding !== null);
  if (withFunding.length > 0) {
    const hottest = withFunding.reduce((a, b) => (Math.abs(b.funding) > Math.abs(a.funding) ? b : a));
    if (Math.abs(hottest.funding) >= config.fundingExtremePct) {
      const pctStr = `${hottest.funding >= 0 ? '+' : ''}${(hottest.funding * 100).toFixed(2)}%`;
      const crowdWord = hottest.funding >= 0 ? 'толпа в лонгах' : 'толпа в шортах';
      fragments.push(`Фандинг по ${hottest.coin.symbol} перегрет (${pctStr}) — ${crowdWord}.`);
    }
  }

  // OI — most extreme % change across the watchlist, with price direction as context.
  const withOi = inputs.filter((i): i is DerivativesInput & { oiChange: number } => i.oiChange !== null);
  if (withOi.length > 0) {
    const mostChanged = withOi.reduce((a, b) => (Math.abs(b.oiChange) > Math.abs(a.oiChange) ? b : a));
    if (Math.abs(mostChanged.oiChange) >= config.oiChangeNotablePct) {
      const oiPctStr = `${mostChanged.oiChange >= 0 ? '+' : ''}${(mostChanged.oiChange * 100).toFixed(1)}%`;
      const priceSeries = seriesList.find((s) => s?.coin.symbol === mostChanged.coin.symbol);
      if (mostChanged.oiChange >= 0) {
        const pricedDown = priceSeries ? priceSeries.change24hPct < 0 : false;
        const trendWord = pricedDown ? 'на падении' : 'на росте';
        const tail = pricedDown ? 'набор шортов' : 'приток новых позиций';
        fragments.push(`OI по ${mostChanged.coin.symbol} ${oiPctStr} ${trendWord} — ${tail}.`);
      } else {
        fragments.push(`OI по ${mostChanged.coin.symbol} ${oiPctStr} — позиции закрываются.`);
      }
    }
  }

  return fragments.length > 0 ? fragments.join(' ') : null;
}
