/**
 * Signal Descriptions and Research Papers
 *
 * Contains detailed descriptions, methodologies, and research papers for each Gayed signal.
 * Papers will be uploaded to Vercel Blob for global CDN delivery.
 */

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  ssrnId: string;
  blobUrl?: string; // Vercel Blob URL (set after upload)
  fileName: string;
  description: string;
}

export interface SignalDescription {
  signalType: string;
  displayName: string;
  shortDescription: string;
  methodology: string;
  interpretation: {
    riskOn: string;
    riskOff: string;
    neutral: string;
  };
  relatedPapers: string[]; // Paper IDs
}

/**
 * Research Papers Database
 * Papers uploaded to Vercel Blob: gayed-signals-dashboard-blob
 */
export const RESEARCH_PAPERS: Record<string, ResearchPaper> = {
  'utilities-spy-rotation': {
    id: 'utilities-spy-rotation',
    title: 'An Intermarket Approach to Beta Rotation',
    authors: ['Michael A. Gayed', 'Charles Bilello'],
    year: 2014,
    ssrnId: '2417974',
    fileName: 'An Intermarket Approach to Beta Rotation.pdf',
    description: 'Examines the predictive power of utilities sector relative strength for equity market timing.',
    blobUrl: 'https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/An%20Intermarket%20Approach%20to%20Beta%20Rotation.pdf'
  },
  'lumber-gold-ratio': {
    id: 'lumber-gold-ratio',
    title: 'Lumber Worth Its Weight in Gold',
    authors: ['Michael A. Gayed'],
    year: 2014,
    ssrnId: '2431022',
    fileName: 'Lumber Worth Its Weight in Gold.pdf',
    description: 'Analyzes lumber/gold price ratio as a leading indicator of economic growth and risk appetite.',
    blobUrl: 'https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/Lumber%20Worth%20Its%20Weight%20in%20Gold.pdf'
  },
  'treasury-yield-curve': {
    id: 'treasury-yield-curve',
    title: 'An Intermarket Approach to Tactical Risk Rotation',
    authors: ['Michael A. Gayed'],
    year: 2015,
    ssrnId: '2604248',
    fileName: 'An Intermarket Approach to Tactical Risk Rotation.pdf',
    description: 'Studies yield curve dynamics as predictors of market volatility and regime changes.',
    blobUrl: 'https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/An%20Intermarket%20Approach%20to%20Tactical%20Risk%20Rotation.pdf'
  },
  'vix-defensive-positioning': {
    id: 'vix-defensive-positioning',
    title: 'Actively Using Passive Sectors to Generate Alpha Using the VIX',
    authors: ['Michael A. Gayed'],
    year: 2016,
    ssrnId: '2741701',
    fileName: 'Actively Using Passive Sectors to Generate Alpha Using the VIX.pdf',
    description: 'Explores volatility-based defensive positioning strategies during market stress.',
    blobUrl: 'https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/Actively%20Using%20Passive%20Sectors%20to%20Generate%20Alpha%20Using%20the%20VIX.pdf'
  },
  'moving-average-signals': {
    id: 'moving-average-signals',
    title: 'Leverage for the Long Run',
    authors: ['Michael A. Gayed'],
    year: 2020,
    ssrnId: '3718824',
    fileName: 'Leverage for the Long Run.pdf',
    description: 'Evaluates moving average crossover strategies for tactical asset allocation.',
    blobUrl: 'https://gayed-signals-dashboard-blob.public.blob.vercel-storage.com/Leverage%20for%20the%20Long%20Run.pdf'
  }
};

/**
 * Signal Descriptions with Methodology
 */
export const SIGNAL_DESCRIPTIONS: Record<string, SignalDescription> = {
  'utilities_spy': {
    signalType: 'utilities_spy',
    displayName: 'Utilities/SPY Rotation',
    shortDescription: 'Measures relative strength between defensive utilities sector (XLU) and broad market (SPY) to identify risk regime shifts.',
    methodology: `This signal compares the performance ratio of the Utilities sector (XLU) to the S&P 500 (SPY). When utilities outperform (ratio rising),
    investors are rotating into defensive assets, signaling risk-off sentiment. When SPY outperforms utilities (ratio falling), investors favor growth and
    cyclical assets, indicating risk-on conditions. The signal uses momentum analysis to detect inflection points in this relationship.`,
    interpretation: {
      riskOn: 'SPY is outperforming XLU, indicating investors favor growth stocks over defensive utilities. Market sentiment is bullish with appetite for higher risk assets.',
      riskOff: 'XLU is outperforming SPY, suggesting investors are rotating into defensive sectors. This typically precedes or accompanies market volatility and equity weakness.',
      neutral: 'Utilities and SPY are performing similarly, indicating indecisive market sentiment with no clear directional bias.'
    },
    relatedPapers: ['utilities-spy-rotation']
  },
  'lumber_gold': {
    signalType: 'lumber_gold',
    displayName: 'Lumber/Gold Ratio',
    shortDescription: 'Compares growth-sensitive lumber prices to defensive gold prices as a leading indicator of economic expansion or contraction.',
    methodology: `The lumber/gold ratio divides lumber futures prices by gold spot prices. Lumber is highly sensitive to housing demand and economic growth,
    while gold is a traditional defensive asset that rises during uncertainty. A rising ratio suggests economic strength and risk-taking (risk-on), while a
    falling ratio indicates economic concerns and defensive positioning (risk-off). This ratio has historically led equity market moves by several weeks.`,
    interpretation: {
      riskOn: 'Lumber is appreciating relative to gold, signaling strong economic growth expectations and housing demand. Investors are rotating away from defensive gold into growth-sensitive commodities.',
      riskOff: 'Gold is strengthening relative to lumber, indicating economic growth concerns and defensive positioning. This often precedes equity market weakness.',
      neutral: 'Lumber and gold are moving in tandem, suggesting balanced economic outlook with mixed growth signals.'
    },
    relatedPapers: ['lumber-gold-ratio']
  },
  'treasury_curve': {
    signalType: 'treasury_curve',
    displayName: 'Treasury Yield Curve',
    shortDescription: 'Monitors the slope of the yield curve (10-year minus 2-year Treasury yields) to gauge economic expectations and financial stress.',
    methodology: `This signal calculates the spread between 10-year and 2-year Treasury yields. A steepening curve (widening spread) reflects growth expectations
    and risk-on sentiment, as investors demand higher compensation for long-term duration risk. A flattening or inverted curve (narrowing/negative spread)
    indicates recession concerns and risk-off positioning. The signal tracks rate of change in the spread to identify inflection points.`,
    interpretation: {
      riskOn: 'Yield curve is steepening, reflecting positive economic growth expectations and healthy credit conditions. Long-term rates rising faster than short-term rates.',
      riskOff: 'Yield curve is flattening or inverted, signaling recession concerns and flight-to-quality flows into long-duration Treasuries. Historically precedes market downturns.',
      neutral: 'Yield curve slope is stable with no significant steepening or flattening trend. Economic outlook appears balanced.'
    },
    relatedPapers: ['treasury-yield-curve']
  },
  'vix_defensive': {
    signalType: 'vix_defensive',
    displayName: 'VIX Defensive',
    shortDescription: 'Analyzes VIX (volatility index) patterns to identify when defensive positioning is warranted based on market stress levels.',
    methodology: `This signal monitors the VIX "fear gauge" and its term structure to identify elevated volatility regimes. Rising VIX (above certain thresholds)
    signals increasing market stress and option hedging demand, indicating risk-off conditions. Falling VIX (below thresholds) suggests complacency and risk-on
    sentiment. The signal also examines VIX term structure (contango vs backwardation) to gauge persistence of volatility expectations.`,
    interpretation: {
      riskOn: 'VIX is declining or in steep contango, indicating low market stress and investor complacency. Volatility hedging demand is minimal.',
      riskOff: 'VIX is rising or in backwardation, signaling elevated market stress and defensive hedging demand. Option markets pricing significant tail risk.',
      neutral: 'VIX is range-bound with normal term structure. Market stress levels are average with no extreme readings.'
    },
    relatedPapers: ['vix-defensive-positioning']
  },
  'sp500_ma': {
    signalType: 'sp500_ma',
    displayName: 'S&P 500 Moving Average',
    shortDescription: 'Uses S&P 500 position relative to key moving averages (50-day, 200-day) to identify trend strength and potential regime changes.',
    methodology: `This signal tracks whether SPY is trading above or below critical moving averages (50-day and 200-day). Trading above both MAs with positive
    slope indicates a healthy risk-on uptrend. Trading below both MAs (especially the 200-day) signals risk-off conditions and potential bear market. The signal
    also monitors moving average crossovers (golden cross/death cross) and slope direction to confirm trend strength and reversals.`,
    interpretation: {
      riskOn: 'SPY trading above 50-day and 200-day moving averages with both MAs sloping upward. Strong bullish trend with momentum confirming higher prices.',
      riskOff: 'SPY trading below key moving averages (especially 200-day) or death cross pattern forming. Downtrend in place with technical weakness.',
      neutral: 'SPY oscillating around moving averages with conflicting signals. Trend direction is unclear, suggesting consolidation or transition phase.'
    },
    relatedPapers: ['moving-average-signals']
  }
};

/**
 * Get signal description by signal type
 */
export function getSignalDescription(signalType: string): SignalDescription | undefined {
  return SIGNAL_DESCRIPTIONS[signalType];
}

/**
 * Get research paper by ID
 */
export function getResearchPaper(paperId: string): ResearchPaper | undefined {
  return RESEARCH_PAPERS[paperId];
}

/**
 * Get all research papers for a signal
 */
export function getSignalPapers(signalType: string): ResearchPaper[] {
  const description = SIGNAL_DESCRIPTIONS[signalType];
  if (!description) return [];

  return description.relatedPapers
    .map(paperId => RESEARCH_PAPERS[paperId])
    .filter(Boolean) as ResearchPaper[];
}

/**
 * Get all available research papers
 */
export function getAllResearchPapers(): ResearchPaper[] {
  return Object.values(RESEARCH_PAPERS);
}
