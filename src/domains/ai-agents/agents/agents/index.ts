/**
 * Fact-Check Agents Index
 * Phase 2 Implementation - Autonomous MCP-Powered Agents Export
 * 
 * 🚨 CRITICAL: ALL 5 AUTONOMOUS AGENTS COMPLETED
 * 
 * Exports all specialized fact-checking agents with SAFLA protocol
 */

export { BaseFactCheckAgent } from './base-agent';
export { AcademicAgent } from './academic-agent';
export { NewsAgent } from './news-agent';
export { FinancialAgent } from './financial-agent';
export { SocialAgent } from './social-agent';
export { GovernmentAgent } from './government-agent';

// Agent factory for dynamic instantiation
export const createAgent = (agentType: string) => {
  switch (agentType.toUpperCase()) {
    case 'ACADEMIC':
      return new (require('./academic-agent').AcademicAgent)();
    case 'NEWS':
      return new (require('./news-agent').NewsAgent)();
    case 'FINANCIAL':
      return new (require('./financial-agent').FinancialAgent)();
    case 'SOCIAL':
      return new (require('./social-agent').SocialAgent)();
    case 'GOVERNMENT':
      return new (require('./government-agent').GovernmentAgent)();
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
};

// Get all agent types
export const getAllAgentTypes = () => ['ACADEMIC', 'NEWS', 'FINANCIAL', 'SOCIAL', 'GOVERNMENT'];

// Get MCP requirements for all agents
export const getAllMcpRequirements = () => {
  const allRequirements = new Set<string>();
  
  // Academic Agent MCP services
  allRequirements.add('@jschuller/perplexity-mcp');
  allRequirements.add('@elastic/mcp-server-elasticsearch');
  allRequirements.add('@tongxiao/web-search-mcp-server');
  
  // News Agent MCP services
  allRequirements.add('brave-search-mcp');
  // web-search already added
  // perplexity already added
  
  // Financial Agent MCP services
  allRequirements.add('mcp-trader');
  // perplexity already added
  // web-search already added
  
  // Social Agent MCP services
  // brave-search already added
  allRequirements.add('omnisearch-mcp');
  // web-search already added
  
  // Government Agent MCP services
  // web-search already added
  // perplexity already added
  // brave-search already added
  
  return Array.from(allRequirements);
};

// Validate all agents have required MCP services
export const validateMcpAvailability = async (): Promise<{
  available: string[];
  missing: string[];
  allAvailable: boolean;
}> => {
  const required = getAllMcpRequirements();
  const available: string[] = [];
  const missing: string[] = [];
  
  for (const service of required) {
    try {
      // Try to execute a test command for each MCP service
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync(`npx ${service} --version`, { timeout: 5000 });
      available.push(service);
    } catch (error) {
      missing.push(service);
    }
  }
  
  return {
    available,
    missing,
    allAvailable: missing.length === 0
  };
};