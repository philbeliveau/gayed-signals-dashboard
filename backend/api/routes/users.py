"""
User management routes for registration and profile updates.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, EmailStr

from core.database import get_db
from core.security import (
    get_password_hash,
    get_current_user,
    get_user_by_email,
    UserCreate,
    UserResponse
)
from models.database import User

router = APIRouter()


class UserUpdate(BaseModel):
    """User profile update request model."""
    username: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None


class UserRegistrationResponse(BaseModel):
    """User registration response model."""
    id: str
    email: str
    username: str
    full_name: Optional[str]
    message: str


@router.post("/", response_model=UserRegistrationResponse)
async def register_user(
    user_create: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.
    
    Args:
        user_create: User creation data
        db: Database session
        
    Returns:
        UserRegistrationResponse: Registration confirmation with user details
        
    Raises:
        HTTPException: If email or username already exists
    """
    # Check if email already exists
    existing_user = await get_user_by_email(db, user_create.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    result = await db.execute(
        select(User).where(User.username == user_create.username)
    )
    existing_username = result.scalar_one_or_none()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    try:
        user_id = uuid.uuid4()
        hashed_password = get_password_hash(user_create.password)
        
        # Use raw SQL to handle UUID properly across different databases
        await db.execute(text("""
            INSERT INTO users (id, email, username, hashed_password, full_name, is_active, is_superuser, created_at, updated_at)
            VALUES (:id, :email, :username, :hashed_password, :full_name, :is_active, :is_superuser, datetime('now'), datetime('now'))
        """), {
            "id": str(user_id),
            "email": user_create.email,
            "username": user_create.username,
            "hashed_password": hashed_password,
            "full_name": user_create.full_name,
            "is_active": True,
            "is_superuser": False
        })
        await db.commit()
        
        # Retrieve the created user
        result = await db.execute(
            select(User).where(User.email == user_create.email)
        )
        user = result.scalar_one()
        
        return UserRegistrationResponse(
            id=str(user.id),
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            message="User registered successfully"
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_user_profile(
    current_user = Depends(get_current_user)
):
    """
    Get current user's profile.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        UserResponse: User profile information
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )


@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user's profile.
    
    Args:
        user_update: User profile update data
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        UserResponse: Updated user profile
        
    Raises:
        HTTPException: If email or username already exists
    """
    # Check if email is being updated and already exists
    if user_update.email and user_update.email != current_user.email:
        existing_user = await get_user_by_email(db, user_update.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check if username is being updated and already exists
    if user_update.username and user_update.username != current_user.username:
        result = await db.execute(
            select(User).where(User.username == user_update.username)
        )
        existing_username = result.scalar_one_or_none()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update user fields
    try:
        update_data = {}
        if user_update.email is not None:
            update_data["email"] = user_update.email
        if user_update.username is not None:
            update_data["username"] = user_update.username
        if user_update.full_name is not None:
            update_data["full_name"] = user_update.full_name
        
        if update_data:
            # Use raw SQL for updates to handle UUID properly
            set_clause = ", ".join([f"{key} = :{key}" for key in update_data.keys()])
            update_data["user_id"] = str(current_user.id)
            
            await db.execute(text(f"""
                UPDATE users 
                SET {set_clause}, updated_at = datetime('now')
                WHERE id = :user_id
            """), update_data)
            await db.commit()
        
        # Retrieve updated user
        result = await db.execute(
            select(User).where(User.id == current_user.id)
        )
        updated_user = result.scalar_one()
        
        return UserResponse(
            id=str(updated_user.id),
            email=updated_user.email,
            username=updated_user.username,
            full_name=updated_user.full_name,
            is_active=updated_user.is_active,
            created_at=updated_user.created_at
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )