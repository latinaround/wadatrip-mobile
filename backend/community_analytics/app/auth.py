import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException

try:
    import firebase_admin
    from firebase_admin import auth as firebase_auth

    FIREBASE_ADMIN_AVAILABLE = True
except Exception:
    firebase_admin = None
    firebase_auth = None
    FIREBASE_ADMIN_AVAILABLE = False


@dataclass
class AuthUser:
    uid: str
    email: Optional[str]
    claims: Dict[str, Any]
    is_admin: bool = False


def _admin_uids() -> set[str]:
    raw = os.getenv("ADMIN_UIDS", "")
    return {value.strip() for value in raw.split(",") if value.strip()}


def _allow_dev_bypass() -> bool:
    value = os.getenv("ALLOW_DEV_AUTH_BYPASS", "")
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _initialize_firebase() -> None:
    if not FIREBASE_ADMIN_AVAILABLE:
        raise HTTPException(status_code=500, detail="firebase-admin is not installed on the server")
    if not firebase_admin._apps:
        try:
            firebase_admin.initialize_app()
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Firebase Admin init failed: {exc}")


def _build_user_from_claims(claims: Dict[str, Any]) -> AuthUser:
    uid = str(claims.get("uid") or "")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid auth token")
    is_admin = bool(claims.get("admin")) or uid in _admin_uids()
    return AuthUser(uid=uid, email=claims.get("email"), claims=claims, is_admin=is_admin)


def _authenticate_request(
    authorization: Optional[str],
    x_dev_uid: Optional[str],
    required: bool,
) -> Optional[AuthUser]:
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            raise HTTPException(status_code=401, detail="Authorization header must use Bearer token")
        _initialize_firebase()
        try:
            claims = firebase_auth.verify_id_token(token.strip())
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid auth token: {exc}")
        return _build_user_from_claims(claims)

    if _allow_dev_bypass() and x_dev_uid:
        claims = {"uid": x_dev_uid.strip(), "email": None, "dev_bypass": True}
        return _build_user_from_claims(claims)

    if required:
        raise HTTPException(status_code=401, detail="Authentication required")
    return None


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_dev_uid: Optional[str] = Header(default=None),
) -> AuthUser:
    user = _authenticate_request(authorization, x_dev_uid, required=True)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def get_optional_user(
    authorization: Optional[str] = Header(default=None),
    x_dev_uid: Optional[str] = Header(default=None),
) -> Optional[AuthUser]:
    return _authenticate_request(authorization, x_dev_uid, required=False)


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
