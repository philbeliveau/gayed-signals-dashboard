import { NextRequest, NextResponse } from 'next/server';
import { promptManager } from '../../../lib/prompt-management';

/**
 * GET /api/prompts - Get all prompt templates or search
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const templateId = searchParams.get('id');

    // Get specific template
    if (templateId) {
      const template = promptManager.getTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ template });
    }

    // Search templates
    if (search) {
      const templates = promptManager.searchTemplates(search);
      return NextResponse.json({ 
        templates,
        count: templates.length,
        query: search
      });
    }

    // Get templates by category
    if (category) {
      const templates = promptManager.getTemplatesByCategory(
        category as 'financial_analysis' | 'tutorial' | 'interview' | 'custom'
      );
      return NextResponse.json({ 
        templates,
        count: templates.length,
        category
      });
    }

    // Get all templates
    const templates = promptManager.getTemplates();
    return NextResponse.json({ 
      templates,
      count: templates.length,
      categories: {
        financial_analysis: templates.filter(t => t.category === 'financial_analysis').length,
        tutorial: templates.filter(t => t.category === 'tutorial').length,
        interview: templates.filter(t => t.category === 'interview').length,
        custom: templates.filter(t => t.category === 'custom').length
      }
    });

  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/prompts - Generate prompt from template or create new template
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, templateId, variables, template } = body;

    if (action === 'generate') {
      // Generate prompt from template
      if (!templateId || !variables) {
        return NextResponse.json(
          { error: 'Template ID and variables are required for generation' },
          { status: 400 }
        );
      }

      const result = promptManager.generatePrompt(templateId, variables);
      
      return NextResponse.json({
        success: result.success,
        prompt: result.prompt,
        variables: result.variables,
        metadata: result.metadata,
        errors: result.errors
      });

    } else if (action === 'preview') {
      // Preview prompt without full validation
      if (!templateId || !variables) {
        return NextResponse.json(
          { error: 'Template ID and variables are required for preview' },
          { status: 400 }
        );
      }

      const preview = promptManager.previewPrompt(templateId, variables);
      
      return NextResponse.json({
        success: true,
        preview,
        templateId,
        variables
      });

    } else if (action === 'create') {
      // Create new template
      if (!template) {
        return NextResponse.json(
          { error: 'Template data is required for creation' },
          { status: 400 }
        );
      }

      // Validate required fields
      if (!template.id || !template.name || !template.template) {
        return NextResponse.json(
          { error: 'Template must have id, name, and template fields' },
          { status: 400 }
        );
      }

      // Add metadata if missing
      const newTemplate = {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          author: 'User',
          tags: [],
          estimatedTokens: 0,
          complexity: 'medium',
          purpose: '',
          ...template.metadata
        }
      };

      promptManager.registerTemplate(newTemplate);
      
      return NextResponse.json({
        success: true,
        message: 'Template created successfully',
        templateId: template.id
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "generate", "preview", or "create"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error processing prompt request:', error);
    return NextResponse.json(
      { error: 'Failed to process prompt request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/prompts - Update existing template
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, template } = body;

    if (!templateId || !template) {
      return NextResponse.json(
        { error: 'Template ID and template data are required' },
        { status: 400 }
      );
    }

    const existingTemplate = promptManager.getTemplate(templateId);
    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Update template with new data
    const updatedTemplate = {
      ...existingTemplate,
      ...template,
      id: templateId, // Preserve original ID
      updatedAt: new Date()
    };

    promptManager.registerTemplate(updatedTemplate);

    return NextResponse.json({
      success: true,
      message: 'Template updated successfully',
      templateId
    });

  } catch (error) {
    console.error('Error updating prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/prompts - Delete template
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const template = promptManager.getTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Note: In a real implementation, you'd want to remove from persistent storage
    // For now, we'll just return success since templates are in memory
    
    return NextResponse.json({
      success: true,
      message: 'Template deletion requested',
      note: 'Templates are currently stored in memory and will be reset on restart'
    });

  } catch (error) {
    console.error('Error deleting prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt template' },
      { status: 500 }
    );
  }
}