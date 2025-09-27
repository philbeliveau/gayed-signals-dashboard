import { NextRequest, NextResponse } from 'next/server';
import { mcpDebateService } from '@/lib/fact-check/simplified-mcp-debate';

/**
 * Test API route for Substack MCP integration
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Substack MCP Integration API...');
    
    // Get test claim from query parameters or use default
    const { searchParams } = new URL(request.url);
    const testClaim = searchParams.get('claim') || 'AI models will significantly impact programming within the next 5 years';
    const claimId = `test-${Date.now()}`;
    
    console.log(`🎯 Testing claim: "${testClaim}"`);
    
    // Run the fact-check debate with 4 agents including Substack
    const result = await mcpDebateService.conductDebate(testClaim, claimId);
    
    // Check if Substack agent was included
    const substackArguments = result.rounds
      .flatMap(round => round.arguments)
      .filter(arg => arg.agentId === 'substack-agent');
    
    const hasSubstackAgent = substackArguments.length > 0;
    
    // Prepare response
    const response = {
      success: true,
      testClaim,
      claimId,
      results: {
        finalVeracity: result.finalVeracity,
        confidence: result.confidence,
        consensusLevel: result.consensusLevel,
        totalRounds: result.rounds.length,
        substackIntegration: {
          enabled: hasSubstackAgent,
          arguments: substackArguments.length,
          details: substackArguments.map(arg => ({
            reasoning: arg.reasoning,
            evidence: arg.evidence.length,
            confidence: arg.confidence,
            position: arg.position
          }))
        }
      },
      agentSummary: result.rounds
        .flatMap(round => round.arguments)
        .reduce((summary: any, arg) => {
          if (!summary[arg.agentId]) {
            summary[arg.agentId] = { count: 0, totalConfidence: 0 };
          }
          summary[arg.agentId].count++;
          summary[arg.agentId].totalConfidence += arg.confidence;
          summary[arg.agentId].avgConfidence = summary[arg.agentId].totalConfidence / summary[arg.agentId].count;
          return summary;
        }, {})
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Substack MCP test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No stack trace available'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim } = body;
    
    if (!claim) {
      return NextResponse.json(
        { success: false, error: 'Claim is required' },
        { status: 400 }
      );
    }
    
    // Same logic as GET but with custom claim
    return GET(new NextRequest(request.url + `?claim=${encodeURIComponent(claim)}`));
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid request body'
      },
      { status: 400 }
    );
  }
}