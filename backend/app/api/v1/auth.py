from fastapi import APIRouter, Depends, HTTPException, Response, status
from app.core.auth import get_current_user
from app.core.supabase import get_supabase, get_user_supabase
from app.schemas.auth import SignUpRequest, LoginRequest, RefreshRequest, AuthResponse

router = APIRouter()


def _build_auth_response(session) -> AuthResponse:
    return AuthResponse(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        token_type="bearer",
        expires_in=session.expires_in,
        user={"id": str(session.user.id), "email": session.user.email},
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(data: SignUpRequest, response: Response):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({"email": data.email, "password": data.password})
        if not result.session:
            # Email confirmation required — signal the client with 202
            response.status_code = status.HTTP_202_ACCEPTED
            return AuthResponse(
                access_token="",
                refresh_token="",
                expires_in=0,
                user={"id": str(result.user.id) if result.user else "", "email": data.email},
                pending_confirmation=True,
            )
        return _build_auth_response(result.session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({"email": data.email, "password": data.password})
        if not result.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return _build_auth_response(result.session)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(data: RefreshRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.refresh_session(data.refresh_token)
        if not result.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        return _build_auth_response(result.session)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(user: dict = Depends(get_current_user)):
    try:
        user_client = get_user_supabase(user["token"])
        user_client.auth.sign_out()
    except Exception:
        pass


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(user: dict = Depends(get_current_user)):
    try:
        supabase = get_supabase()
        supabase.auth.admin.delete_user(user["id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
