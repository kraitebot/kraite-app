/**
 * Plain-English explanations for the five BSCS sub-signals, mirroring the
 * help bubbles on the web dashboard so both surfaces say the same thing.
 * Keyed by the server's stable signal key; an unknown key simply renders
 * without an explanation rather than breaking the row.
 */
export type BscsSignalCopy = {
  title: string;
  tip: string;
  body: string[];
};

export const BSCS_SIGNAL_COPY: Record<string, BscsSignalCopy> = {
  vol_expansion: {
    title: 'Vol expansion',
    tip: 'Is BTC moving much faster than its recent norm?',
    body: [
      'Compares how sharply BTC moved during the last 24 hours with its normal movement over the last 14 days.',
      '1.00 means normal volatility. 1.30 means the last day was 30% more volatile than the baseline.',
      'It fires above 1.30.',
    ],
  },
  range_blowout: {
    title: 'Range blowout',
    tip: "Is today's BTC trading range unusually wide?",
    body: [
      "Compares BTC's full high-to-low range during the last 24 hours with the average daily range over the previous 14 days.",
      "1.00 means a normal-sized day. 1.50 means today's range is 50% wider than normal.",
      'It fires above 1.50.',
    ],
  },
  corr_regime: {
    title: 'Correlation regime',
    tip: 'Are the major coins all moving together?',
    body: [
      'Measures how closely BTC, ETH, SOL, BNB and XRP moved together over the last 48 hours.',
      'A higher value means the market is moving as one, so diversification offers less protection.',
      'It fires above 0.70.',
    ],
  },
  rejection_pct: {
    title: 'Rejection percentage',
    tip: 'How far has BTC fallen from its recent high?',
    body: [
      "Shows how far BTC's latest close sits below its highest price from the last 14 days.",
      'A negative number means BTC has fallen from that high. -5.00 means it is 5% below the peak.',
      'It fires below -5.00.',
    ],
  },
  fut_vol: {
    title: 'Futures volume',
    tip: 'Is BTC futures activity unusually high?',
    body: [
      'Compares BTC futures trading volume during the last 24 hours with the average daily volume over the last 14 days.',
      '1.00 means normal volume. 1.20 means activity is 20% above normal.',
      'It fires above 1.20.',
    ],
  },
};

export function bscsSignalCopy(key: string): BscsSignalCopy | null {
  return BSCS_SIGNAL_COPY[key] ?? null;
}
