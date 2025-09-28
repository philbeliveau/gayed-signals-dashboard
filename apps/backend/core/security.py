"""
Security utilities for authentication and authorization.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer
from .config import settings

security = HTTPBearer()

async def get_current_user_optional(token: Optional[str] = Depends(security)) -> Optional[str]:
    """
    Optional authentication - returns user ID if authenticated, None otherwise.
    This is a placeholder implementation for the migration.
    TODO: Implement proper Clerk authentication integration.
    """
    if not token:
        return None

    # For now, return a placeholder user ID
    # This will be replaced with proper Clerk integration
    return "migration-placeholder-user"

async def get_current_user(token: str = Depends(security)) -> str:
    """
    Required authentication - returns user ID or raises exception.
    """
    user_id = await get_current_user_optional(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id