"""
Prompt template management API routes for AI summarization.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging
from datetime import datetime
import re

from core.database import get_db
from core.security import get_current_user_optional
from models.database import User, PromptTemplate
from services.cache_service import CacheService
from pydantic import BaseModel, Field, field_validator, ConfigDict

logger = logging.getLogger(__name__)
router = APIRouter()
cache_service = CacheService()


# Pydantic models
class PromptTemplateCreate(BaseModel):
    """Request model for creating a prompt template."""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    prompt_text: str = Field(..., min_length=10, max_length=5000, description="The prompt template text")
    category: str = Field(default="custom", pattern="^(financial|technical|meeting|educational|custom)$")
    is_public: bool = Field(default=False, description="Whether this template can be used by other users")
    variables: List[str] = Field(default=[], description="List of variable names used in the template")

    @field_validator('variables')
    @classmethod
    def validate_variables(cls, v, info):
        """Validate that all variables in the list are actually used in the prompt."""
        if info.data and 'prompt_text' in info.data:
            prompt_text = info.data['prompt_text']
            # Find all variables in the prompt text (format: {variable_name})
            used_variables = re.findall(r'\{(\w+)\}', prompt_text)
            
            # Check if all declared variables are used
            for var in v:
                if var not in used_variables:
                    raise ValueError(f"Variable '{var}' declared but not used in prompt text")
                    
            # Auto-detect undeclared variables
            for var in used_variables:
                if var not in v:
                    v.append(var)
        
        return list(set(v))  # Remove duplicates


class PromptTemplateUpdate(BaseModel):
    """Request model for updating a prompt template."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    prompt_text: Optional[str] = Field(None, min_length=10, max_length=5000)
    category: Optional[str] = Field(None, pattern="^(financial|technical|meeting|educational|custom)$")
    is_public: Optional[bool] = None


class PromptTemplateResponse(BaseModel):
    """Response model for prompt template data."""
    id: UUID
    name: str
    description: Optional[str]
    prompt_text: str
    category: str
    is_public: bool
    variables: List[str]
    usage_count: int
    created_at: datetime
    updated_at: datetime
    is_owner: bool = True

    model_config = ConfigDict(from_attributes=True)


class PromptValidationRequest(BaseModel):
    """Request model for prompt validation."""
    prompt_text: str = Field(..., min_length=1, max_length=5000)


class PromptValidationResponse(BaseModel):
    """Response model for prompt validation."""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []
    variables_detected: List[str] = []
    estimated_tokens: Optional[int] = None


# Predefined prompt templates
PREDEFINED_TEMPLATES = [
    {
        "name": "Financial Analysis Summary",
        "description": "Analyze financial content with focus on key metrics, trends, and investment insights",
        "prompt_text": """Analyze this financial content and provide a comprehensive summary focusing on:

1. **Key Financial Metrics**: Extract and highlight any specific numbers, percentages, or financial data mentioned
2. **Market Trends**: Identify trends, patterns, or directional movements discussed
3. **Investment Insights**: Summarize any investment recommendations, strategies, or market outlooks
4. **Risk Factors**: Note any risks, warnings, or cautionary statements
5. **Action Items**: List any specific recommendations or next steps mentioned

Content to analyze:
{transcript_text}

Please format the response with clear headings and bullet points for easy reading.""",
        "category": "financial",
        "variables": ["transcript_text"]
    },
    {
        "name": "Technical Concepts Explanation",
        "description": "Break down technical content into digestible explanations",
        "prompt_text": """Please analyze this technical content and create a clear, structured summary:

1. **Main Concepts**: List and briefly explain the key technical concepts discussed
2. **Step-by-Step Process**: If any procedures or processes are explained, break them down into clear steps
3. **Tools & Technologies**: Identify any tools, software, or technologies mentioned
4. **Best Practices**: Extract any recommended practices or methodologies
5. **Common Pitfalls**: Note any warnings about mistakes or issues to avoid
6. **Further Learning**: Suggest areas for additional study based on the content

Technical content:
{transcript_text}

Make the summary accessible to someone with basic technical knowledge.""",
        "category": "technical",
        "variables": ["transcript_text"]
    },
    {
        "name": "Meeting Action Items",
        "description": "Extract actionable items and decisions from meeting content",
        "prompt_text": """Review this meeting content and extract key actionable information:

1. **Decisions Made**: List all decisions that were finalized during the discussion
2. **Action Items**: Extract specific tasks with responsible parties (if mentioned)
3. **Deadlines**: Note any timelines or deadlines mentioned
4. **Follow-up Required**: Identify items that need further discussion or research
5. **Key Agreements**: Summarize any agreements or consensus reached
6. **Outstanding Issues**: List any unresolved matters or concerns raised

Meeting content:
{transcript_text}

Format as a clear action-oriented summary suitable for distribution to participants.""",
        "category": "meeting",
        "variables": ["transcript_text"]
    },
    {
        "name": "Educational Content Summary",
        "description": "Summarize educational content with learning objectives and key takeaways",
        "prompt_text": """Analyze this educational content and create a comprehensive learning summary:

1. **Learning Objectives**: What are the main things students/viewers should learn?
2. **Key Concepts**: List and define the most important ideas presented
3. **Examples & Case Studies**: Summarize any examples or real-world applications discussed
4. **Practical Applications**: How can this knowledge be applied in practice?
5. **Assessment Questions**: Suggest 3-5 questions that could test understanding of the material
6. **Additional Resources**: Recommend areas for further study or exploration

Educational content:
{transcript_text}

Structure the summary to be useful for both review and teaching purposes.""",
        "category": "educational",
        "variables": ["transcript_text"]
    }
]


@router.get("/templates", response_model=List[PromptTemplateResponse])
async def list_prompt_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    include_public: bool = Query(True, description="Include public templates"),
    search: Optional[str] = Query(None, description="Search in name and description"),
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    List available prompt templates for the current user.
    
    Args:
        category: Optional category filter
        include_public: Whether to include public templates
        search: Optional search query
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of available prompt templates
    """
    try:
        # Build query for user's own templates
        user_query = select(PromptTemplate).where(PromptTemplate.user_id == current_user.id)
        
        # Build query for public templates if requested
        queries = [user_query]
        if include_public:
            public_query = select(PromptTemplate).where(
                and_(
                    PromptTemplate.is_public == True,
                    PromptTemplate.user_id != current_user.id
                )
            )
            queries.append(public_query)
        
        all_templates = []
        for query in queries:
            # Apply filters
            if category:
                query = query.where(PromptTemplate.category == category)
            
            if search:
                search_term = f"%{search}%"
                query = query.where(
                    or_(
                        PromptTemplate.name.ilike(search_term),
                        PromptTemplate.description.ilike(search_term)
                    )
                )
            
            # Execute query
            result = await db.execute(query.order_by(PromptTemplate.usage_count.desc(), PromptTemplate.created_at.desc()))
            templates = result.scalars().all()
            
            for template in templates:
                is_owner = template.user_id == current_user.id
                template_response = PromptTemplateResponse(
                    id=template.id,
                    name=template.name,
                    description=template.description,
                    prompt_text=template.prompt_text,
                    category=template.category,
                    is_public=template.is_public,
                    variables=template.variables,
                    usage_count=template.usage_count,
                    created_at=template.created_at,
                    updated_at=template.updated_at,
                    is_owner=is_owner
                )
                all_templates.append(template_response)
        
        return all_templates
        
    except Exception as e:
        logger.error(f"Error listing prompt templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve prompt templates"
        )


@router.post("/templates", response_model=PromptTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt_template(
    template_data: PromptTemplateCreate,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new prompt template.
    
    Args:
        template_data: Template creation data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Created template information
    """
    try:
        # Check if template name already exists for this user
        existing_template = await db.execute(
            select(PromptTemplate).where(
                and_(
                    PromptTemplate.user_id == current_user.id,
                    PromptTemplate.name == template_data.name
                )
            )
        )
        
        if existing_template.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template with this name already exists"
            )
        
        # Create new template
        template = PromptTemplate(
            user_id=current_user.id,
            name=template_data.name,
            description=template_data.description,
            prompt_text=template_data.prompt_text,
            category=template_data.category,
            is_public=template_data.is_public,
            variables=template_data.variables,
            usage_count=0
        )
        
        db.add(template)
        await db.commit()
        await db.refresh(template)
        
        logger.info(f"Created prompt template {template.id} '{template.name}' for user {current_user.id}")
        
        return PromptTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            prompt_text=template.prompt_text,
            category=template.category,
            is_public=template.is_public,
            variables=template.variables,
            usage_count=template.usage_count,
            created_at=template.created_at,
            updated_at=template.updated_at,
            is_owner=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating prompt template: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create prompt template"
        )


@router.get("/templates/{template_id}", response_model=PromptTemplateResponse)
async def get_prompt_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific prompt template.
    
    Args:
        template_id: Template ID
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Template information
    """
    try:
        # Get template with access check (user owns it or it's public)
        template_result = await db.execute(
            select(PromptTemplate).where(
                and_(
                    PromptTemplate.id == template_id,
                    or_(
                        PromptTemplate.user_id == current_user.id,
                        PromptTemplate.is_public == True
                    )
                )
            )
        )
        template = template_result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        is_owner = template.user_id == current_user.id
        
        return PromptTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            prompt_text=template.prompt_text,
            category=template.category,
            is_public=template.is_public,
            variables=template.variables,
            usage_count=template.usage_count,
            created_at=template.created_at,
            updated_at=template.updated_at,
            is_owner=is_owner
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prompt template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve prompt template"
        )


@router.put("/templates/{template_id}", response_model=PromptTemplateResponse)
async def update_prompt_template(
    template_id: UUID,
    template_update: PromptTemplateUpdate,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing prompt template (only owner can update).
    
    Args:
        template_id: Template ID to update
        template_update: Template update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Updated template information
    """
    try:
        # Get template with ownership check
        template_result = await db.execute(
            select(PromptTemplate).where(
                and_(
                    PromptTemplate.id == template_id,
                    PromptTemplate.user_id == current_user.id
                )
            )
        )
        template = template_result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found or you don't have permission to edit it"
            )
        
        # Check for name conflicts if name is being updated
        if template_update.name and template_update.name != template.name:
            existing_template = await db.execute(
                select(PromptTemplate).where(
                    and_(
                        PromptTemplate.user_id == current_user.id,
                        PromptTemplate.name == template_update.name,
                        PromptTemplate.id != template_id
                    )
                )
            )
            
            if existing_template.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Template with this name already exists"
                )
        
        # Update template fields
        if template_update.name is not None:
            template.name = template_update.name
        
        if template_update.description is not None:
            template.description = template_update.description
        
        if template_update.prompt_text is not None:
            template.prompt_text = template_update.prompt_text
            # Re-extract variables from updated prompt
            template.variables = re.findall(r'\{(\w+)\}', template_update.prompt_text)
        
        if template_update.category is not None:
            template.category = template_update.category
        
        if template_update.is_public is not None:
            template.is_public = template_update.is_public
        
        template.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(template)
        
        logger.info(f"Updated prompt template {template_id} for user {current_user.id}")
        
        return PromptTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            prompt_text=template.prompt_text,
            category=template.category,
            is_public=template.is_public,
            variables=template.variables,
            usage_count=template.usage_count,
            created_at=template.created_at,
            updated_at=template.updated_at,
            is_owner=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating prompt template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prompt template"
        )


@router.delete("/templates/{template_id}")
async def delete_prompt_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a prompt template (only owner can delete).
    
    Args:
        template_id: Template ID to delete
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
    """
    try:
        # Get template with ownership check
        template_result = await db.execute(
            select(PromptTemplate).where(
                and_(
                    PromptTemplate.id == template_id,
                    PromptTemplate.user_id == current_user.id
                )
            )
        )
        template = template_result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found or you don't have permission to delete it"
            )
        
        # Delete template
        await db.delete(template)
        await db.commit()
        
        logger.info(f"Deleted prompt template {template_id} for user {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Template deleted successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting prompt template {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prompt template"
        )


@router.post("/validate", response_model=PromptValidationResponse)
async def validate_prompt(
    validation_request: PromptValidationRequest,
    current_user: User = Depends(get_current_user_optional)
):
    """
    Validate a prompt template and provide suggestions.
    
    Args:
        validation_request: Prompt validation request
        current_user: Current authenticated user
        
    Returns:
        Validation results with suggestions
    """
    try:
        prompt_text = validation_request.prompt_text
        errors = []
        warnings = []
        suggestions = []
        
        # Check for variables
        variables = re.findall(r'\{(\w+)\}', prompt_text)
        
        # Basic validation
        if len(prompt_text.strip()) < 10:
            errors.append("Prompt is too short. Minimum 10 characters required.")
        
        if len(prompt_text) > 5000:
            errors.append("Prompt is too long. Maximum 5000 characters allowed.")
        
        # Check for common issues
        if not any(word in prompt_text.lower() for word in ['analyze', 'summarize', 'extract', 'identify', 'list']):
            warnings.append("Consider adding clear action words like 'analyze', 'summarize', or 'extract' to make the prompt more directive.")
        
        if '{transcript_text}' not in variables and 'transcript' not in prompt_text.lower():
            warnings.append("Prompt doesn't seem to reference the transcript content. Consider adding {transcript_text} variable.")
        
        # Suggestions for improvement
        if len(variables) == 0:
            suggestions.append("Consider using variables like {transcript_text} to make the template reusable.")
        
        if not re.search(r'\d+\.', prompt_text):
            suggestions.append("Consider structuring the prompt with numbered points for clearer organization.")
        
        if 'please' not in prompt_text.lower():
            suggestions.append("Adding polite language like 'please' can improve AI response quality.")
        
        # Estimate token count (rough approximation: 1 token ≈ 4 characters)
        estimated_tokens = len(prompt_text) // 4
        
        is_valid = len(errors) == 0
        
        return PromptValidationResponse(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions,
            variables_detected=variables,
            estimated_tokens=estimated_tokens
        )
        
    except Exception as e:
        logger.error(f"Error validating prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to validate prompt"
        )


@router.post("/templates/{template_id}/use")
async def use_prompt_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a template as used (increment usage count).
    
    Args:
        template_id: Template ID to mark as used
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response
    """
    try:
        # Get template with access check
        template_result = await db.execute(
            select(PromptTemplate).where(
                and_(
                    PromptTemplate.id == template_id,
                    or_(
                        PromptTemplate.user_id == current_user.id,
                        PromptTemplate.is_public == True
                    )
                )
            )
        )
        template = template_result.scalar_one_or_none()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        # Increment usage count
        template.usage_count += 1
        await db.commit()
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"message": "Template usage recorded"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording template usage {template_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record template usage"
        )


@router.get("/categories")
async def get_prompt_categories():
    """
    Get available prompt template categories.
    
    Returns:
        List of available categories
    """
    categories = [
        {"id": "financial", "name": "Financial Analysis", "description": "Templates for financial content analysis"},
        {"id": "technical", "name": "Technical Content", "description": "Templates for technical documentation and tutorials"},
        {"id": "meeting", "name": "Meeting Notes", "description": "Templates for meeting summaries and action items"},
        {"id": "educational", "name": "Educational", "description": "Templates for learning content and courses"},
        {"id": "custom", "name": "Custom", "description": "User-defined custom templates"}
    ]
    
    return categories


@router.post("/templates/initialize-defaults")
async def initialize_default_templates(
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Initialize default prompt templates for a user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Success response with count of templates created
    """
    try:
        created_count = 0
        
        for template_data in PREDEFINED_TEMPLATES:
            # Check if template already exists
            existing = await db.execute(
                select(PromptTemplate).where(
                    and_(
                        PromptTemplate.user_id == current_user.id,
                        PromptTemplate.name == template_data["name"]
                    )
                )
            )
            
            if not existing.scalar_one_or_none():
                template = PromptTemplate(
                    user_id=current_user.id,
                    name=template_data["name"],
                    description=template_data["description"],
                    prompt_text=template_data["prompt_text"],
                    category=template_data["category"],
                    is_public=False,
                    variables=template_data["variables"],
                    usage_count=0
                )
                
                db.add(template)
                created_count += 1
        
        await db.commit()
        
        logger.info(f"Initialized {created_count} default templates for user {current_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "message": f"Initialized {created_count} default templates",
                "templates_created": created_count
            }
        )
        
    except Exception as e:
        logger.error(f"Error initializing default templates: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize default templates"
        )