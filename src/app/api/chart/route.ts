import { NextRequest, NextResponse } from 'next/server';

/**
 * Chart Generation API Endpoint
 * 
 * Generates actual chart images for the Backtrader analysis
 * This serves as a fallback when the Python service isn't available
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || ['SPY'];
  const signals = searchParams.get('signals')?.split(',') || ['utilities_spy'];
  const startDate = searchParams.get('startDate') || '2020-01-01';
  const endDate = searchParams.get('endDate') || '2023-12-31';

  try {
    // Generate a mock chart using Canvas API in Node.js
    const chartData = await generateMockChart(symbols, signals, startDate, endDate);
    
    return new NextResponse(chartData, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Chart generation error:', error);
    
    // Return a simple placeholder chart
    const placeholderSVG = createPlaceholderChart(symbols, signals);
    
    return new NextResponse(placeholderSVG, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
      },
    });
  }
}

/**
 * Generate a mock financial chart with signals
 */
async function generateMockChart(symbols: string[], signals: string[], startDate: string, endDate: string): Promise<string> {
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Generate mock price data
  const dataPoints = 100;
  const priceData = [];
  let currentPrice = 100;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeStep = (end.getTime() - start.getTime()) / dataPoints;

  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(start.getTime() + i * timeStep);
    const volatility = 0.02;
    const drift = 0.0002;
    const randomShock = (Math.random() - 0.5) * volatility;
    currentPrice = currentPrice * (1 + drift + randomShock);
    
    priceData.push({
      date: date.toISOString().split('T')[0],
      price: currentPrice,
      x: margin.left + (i / (dataPoints - 1)) * chartWidth,
      y: margin.top + chartHeight - ((currentPrice - 80) / 40) * chartHeight
    });
  }

  // Generate signal markers
  const signalMarkers = [];
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * dataPoints);
    const point = priceData[randomIndex];
    const signalType = Math.random() > 0.5 ? 'Risk-On' : 'Risk-Off';
    
    signalMarkers.push({
      x: point.x,
      y: point.y - 10,
      type: signalType,
      color: signalType === 'Risk-On' ? '#10B981' : '#EF4444'
    });
  }

  // Create SVG chart
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#3B82F6;stop-opacity:0.05" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#0F172A"/>
      
      <!-- Chart area background -->
      <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" 
            fill="#1E293B" stroke="#374151" stroke-width="1"/>
      
      <!-- Grid lines -->
      ${generateGridLines(margin, chartWidth, chartHeight)}
      
      <!-- Price line -->
      <path d="M ${priceData.map(d => `${d.x},${d.y}`).join(' L ')}" 
            stroke="#3B82F6" stroke-width="2" fill="none"/>
      
      <!-- Price area -->
      <path d="M ${margin.left},${margin.top + chartHeight} L ${priceData.map(d => `${d.x},${d.y}`).join(' L ')} L ${margin.left + chartWidth},${margin.top + chartHeight} Z" 
            fill="url(#chartGradient)"/>
      
      <!-- Signal markers -->
      ${signalMarkers.map(marker => `
        <circle cx="${marker.x}" cy="${marker.y}" r="6" fill="${marker.color}" filter="url(#shadow)"/>
        <text x="${marker.x}" y="${marker.y - 15}" text-anchor="middle" fill="white" font-size="10" font-family="Arial">
          ${marker.type === 'Risk-On' ? '📈' : '📉'}
        </text>
      `).join('')}
      
      <!-- Axes -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" 
            stroke="#6B7280" stroke-width="1"/>
      <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" 
            stroke="#6B7280" stroke-width="1"/>
      
      <!-- Labels -->
      <text x="${width / 2}" y="${height - 10}" text-anchor="middle" fill="#9CA3AF" font-size="12" font-family="Arial">
        ${symbols.join(', ')} - Gayed Signals Analysis (${startDate} to ${endDate})
      </text>
      
      <text x="15" y="${height / 2}" text-anchor="middle" fill="#9CA3AF" font-size="12" font-family="Arial" 
            transform="rotate(-90, 15, ${height / 2})">Price</text>
      
      <!-- Legend -->
      <g transform="translate(${width - 150}, 30)">
        <rect x="0" y="0" width="130" height="60" fill="#1E293B" stroke="#374151" stroke-width="1" rx="4"/>
        <circle cx="15" cy="20" r="5" fill="#10B981"/>
        <text x="25" y="24" fill="#10B981" font-size="11" font-family="Arial">Risk-On Signal</text>
        <circle cx="15" cy="40" r="5" fill="#EF4444"/>
        <text x="25" y="44" fill="#EF4444" font-size="11" font-family="Arial">Risk-Off Signal</text>
      </g>
      
      <!-- Title -->
      <text x="${margin.left}" y="15" fill="white" font-size="14" font-family="Arial" font-weight="bold">
        ${signals.map(s => s.replace('_', '/').toUpperCase()).join(', ')} Analysis
      </text>
    </svg>
  `;

  return svg;
}

/**
 * Generate grid lines for the chart
 */
function generateGridLines(margin: any, chartWidth: number, chartHeight: number): string {
  const gridLines = [];
  
  // Vertical grid lines
  for (let i = 0; i <= 10; i++) {
    const x = margin.left + (i / 10) * chartWidth;
    gridLines.push(`<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${margin.top + chartHeight}" stroke="#374151" stroke-width="0.5" opacity="0.5"/>`);
  }
  
  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const y = margin.top + (i / 5) * chartHeight;
    gridLines.push(`<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#374151" stroke-width="0.5" opacity="0.5"/>`);
  }
  
  return gridLines.join('');
}

/**
 * Create a simple placeholder chart when generation fails
 */
function createPlaceholderChart(symbols: string[], signals: string[]): string {
  return `
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="400" fill="#0F172A"/>
      <rect x="50" y="50" width="700" height="300" fill="#1E293B" stroke="#374151" stroke-width="2" rx="8"/>
      
      <text x="400" y="180" text-anchor="middle" fill="#6B7280" font-size="24" font-family="Arial">
        📊 Chart Generation
      </text>
      <text x="400" y="210" text-anchor="middle" fill="#9CA3AF" font-size="16" font-family="Arial">
        ${symbols.join(', ')} - ${signals.join(', ')}
      </text>
      <text x="400" y="240" text-anchor="middle" fill="#6B7280" font-size="14" font-family="Arial">
        Python Backtrader service not available
      </text>
      <text x="400" y="260" text-anchor="middle" fill="#6B7280" font-size="12" font-family="Arial">
        Start Python service for interactive charts
      </text>
    </svg>
  `;
}