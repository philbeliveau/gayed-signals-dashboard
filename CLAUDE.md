# Claude Code Configuration

## Build Commands
- `npm run build`: Build the project
- `npm run test`: Run the full test suite
- `npm run lint`: Run ESLint and format checks
- `npm run typecheck`: Run TypeScript type checking
- `./claude-flow --help`: Show all available commands

## Claude-Flow Complete Command Reference

### Core System Commands
- `./claude-flow start [--ui] [--port 3000] [--host localhost]`: Start orchestration system with optional web UI
- `./claude-flow status`: Show comprehensive system status
- `./claude-flow monitor`: Real-time system monitoring dashboard
- `./claude-flow config <subcommand>`: Configuration management (show, get, set, init, validate)

### Agent Management
- `./claude-flow agent spawn <type> [--name <name>]`: Create AI agents (researcher, coder, analyst, etc.)
- `./claude-flow agent list`: List all active agents
- `./claude-flow spawn <type>`: Quick agent spawning (alias for agent spawn)

### Task Orchestration
- `./claude-flow task create <type> [description]`: Create and manage tasks
- `./claude-flow task list`: View active task queue
- `./claude-flow workflow <file>`: Execute workflow automation files

### Memory Management
- `./claude-flow memory store <key> <data>`: Store persistent data across sessions
- `./claude-flow memory get <key>`: Retrieve stored information
- `./claude-flow memory list`: List all memory keys
- `./claude-flow memory export <file>`: Export memory to file
- `./claude-flow memory import <file>`: Import memory from file
- `./claude-flow memory stats`: Memory usage statistics
- `./claude-flow memory cleanup`: Clean unused memory entries

### SPARC Development Modes
- `./claude-flow sparc "<task>"`: Run orchestrator mode (default)
- `./claude-flow sparc run <mode> "<task>"`: Run specific SPARC mode
- `./claude-flow sparc tdd "<feature>"`: Test-driven development mode
- `./claude-flow sparc modes`: List all 17 available SPARC modes

Available SPARC modes: orchestrator, coder, researcher, tdd, architect, reviewer, debugger, tester, analyzer, optimizer, documenter, designer, innovator, swarm-coordinator, memory-manager, batch-executor, workflow-manager

### Swarm Coordination
- `./claude-flow swarm "<objective>" [options]`: Multi-agent swarm coordination
- `--strategy`: research, development, analysis, testing, optimization, maintenance
- `--mode`: centralized, distributed, hierarchical, mesh, hybrid
- `--max-agents <n>`: Maximum number of agents (default: 5)
- `--parallel`: Enable parallel execution
- `--monitor`: Real-time monitoring
- `--output <format>`: json, sqlite, csv, html

### MCP Server Integration
- `./claude-flow mcp start [--port 3000] [--host localhost]`: Start MCP server
- `./claude-flow mcp status`: Show MCP server status
- `./claude-flow mcp tools`: List available MCP tools

### Claude Integration
- `./claude-flow claude auth`: Authenticate with Claude API
- `./claude-flow claude models`: List available Claude models
- `./claude-flow claude chat`: Interactive chat mode

### Session Management
- `./claude-flow session`: Manage terminal sessions
- `./claude-flow repl`: Start interactive REPL mode

### Enterprise Features
- `./claude-flow project <subcommand>`: Project management (Enterprise)
- `./claude-flow deploy <subcommand>`: Deployment operations (Enterprise)
- `./claude-flow cloud <subcommand>`: Cloud infrastructure management (Enterprise)
- `./claude-flow security <subcommand>`: Security and compliance tools (Enterprise)
- `./claude-flow analytics <subcommand>`: Analytics and insights (Enterprise)

### Project Initialization
- `./claude-flow init`: Initialize Claude-Flow project
- `./claude-flow init --sparc`: Initialize with full SPARC development environment

## Quick Start Workflows

### Research Workflow
```bash
# Start a research swarm with distributed coordination
./claude-flow swarm "Research modern web frameworks" --strategy research --mode distributed --parallel --monitor

# Or use SPARC researcher mode for focused research
./claude-flow sparc run researcher "Analyze React vs Vue vs Angular performance characteristics"

# Store findings in memory for later use
./claude-flow memory store "research_findings" "Key insights from framework analysis"
```

### Development Workflow
```bash
# Start orchestration system with web UI
./claude-flow start --ui --port 3000

# Run TDD workflow for new feature
./claude-flow sparc tdd "User authentication system with JWT tokens"

# Development swarm for complex projects
./claude-flow swarm "Build e-commerce API with payment integration" --strategy development --mode hierarchical --max-agents 8 --monitor

# Check system status
./claude-flow status
```

### Analysis Workflow
```bash
# Analyze codebase performance
./claude-flow sparc run analyzer "Identify performance bottlenecks in current codebase"

# Data analysis swarm
./claude-flow swarm "Analyze user behavior patterns from logs" --strategy analysis --mode mesh --parallel --output sqlite

# Store analysis results
./claude-flow memory store "performance_analysis" "Bottlenecks identified in database queries"
```

### Maintenance Workflow
```bash
# System maintenance with safety controls
./claude-flow swarm "Update dependencies and security patches" --strategy maintenance --mode centralized --monitor

# Security review
./claude-flow sparc run reviewer "Security audit of authentication system"

# Export maintenance logs
./claude-flow memory export maintenance_log.json
```

## Integration Patterns

### Memory-Driven Coordination
Use Memory to coordinate information across multiple SPARC modes and swarm operations:

```bash
# Store architecture decisions
./claude-flow memory store "system_architecture" "Microservices with API Gateway pattern"

# All subsequent operations can reference this decision
./claude-flow sparc run coder "Implement user service based on system_architecture in memory"
./claude-flow sparc run tester "Create integration tests for microservices architecture"
```

### Multi-Stage Development
Coordinate complex development through staged execution:

```bash
# Stage 1: Research and planning
./claude-flow sparc run researcher "Research authentication best practices"
./claude-flow sparc run architect "Design authentication system architecture"

# Stage 2: Implementation
./claude-flow sparc tdd "User registration and login functionality"
./claude-flow sparc run coder "Implement JWT token management"

# Stage 3: Testing and deployment
./claude-flow sparc run tester "Comprehensive security testing"
./claude-flow swarm "Deploy authentication system" --strategy maintenance --mode centralized
```

### Enterprise Integration
For enterprise environments with additional tooling:

```bash
# Project management integration
./claude-flow project create "authentication-system"
./claude-flow project switch "authentication-system"

# Security compliance
./claude-flow security scan
./claude-flow security audit

# Analytics and monitoring
./claude-flow analytics dashboard
./claude-flow deploy production --monitor
```

## Advanced Batch Tool Patterns

### TodoWrite Coordination
Always use TodoWrite for complex task coordination:

```javascript
TodoWrite([
  {
    id: "architecture_design",
    content: "Design system architecture and component interfaces",
    status: "pending",
    priority: "high",
    dependencies: [],
    estimatedTime: "60min",
    assignedAgent: "architect"
  },
  {
    id: "frontend_development", 
    content: "Develop React components and user interface",
    status: "pending",
    priority: "medium",
    dependencies: ["architecture_design"],
    estimatedTime: "120min",
    assignedAgent: "frontend_team"
  }
]);
```

### Task and Memory Integration
Launch coordinated agents with shared memory:

```javascript
// Store architecture in memory
Task("System Architect", "Design architecture and store specs in Memory");

// Other agents use memory for coordination
Task("Frontend Team", "Develop UI using Memory architecture specs");
Task("Backend Team", "Implement APIs according to Memory specifications");
```

## Code Style Preferences
- Use ES modules (import/export) syntax
- Destructure imports when possible
- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use async/await instead of Promise chains
- Prefer const/let over var

## Workflow Guidelines
- Always run typecheck after making code changes
- Run tests before committing changes
- Use meaningful commit messages
- Create feature branches for new functionality
- Ensure all tests pass before merging

## Important Notes
- **Use TodoWrite extensively** for all complex task coordination
- **Leverage Task tool** for parallel agent execution on independent work
- **Store all important information in Memory** for cross-agent coordination
- **Use batch file operations** whenever reading/writing multiple files
- **Check .claude/commands/** for detailed command documentation
- **All swarm operations include automatic batch tool coordination**
- **Monitor progress** with TodoRead during long-running operations
- **Enable parallel execution** with --parallel flags for maximum efficiency

This configuration ensures optimal use of Claude Code's batch tools for swarm orchestration and parallel task execution with full Claude-Flow capabilities.

# =================================================================
# MCP SERVER INTEGRATIONS - COMPREHENSIVE GUIDE
# =================================================================

## Available MCP Servers

### 1. **Trader MCP** - Financial Market Analysis
**Purpose**: Technical analysis and trading tools for stocks and crypto
**Installation**: ✅ Configured with uvx
**API Key**: Uses TIINGO_API_KEY from your .env file

**Key Tools**:
- `analyze_stock(symbol)` - Analyze stock technical indicators
- `analyze_crypto(symbol, provider, lookback_days)` - Crypto technical analysis
- `relative_strength(symbol, benchmark)` - Calculate relative strength vs benchmark
- `volume_profile(symbol, lookback_days)` - Analyze volume distribution
- `detect_patterns(symbol)` - Identify chart patterns
- `position_size(symbol, stop_price, risk_amount, account_size)` - Calculate position sizing
- `suggest_stops(symbol)` - Suggest stop loss levels

**Usage Examples**:
```
"Analyze NVDA stock with technical indicators"
"Calculate relative strength of BTC vs SPY over 90 days"
"Suggest position size for TSLA with $500 risk and $10,000 account"
```

### 2. **Serena MCP** - Semantic Code Analysis & Editing
**Purpose**: Advanced coding agent toolkit with semantic retrieval
**Installation**: ✅ Configured with uvx from GitHub
**API Key**: None required

**Key Features**:
- Semantic code search and retrieval
- Language server integration
- Project-aware code analysis
- Direct code editing capabilities
- Context-aware code suggestions

**Usage Examples**:
```
"Find all functions that handle user authentication"
"Analyze the database connection patterns in this codebase"
"Refactor the payment processing module for better error handling"
```

### 3. **Playwright MCP** - Web Automation
**Purpose**: Browser automation and web testing
**Installation**: ✅ Configured with npx
**API Key**: None required

**Key Tools**:
- Page navigation and interaction
- Screenshot capture
- Form filling and submission
- Element selection and manipulation
- Network monitoring
- Accessibility testing

**Usage Examples**:
```
"Take a screenshot of the login page"
"Fill out the registration form with test data"
"Monitor network requests during checkout process"
```

### 4. **Tavily MCP** - AI-Powered Web Search
**Purpose**: Advanced web search with AI content extraction
**Installation**: ✅ Configured (requires API key)
**API Key**: TAVILY_API_KEY (get from https://tavily.com)

**Key Features**:
- AI-optimized search results
- Content extraction and summarization
- Domain filtering capabilities
- Real-time web data retrieval

**Usage Examples**:
```
"Search for recent developments in React 19"
"Find technical documentation for PostgreSQL indexing"
"Research competitor pricing strategies"
```

### 5. **Zen MCP** - Multi-AI Orchestration
**Purpose**: Coordinate multiple AI models and workflows
**Installation**: ✅ Configured (requires API keys)
**API Keys**: OPENAI_API_KEY (configured), OPENROUTER_API_KEY (needed)

**Key Features**:
- Multi-model coordination
- Workflow continuation
- AI team management
- Cross-platform AI integration

**Usage Examples**:
```
"Coordinate a code review using multiple AI perspectives"
"Create a research report using different AI models"
"Implement a feature with AI team collaboration"
```

### 6. **Browser-Tools MCP** - Advanced Browser Integration
**Purpose**: Deep browser integration with debugging tools
**Installation**: ✅ Configured (requires Chrome extension)
**API Key**: None required

**Key Features**:
- Console monitoring
- Performance profiling
- Lighthouse audits
- Network analysis
- DevTools integration

**Usage Examples**:
```
"Run a Lighthouse audit on the homepage"
"Monitor console errors during user interaction"
"Analyze network performance bottlenecks"
```

### 7. **Context7 MCP** - External Context Integration
**Purpose**: External context and data integration
**Installation**: ✅ HTTP-based integration
**API Key**: None required

**Key Features**:
- External data source integration
- Context-aware assistance
- Real-time information retrieval

### 8. **NIA MCP** - Codebase Context & Analysis
**Purpose**: Advanced codebase analysis and context retrieval using AI
**Installation**: ✅ Configured with npx
**API Key**: Uses NIA_API_KEY from your .env file

**Key Features**:
- Intelligent codebase context retrieval
- Semantic code search across entire project
- AI-powered code analysis and understanding
- Cross-file dependency mapping
- Natural language code queries

**Key Tools**:
- `lookup_codebase_context(query)` - Retrieve relevant code snippets and context based on natural language queries

**Usage Examples**:
```
"Find all authentication-related code in the project"
"Show me how user data is validated across the codebase"
"Locate error handling patterns in the API endpoints"
"Find database schema definitions and related queries"
```

**Special Features**:
- Works with any codebase that's been indexed in Nia
- Provides contextual understanding beyond simple text search
- Integrates with your existing development workflow
- Supports complex multi-file analysis

## MCP Tool Selection & Planning Algorithm

### Phase 1: Task Analysis & Tool Selection
```javascript
function selectMCPTools(task, context) {
  const taskType = analyzeTaskType(task);
  const selectedTools = [];
  
  // Code-related tasks
  if (taskType.includes('code', 'development', 'refactor', 'debug')) {
    selectedTools.push('serena'); // Semantic code analysis
    selectedTools.push('nia'); // Codebase context retrieval
    if (taskType.includes('web', 'frontend', 'ui')) {
      selectedTools.push('playwright'); // Web automation
      selectedTools.push('browser-tools'); // Browser debugging
    }
  }
  
  // Research & Information Gathering
  if (taskType.includes('research', 'search', 'information', 'analyze')) {
    selectedTools.push('tavily'); // AI-powered search
    selectedTools.push('context7'); // External context
  }
  
  // Financial & Trading Analysis
  if (taskType.includes('stock', 'crypto', 'trading', 'financial', 'market')) {
    selectedTools.push('trader'); // Financial analysis
  }
  
  // Complex Multi-AI Tasks
  if (taskType.includes('complex', 'multi-step', 'coordination')) {
    selectedTools.push('zen'); // Multi-AI orchestration
  }
  
  return selectedTools;
}
```

### Phase 2: Execution Order Algorithm
```javascript
function determineExecutionOrder(selectedTools, task) {
  const phases = {
    research: ['tavily', 'context7'],           // Information gathering first
    analysis: ['serena', 'nia', 'trader'],      // Code/financial analysis
    implementation: ['serena', 'nia', 'playwright'],   // Development work
    testing: ['playwright', 'browser-tools'],   // Testing and validation
    coordination: ['zen']                       // Multi-AI coordination
  };
  
  // Determine execution sequence based on task requirements
  let executionPlan = [];
  
  if (task.includes('research') || task.includes('information')) {
    executionPlan = phases.research.concat(phases.analysis);
  } else if (task.includes('implement') || task.includes('build')) {
    executionPlan = phases.analysis.concat(phases.implementation);
  } else if (task.includes('test') || task.includes('debug')) {
    executionPlan = phases.analysis.concat(phases.testing);
  }
  
  // Always end with coordination for complex tasks
  if (selectedTools.length > 2) {
    executionPlan.push('zen');
  }
  
  return executionPlan;
}
```

## Memory Integration Protocol

### Memory Storage Strategy
Always store results and plans in memory using this structure:

```javascript
// Planning Phase Memory
Memory.store("mcp_session/planning", {
  timestamp: new Date().toISOString(),
  task: "Original user request",
  selectedTools: ["tool1", "tool2", "tool3"],
  executionPlan: ["phase1", "phase2", "phase3"],
  reasoning: "Why these tools were selected",
  expectedOutcome: "What we expect to achieve"
});

// Tool Execution Memory
Memory.store("mcp_session/tool_results/[tool_name]", {
  timestamp: new Date().toISOString(),
  tool: "tool_name",
  input: "What was requested from the tool",
  output: "Tool response/results",
  status: "success/failed/partial",
  insights: "Key insights from tool usage",
  nextSteps: "Recommended follow-up actions"
});

// Final Results Memory
Memory.store("mcp_session/final_results", {
  timestamp: new Date().toISOString(),
  originalTask: "User's original request",
  toolsUsed: ["tool1", "tool2"],
  keyFindings: "Main insights and results",
  deliverables: "Concrete outputs produced",
  recommendations: "Future action recommendations",
  sessionSummary: "Complete session overview"
});
```

## Execution Workflow Protocol

### Step 1: Initialize Session
```javascript
TodoWrite([
  {
    id: "mcp_session_init",
    content: "Initialize MCP session and select appropriate tools",
    status: "in_progress",
    priority: "critical"
  },
  {
    id: "tool_selection",
    content: "Analyze task and select optimal MCP tools",
    status: "pending",
    priority: "high"
  },
  {
    id: "execution_planning",
    content: "Create detailed execution plan with tool sequence",
    status: "pending",
    priority: "high"
  }
]);
```

### Step 2: Tool Execution Pattern
```javascript
// For each selected tool, follow this pattern:
async function executeMCPTool(toolName, request) {
  // Update todo status
  TodoWrite([{
    id: `${toolName}_execution`,
    content: `Execute ${toolName} for: ${request}`,
    status: "in_progress",
    priority: "high"
  }]);
  
  // Store pre-execution plan
  Memory.store(`mcp_session/pre_execution/${toolName}`, {
    tool: toolName,
    request: request,
    expectedOutput: "What we expect to get",
    timestamp: new Date().toISOString()
  });
  
  // Execute tool (this would be the actual MCP tool call)
  const result = await callMCPTool(toolName, request);
  
  // Store results
  Memory.store(`mcp_session/results/${toolName}`, {
    tool: toolName,
    input: request,
    output: result,
    status: result.success ? "success" : "failed",
    timestamp: new Date().toISOString(),
    insights: extractInsights(result),
    nextSteps: determineNextSteps(result)
  });
  
  // Update todo completion
  TodoWrite([{
    id: `${toolName}_execution`,
    content: `Execute ${toolName} for: ${request}`,
    status: "completed",
    priority: "high"
  }]);
  
  return result;
}
```

### Step 3: Coordination & Synthesis
```javascript
// After all tools have executed
function synthesizeResults() {
  // Retrieve all tool results from memory
  const allResults = Memory.query("mcp_session/results/*");
  
  // Combine insights
  const combinedInsights = allResults.map(r => r.insights).join("\n");
  
  // Create final synthesis
  const synthesis = {
    toolsUsed: allResults.map(r => r.tool),
    keyFindings: combinedInsights,
    recommendations: generateRecommendations(allResults),
    completionStatus: "all_tools_executed"
  };
  
  // Store final results
  Memory.store("mcp_session/final_synthesis", synthesis);
  
  return synthesis;
}
```

## Best Practices for MCP Usage

### 1. Always Plan Before Executing
- Analyze the task thoroughly
- Select appropriate tools based on task requirements
- Create execution sequence in TodoWrite
- Store planning decisions in Memory

### 2. Use Memory for Coordination
- Store all tool inputs and outputs
- Track session progress
- Enable cross-tool information sharing
- Maintain audit trail of decisions

### 3. Handle Tool Dependencies
- Some tools work better in sequence (Tavily → Serena)
- Others can run in parallel (Browser-tools + Playwright)
- Always check tool-specific requirements

### 4. Error Handling & Fallbacks
- If a tool fails, document in Memory
- Have fallback strategies for critical tools
- Continue with available tools when possible

### 5. Results Synthesis
- Combine outputs from multiple tools
- Identify patterns and insights across tools
- Provide actionable recommendations
- Update Memory with final results

This comprehensive MCP integration ensures maximum efficiency and effectiveness when using multiple AI-powered tools together.
