from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.core.supabase import get_supabase, get_supabase_anon
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    SignUpRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _build_auth_response(session) -> AuthResponse:
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type="bearer",
        expires_in=session.expires_in,
        user={"id": str(session.user.id), "email": session.user.email},
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(data: SignUpRequest):
    supabase = get_supabase_anon()
    try:
        response = supabase.auth.sign_up(
            {"email": data.email, "password": data.password}
        )
        if response.session is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed — check email confirmation settings",
            )
        return _build_auth_response(response.session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    supabase = get_supabase_anon()
    try:
        response = supabase.auth.sign_in_with_password(
            {"email": data.email, "password": data.password}
        )
        return _build_auth_response(response.session)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(data: RefreshRequest):
    supabase = get_supabase_anon()
    try:
        response = supabase.auth.refresh_session(data.refresh_token)
        return _build_auth_response(response.session)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        )


@router.post("/logout")
async def logout():
    return {"message": "Logged out — discard tokens client-side"}


@router.post("/password-reset")
async def request_password_reset(data: PasswordResetRequest):
    supabase = get_supabase_anon()
    try:
        supabase.auth.reset_password_email(data.email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post("/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    supabase = get_supabase_anon()
    try:
        supabase.auth.update_user(
            data.access_token,
            {"password": data.new_password},
        )
        return {"message": "Password updated"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user: dict = Depends(get_current_user)):
    supabase = get_supabase()
    try:
        supabase.auth.admin.delete_user(user["id"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
