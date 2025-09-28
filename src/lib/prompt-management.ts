export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  category: 'financial_analysis' | 'tutorial' | 'interview' | 'custom';
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    author: string;
    tags: string[];
    estimatedTokens: number;
    complexity: string;
    purpose: string;
  };
}

export interface PromptGenerationResult {
  success: boolean;
  prompt?: string;
  variables?: Record<string, any>;
  metadata?: any;
  errors?: string[];
}

class PromptManager {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    // Initialize with some default templates
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplate: PromptTemplate = {
      id: 'default-financial',
      name: 'Financial Analysis',
      template: 'Analyze the following financial data: {{data}}',
      category: 'financial_analysis',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        author: 'System',
        tags: ['financial', 'analysis'],
        estimatedTokens: 100,
        complexity: 'medium',
        purpose: 'Financial data analysis'
      }
    };

    this.templates.set(defaultTemplate.id, defaultTemplate);
  }

  getTemplate(id: string): PromptTemplate | null {
    return this.templates.get(id) || null;
  }

  getTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return this.getTemplates().filter(template => template.category === category);
  }

  searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getTemplates().filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.template.toLowerCase().includes(lowerQuery) ||
      template.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  generatePrompt(templateId: string, variables: Record<string, any>): PromptGenerationResult {
    const template = this.getTemplate(templateId);

    if (!template) {
      return {
        success: false,
        errors: ['Template not found']
      };
    }

    try {
      let prompt = template.template;

      // Simple variable substitution
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
      });

      return {
        success: true,
        prompt,
        variables,
        metadata: template.metadata
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to generate prompt: ${error}`]
      };
    }
  }

  previewPrompt(templateId: string, variables: Record<string, any>): string {
    const result = this.generatePrompt(templateId, variables);
    if (result.prompt) {
      return result.prompt;
    }

    const template = this.getTemplate(templateId);
    return template?.template || '';
  }
}

export const promptManager = new PromptManager();