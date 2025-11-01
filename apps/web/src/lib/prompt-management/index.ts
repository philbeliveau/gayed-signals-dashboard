/**
 * Prompt Management System - Section 5 Implementation
 * 
 * Features:
 * - Template system with variable substitution
 * - Prompt validation and preview functionality
 * - Pre-built templates for financial analysis, tutorials, interviews
 * - Template versioning and management
 * - Validation rules and safety checks
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial_analysis' | 'tutorial' | 'interview' | 'custom';
  version: string;
  template: string;
  variables: PromptVariable[];
  metadata: PromptMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'select';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: ValidationRule;
  options?: string[]; // For select type
}

export interface ValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean | string;
}

export interface PromptMetadata {
  author: string;
  tags: string[];
  estimatedTokens: number;
  complexity: 'low' | 'medium' | 'high';
  purpose: string;
  examples?: string[];
}

export interface PromptResult {
  success: boolean;
  prompt: string;
  variables: Record<string, any>;
  metadata: {
    templateId: string;
    generatedAt: Date;
    tokenCount: number;
    validationResults: ValidationResult[];
  };
  errors?: string[];
}

export interface ValidationResult {
  field: string;
  valid: boolean;
  message?: string;
}

/**
 * Main Prompt Management Class
 */
export class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private validators: Map<string, (value: any) => boolean | string> = new Map();

  constructor() {
    this.initializeBuiltInTemplates();
    this.initializeValidators();
  }

  /**
   * Initialize built-in prompt templates
   */
  private initializeBuiltInTemplates(): void {
    // Financial Analysis Templates
    this.registerTemplate({
      id: 'financial_market_analysis',
      name: 'Market Regime Analysis',
      description: 'Analyze market regime based on Gayed signals',
      category: 'financial_analysis',
      version: '1.0.0',
      template: `
Analyze the current market regime based on the following signals:

{{#each signals}}
- {{name}}: {{value}} (Confidence: {{confidence}}%)
{{/each}}

Market Data Context:
- Date Range: {{dateRange}}
- Market Conditions: {{marketConditions}}
- Economic Environment: {{economicEnvironment}}

Please provide:
1. Current market regime assessment (Risk-On/Risk-Off/Neutral)
2. Signal consensus analysis with confidence levels
3. Key risk factors and opportunities
4. Recommended portfolio positioning
5. Timeline for next regime change assessment

{{#if includeHistorical}}
Historical Context:
- Previous regime changes in last {{historicalPeriod}} months
- Performance comparison with similar market conditions
{{/if}}

Focus on: {{analysisType}}
Risk tolerance: {{riskTolerance}}
Investment horizon: {{investmentHorizon}}
      `.trim(),
      variables: [
        {
          name: 'signals',
          type: 'array',
          description: 'Array of market signals with values and confidence',
          required: true
        },
        {
          name: 'dateRange',
          type: 'string',
          description: 'Date range for analysis',
          required: true
        },
        {
          name: 'marketConditions',
          type: 'string',
          description: 'Current market conditions description',
          required: true
        },
        {
          name: 'economicEnvironment',
          type: 'string',
          description: 'Economic environment context',
          required: false,
          defaultValue: 'Standard economic conditions'
        },
        {
          name: 'analysisType',
          type: 'select',
          description: 'Type of analysis to focus on',
          required: true,
          options: ['Growth vs Value', 'Sector Rotation', 'Risk Management', 'Asset Allocation']
        },
        {
          name: 'riskTolerance',
          type: 'select',
          description: 'Risk tolerance level',
          required: true,
          options: ['Conservative', 'Moderate', 'Aggressive']
        },
        {
          name: 'investmentHorizon',
          type: 'select',
          description: 'Investment time horizon',
          required: true,
          options: ['Short-term (< 6 months)', 'Medium-term (6-24 months)', 'Long-term (> 2 years)']
        },
        {
          name: 'includeHistorical',
          type: 'boolean',
          description: 'Include historical context',
          required: false,
          defaultValue: false
        },
        {
          name: 'historicalPeriod',
          type: 'number',
          description: 'Historical period in months',
          required: false,
          defaultValue: 12,
          validation: { min: 1, max: 60 }
        }
      ],
      metadata: {
        author: 'Gayed Signals System',
        tags: ['financial', 'market-analysis', 'signals', 'regime'],
        estimatedTokens: 300,
        complexity: 'high',
        purpose: 'Generate comprehensive market regime analysis',
        examples: ['Risk-On market with high confidence', 'Mixed signals during transition']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Tutorial Template
    this.registerTemplate({
      id: 'signal_tutorial',
      name: 'Signal Education Tutorial',
      description: 'Educational content about Gayed market signals',
      category: 'tutorial',
      version: '1.0.0',
      template: `
# Understanding {{signalName}} - Market Signal Tutorial

## Overview
{{signalName}} is one of Michael Gayed's five key market regime signals that helps determine whether markets are in a Risk-On or Risk-Off environment.

## How It Works
{{signalDescription}}

## Key Components
{{#each components}}
- **{{name}}**: {{description}}
{{/each}}

## Interpretation Guidelines
- **Risk-On Signal**: {{riskOnDescription}}
- **Risk-Off Signal**: {{riskOffDescription}}
- **Neutral/Mixed**: {{neutralDescription}}

## Practical Application
{{practicalApplication}}

{{#if includeExamples}}
## Historical Examples
{{#each examples}}
### {{date}}
- Market Condition: {{condition}}
- Signal Reading: {{reading}}
- Outcome: {{outcome}}
{{/each}}
{{/if}}

## Common Mistakes to Avoid
{{#each mistakes}}
- {{description}}
{{/each}}

## Integration with Other Signals
{{integrationGuidance}}

Difficulty Level: {{difficultyLevel}}
Estimated Reading Time: {{readingTime}} minutes
      `.trim(),
      variables: [
        {
          name: 'signalName',
          type: 'select',
          description: 'Which signal to explain',
          required: true,
          options: ['Utilities/SPY Ratio', 'Lumber/Gold Ratio', 'Treasury Curve', 'VIX Defensive', 'S&P 500 Moving Average']
        },
        {
          name: 'signalDescription',
          type: 'string',
          description: 'Detailed description of how the signal works',
          required: true
        },
        {
          name: 'components',
          type: 'array',
          description: 'Key components of the signal',
          required: true
        },
        {
          name: 'riskOnDescription',
          type: 'string',
          description: 'What Risk-On means for this signal',
          required: true
        },
        {
          name: 'riskOffDescription',
          type: 'string',
          description: 'What Risk-Off means for this signal',
          required: true
        },
        {
          name: 'neutralDescription',
          type: 'string',
          description: 'What neutral/mixed signals mean',
          required: true
        },
        {
          name: 'practicalApplication',
          type: 'string',
          description: 'How to apply this signal in practice',
          required: true
        },
        {
          name: 'integrationGuidance',
          type: 'string',
          description: 'How this signal works with others',
          required: true
        },
        {
          name: 'difficultyLevel',
          type: 'select',
          description: 'Tutorial difficulty level',
          required: true,
          options: ['Beginner', 'Intermediate', 'Advanced']
        },
        {
          name: 'readingTime',
          type: 'number',
          description: 'Estimated reading time in minutes',
          required: true,
          validation: { min: 1, max: 60 }
        },
        {
          name: 'includeExamples',
          type: 'boolean',
          description: 'Include historical examples',
          required: false,
          defaultValue: true
        },
        {
          name: 'examples',
          type: 'array',
          description: 'Historical examples with dates and outcomes',
          required: false
        },
        {
          name: 'mistakes',
          type: 'array',
          description: 'Common mistakes to avoid',
          required: true
        }
      ],
      metadata: {
        author: 'Gayed Signals System',
        tags: ['tutorial', 'education', 'signals', 'learning'],
        estimatedTokens: 250,
        complexity: 'medium',
        purpose: 'Educational content about market signals',
        examples: ['Beginner guide to VIX signals', 'Advanced treasury curve analysis']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Interview Template
    this.registerTemplate({
      id: 'expert_interview',
      name: 'Expert Interview Questions',
      description: 'Generate interview questions for market experts',
      category: 'interview',
      version: '1.0.0',
      template: `
# Expert Interview: {{expertName}}
## Topic: {{interviewTopic}}

### Background Questions
{{#each backgroundQuestions}}
{{@index}}. {{question}}
   Follow-up: {{followUp}}
{{/each}}

### Technical Analysis Questions
{{#each technicalQuestions}}
{{@index}}. {{question}}
   Context: {{context}}
{{/each}}

### Market Outlook Questions
{{#each outlookQuestions}}
{{@index}}. {{question}}
   Time horizon: {{timeHorizon}}
{{/each}}

### Scenario-Based Questions
"Given the current market signals showing {{currentSignals}}, how would you position a portfolio for {{investmentObjective}}?"

### Rapid-Fire Questions ({{rapidFireCount}} questions)
{{#each rapidFireQuestions}}
- {{question}}
{{/each}}

### Closing Questions
1. What is the most important thing investors should watch in the next {{timeFrame}}?
2. What common mistake do you see investors making in {{marketCondition}} markets?
3. How has your approach to {{expertise}} evolved over the past {{experienceYears}} years?

**Interview Duration**: {{duration}} minutes
**Expertise Level**: {{expertiseLevel}}
**Recording Notes**: {{recordingNotes}}
      `.trim(),
      variables: [
        {
          name: 'expertName',
          type: 'string',
          description: 'Name of the expert being interviewed',
          required: true
        },
        {
          name: 'interviewTopic',
          type: 'string',
          description: 'Main topic of the interview',
          required: true
        },
        {
          name: 'backgroundQuestions',
          type: 'array',
          description: 'Background questions about the expert',
          required: true
        },
        {
          name: 'technicalQuestions',
          type: 'array',
          description: 'Technical analysis questions',
          required: true
        },
        {
          name: 'outlookQuestions',
          type: 'array',
          description: 'Market outlook questions',
          required: true
        },
        {
          name: 'currentSignals',
          type: 'string',
          description: 'Current market signal status',
          required: true
        },
        {
          name: 'investmentObjective',
          type: 'select',
          description: 'Investment objective for scenario',
          required: true,
          options: ['Capital Preservation', 'Growth', 'Income', 'Balanced']
        },
        {
          name: 'rapidFireCount',
          type: 'number',
          description: 'Number of rapid-fire questions',
          required: false,
          defaultValue: 5,
          validation: { min: 3, max: 10 }
        },
        {
          name: 'rapidFireQuestions',
          type: 'array',
          description: 'Quick questions for rapid-fire section',
          required: true
        },
        {
          name: 'timeFrame',
          type: 'select',
          description: 'Time frame for outlook',
          required: true,
          options: ['3 months', '6 months', '12 months', '2 years']
        },
        {
          name: 'marketCondition',
          type: 'select',
          description: 'Current market condition',
          required: true,
          options: ['bull', 'bear', 'sideways', 'volatile']
        },
        {
          name: 'expertise',
          type: 'string',
          description: 'Expert\'s area of expertise',
          required: true
        },
        {
          name: 'experienceYears',
          type: 'number',
          description: 'Years of experience',
          required: true,
          validation: { min: 1, max: 50 }
        },
        {
          name: 'duration',
          type: 'number',
          description: 'Interview duration in minutes',
          required: true,
          validation: { min: 15, max: 120 }
        },
        {
          name: 'expertiseLevel',
          type: 'select',
          description: 'Level of expertise',
          required: true,
          options: ['Professional', 'Expert', 'Thought Leader', 'Academic']
        },
        {
          name: 'recordingNotes',
          type: 'string',
          description: 'Notes about recording setup',
          required: false,
          defaultValue: 'Standard interview recording'
        }
      ],
      metadata: {
        author: 'Gayed Signals System',
        tags: ['interview', 'expert', 'questions', 'research'],
        estimatedTokens: 200,
        complexity: 'medium',
        purpose: 'Generate structured interview questions for market experts',
        examples: ['Portfolio manager interview', 'Economic analyst discussion']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Initialize built-in validators
   */
  private initializeValidators(): void {
    this.validators.set('email', (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value) || 'Invalid email format';
    });

    this.validators.set('positiveNumber', (value: number) => {
      return value > 0 || 'Must be a positive number';
    });

    this.validators.set('dateRange', (value: string) => {
      // Validate date range format YYYY-MM-DD to YYYY-MM-DD
      const dateRangeRegex = /^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/;
      return dateRangeRegex.test(value) || 'Invalid date range format (YYYY-MM-DD to YYYY-MM-DD)';
    });
  }

  /**
   * Register a new prompt template
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get all available templates
   */
  getTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return this.getTemplates().filter(template => template.category === category);
  }

  /**
   * Get a specific template
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Generate a prompt from template
   */
  generatePrompt(templateId: string, variables: Record<string, any>): PromptResult {
    const template = this.getTemplate(templateId);
    if (!template) {
      return {
        success: false,
        prompt: '',
        variables: {},
        metadata: {
          templateId,
          generatedAt: new Date(),
          tokenCount: 0,
          validationResults: []
        },
        errors: [`Template '${templateId}' not found`]
      };
    }

    // Validate variables
    const validationResults = this.validateVariables(template, variables);
    const hasErrors = validationResults.some(result => !result.valid);

    if (hasErrors) {
      return {
        success: false,
        prompt: '',
        variables,
        metadata: {
          templateId,
          generatedAt: new Date(),
          tokenCount: 0,
          validationResults
        },
        errors: validationResults
          .filter(result => !result.valid)
          .map(result => result.message || `Invalid value for ${result.field}`)
      };
    }

    // Fill in default values for optional variables
    const filledVariables = this.fillDefaultValues(template, variables);

    // Generate prompt using Handlebars-like template engine
    const prompt = this.renderTemplate(template.template, filledVariables);
    
    // Estimate token count
    const tokenCount = this.estimateTokenCount(prompt);

    return {
      success: true,
      prompt,
      variables: filledVariables,
      metadata: {
        templateId,
        generatedAt: new Date(),
        tokenCount,
        validationResults
      }
    };
  }

  /**
   * Preview a prompt without full validation
   */
  previewPrompt(templateId: string, variables: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      return `Error: Template '${templateId}' not found`;
    }

    const filledVariables = this.fillDefaultValues(template, variables);
    return this.renderTemplate(template.template, filledVariables);
  }

  /**
   * Validate variables against template requirements
   */
  private validateVariables(template: PromptTemplate, variables: Record<string, any>): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const variable of template.variables) {
      const value = variables[variable.name];
      const result: ValidationResult = {
        field: variable.name,
        valid: true
      };

      // Check required fields
      if (variable.required && (value === undefined || value === null || value === '')) {
        result.valid = false;
        result.message = `${variable.name} is required`;
        results.push(result);
        continue;
      }

      // Skip validation for optional empty fields
      if (!variable.required && (value === undefined || value === null || value === '')) {
        results.push(result);
        continue;
      }

      // Type validation
      if (!this.validateType(value, variable.type)) {
        result.valid = false;
        result.message = `${variable.name} must be of type ${variable.type}`;
        results.push(result);
        continue;
      }

      // Custom validation rules
      if (variable.validation) {
        const customResult = this.applyValidationRules(value, variable.validation);
        if (customResult !== true) {
          result.valid = false;
          result.message = typeof customResult === 'string' ? customResult : `Invalid value for ${variable.name}`;
        }
      }

      results.push(result);
    }

    return results;
  }

  /**
   * Validate variable type
   */
  private validateType(value: any, type: PromptVariable['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
      case 'array':
        return Array.isArray(value);
      case 'select':
        return true; // Select validation handled separately
      default:
        return true;
    }
  }

  /**
   * Apply validation rules to a value
   */
  private applyValidationRules(value: any, rules: ValidationRule): boolean | string {
    if (rules.min !== undefined && value < rules.min) {
      return `Value must be at least ${rules.min}`;
    }

    if (rules.max !== undefined && value > rules.max) {
      return `Value must be at most ${rules.max}`;
    }

    if (rules.pattern && typeof value === 'string') {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return `Value does not match required pattern`;
      }
    }

    if (rules.customValidator) {
      return rules.customValidator(value);
    }

    return true;
  }

  /**
   * Fill in default values for optional variables
   */
  private fillDefaultValues(template: PromptTemplate, variables: Record<string, any>): Record<string, any> {
    const filled = { ...variables };

    for (const variable of template.variables) {
      if (filled[variable.name] === undefined && variable.defaultValue !== undefined) {
        filled[variable.name] = variable.defaultValue;
      }
    }

    return filled;
  }

  /**
   * Simple template rendering (Handlebars-like)
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Handle simple variable substitution {{variableName}}
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      return variables[variableName] !== undefined ? String(variables[variableName]) : match;
    });

    // Handle conditional blocks {{#if condition}}...{{/if}}
    rendered = rendered.replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/g, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    // Handle array iteration {{#each array}}...{{/each}}
    rendered = rendered.replace(/\{\{#each\s+(\w+)\}\}(.*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map((item, index) => {
        let itemContent = content;
        
        // Replace {{@index}} with current index
        itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index + 1));
        
        // Replace item properties
        if (typeof item === 'object' && item !== null) {
          Object.keys(item).forEach(key => {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            itemContent = itemContent.replace(regex, String(item[key]));
          });
        } else {
          // For primitive arrays, replace {{this}} with the item value
          itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
        }
        
        return itemContent;
      }).join('');
    });

    return rendered.trim();
  }

  /**
   * Estimate token count for a prompt
   */
  private estimateTokenCount(text: string): number {
    // Simple estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Search templates by text
   */
  searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getTemplates().filter(template => 
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Export template to JSON
   */
  exportTemplate(templateId: string): string | null {
    const template = this.getTemplate(templateId);
    if (!template) return null;
    
    return JSON.stringify(template, null, 2);
  }

  /**
   * Import template from JSON
   */
  importTemplate(jsonString: string): boolean {
    try {
      const template = JSON.parse(jsonString) as PromptTemplate;
      
      // Basic validation
      if (!template.id || !template.name || !template.template) {
        return false;
      }
      
      this.registerTemplate(template);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const promptManager = new PromptManager();