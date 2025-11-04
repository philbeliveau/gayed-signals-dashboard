/**
 * Signals Adapter - V2 to Legacy Format Transformation
 * Story: 4.0h - Frontend Railway Backend Integration
 *
 * Transforms Railway backend V2 API responses to legacy format
 * for backward compatibility with existing UI components
 */

import type { SignalV2Response, SignalV2 } from '../api/types';
import type {
  Signal,
  ConsensusSignal,
  SignalType,
  SignalDirection,
  SignalStrength,
  DataProvenance,
} from '@/domains/trading-signals/types';

export class SignalsAdapter {
  /**
   * Transform V2 API response to legacy format for UI compatibility
   */
  static toLegacyFormat(v2Response: SignalV2Response): {
    signals: Signal[];
    consensus: ConsensusSignal;
    metadata: {
      calculatedAt: string;
      dataSource: string;
      cached: boolean;
      quality: {
        averageScore: number;
        issues: string[];
      };
    };
  } {
    // Debug logging to identify the issue
    console.log('[SignalsAdapter] Raw v2Response:', JSON.stringify(v2Response, null, 2));

    // Defensive validation
    if (!v2Response) {
      console.error('[SignalsAdapter] v2Response is null or undefined');
      throw new Error('Invalid response: v2Response is null or undefined');
    }

    if (!v2Response.data) {
      console.error('[SignalsAdapter] v2Response.data is missing:', v2Response);
      throw new Error('Invalid response: missing data field');
    }

    if (!v2Response.metadata) {
      console.error('[SignalsAdapter] v2Response.metadata is missing:', v2Response);
      throw new Error('Invalid response: missing metadata field');
    }

    // Additional defensive checks for nested properties
    const dataSource = v2Response.metadata?.sources?.primary || 'railway_backend';
    const cached = v2Response.metadata?.timing?.cached || false;
    const quality = v2Response.metadata?.quality || { averageScore: 0, issues: ['Unknown quality'] };

    const signals = v2Response.data.map((v2Signal) =>
      this.transformSignal(v2Signal)
    );
    const consensus = this.calculateConsensus(signals);

    return {
      signals,
      consensus,
      metadata: {
        calculatedAt: new Date().toISOString(),
        dataSource,
        cached,
        quality,
      },
    };
  }

  /**
   * Transform individual V2 signal to legacy format
   */
  private static transformSignal(v2Signal: any): Signal {
    // Handle the actual Railway backend response structure
    const signalName = v2Signal.signalName || v2Signal.type || 'unknown';
    const signalStatus = v2Signal.signalStatus || v2Signal.signal || 'Neutral';

    // Map signal status to expected format
    let mappedSignal: SignalDirection = 'Neutral';
    if (signalStatus === 'risk_on' || signalStatus === 'Risk-On') {
      mappedSignal = 'Risk-On';
    } else if (signalStatus === 'risk_off' || signalStatus === 'Risk-Off') {
      mappedSignal = 'Risk-Off';
    }

    // Determine strength based on signalStrength or confidence
    let strength: SignalStrength = 'Moderate';
    const strengthValue = v2Signal.signalStrength ?? v2Signal.strength;
    if (strengthValue >= 0.8 || strengthValue === 'Strong') {
      strength = 'Strong';
    } else if (strengthValue <= 0.3 || strengthValue === 'Weak') {
      strength = 'Weak';
    }

    return {
      type: this.mapSignalType(signalName),
      signal: mappedSignal,
      strength: strength,
      confidence: v2Signal.confidenceScore ?? v2Signal.confidence ?? 0.5,
      rawValue: v2Signal.signalValue ?? v2Signal.rawValue ?? 0,
      date: v2Signal.calculationDate ?? v2Signal.date ?? new Date().toISOString(),
      provenance: v2Signal.provenance ? this.transformProvenance(v2Signal.provenance) : {
        sources: [],
        validationPassed: true,
        confidenceReduction: 0,
        missingDataSources: [],
      },
    };
  }

  /**
   * Map V2 signal type to legacy SignalType
   */
  private static mapSignalType(v2Type: string): SignalType {
    const typeMap: Record<string, SignalType> = {
      // Railway backend format
      vix_defensive: 'vix_defensive',
      utilities_spy: 'utilities_spy',
      lumber_gold: 'lumber_gold',
      treasury_curve: 'treasury_curve',
      sp500_ma: 'sp500_ma',
      // Alternative formats
      UTILITIES_SPY: 'utilities_spy',
      LUMBER_GOLD: 'lumber_gold',
      TREASURY_CURVE: 'treasury_curve',
      VIX_DEFENSIVE: 'vix_defensive',
      SP500_MA: 'sp500_ma',
    };

    console.log(`[SignalsAdapter] Mapping signal type: ${v2Type} -> ${typeMap[v2Type] || 'utilities_spy'}`);
    return typeMap[v2Type] || ('utilities_spy' as SignalType);
  }

  /**
   * Transform V2 provenance to legacy format
   */
  private static transformProvenance(
    v2Provenance: SignalV2['provenance']
  ): DataProvenance {
    if (!v2Provenance) {
      return {
        sources: [],
        validationPassed: true,
        confidenceReduction: 0,
        missingDataSources: [],
      };
    }

    return {
      sources: (v2Provenance.sources || []).map((source) => ({
        name: source.name,
        symbols: source.symbols || [],
        fetchedAt: source.fetchedAt || new Date().toISOString(),
        dataPoints: source.dataPoints || 0,
        apiSuccess: source.apiSuccess ?? true,
      })),
      validationPassed: v2Provenance.validationPassed ?? true,
      confidenceReduction: v2Provenance.confidenceReduction || 0,
      missingDataSources: v2Provenance.missingDataSources || [],
    };
  }

  /**
   * Calculate consensus signal from individual signals
   */
  private static calculateConsensus(signals: Signal[]): ConsensusSignal {
    const riskOnCount = signals.filter((s) => s.signal === 'Risk-On').length;
    const riskOffCount = signals.filter((s) => s.signal === 'Risk-Off').length;
    const neutralCount = signals.filter((s) => s.signal === 'Neutral').length;

    let consensus: 'Risk-On' | 'Risk-Off' | 'Mixed' = 'Mixed';

    if (riskOnCount > riskOffCount && riskOnCount > neutralCount) {
      consensus = 'Risk-On';
    } else if (riskOffCount > riskOnCount && riskOffCount > neutralCount) {
      consensus = 'Risk-Off';
    }

    const avgConfidence =
      signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length || 0;

    return {
      consensus,
      confidence: avgConfidence,
      riskOnCount,
      riskOffCount,
      neutralCount,
      signals,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Extract data quality badges for UI display
   */
  static getQualityBadges(metadata: SignalV2Response['metadata']): {
    score: number;
    label: string;
    color: string;
    issues: string[];
  } {
    const score = metadata.quality.averageScore;
    let label = 'Unknown';
    let color = 'gray';

    if (score >= 0.9) {
      label = 'Excellent';
      color = 'green';
    } else if (score >= 0.7) {
      label = 'Good';
      color = 'blue';
    } else if (score >= 0.5) {
      label = 'Fair';
      color = 'yellow';
    } else {
      label = 'Poor';
      color = 'red';
    }

    return {
      score,
      label,
      color,
      issues: metadata.quality.issues,
    };
  }

  /**
   * Format provenance information for tooltips
   */
  static formatProvenanceTooltip(provenance: DataProvenance): string {
    const sourceInfo = provenance.sources
      .map(
        (s) =>
          `${s.name}: ${s.symbols.join(', ')} (${s.dataPoints} points, ${s.apiSuccess ? 'success' : 'failed'})`
      )
      .join('\n');

    let tooltip = `Data Sources:\n${sourceInfo}`;

    if (provenance.confidenceReduction > 0) {
      tooltip += `\n\nConfidence Reduction: ${provenance.confidenceReduction}%`;
    }

    if (provenance.missingDataSources.length > 0) {
      tooltip += `\n\nMissing Sources: ${provenance.missingDataSources.join(', ')}`;
    }

    return tooltip;
  }
}
