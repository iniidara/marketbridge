from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase

# Instantiates the standard Bearer header reader
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):  # Removed 'async'
    """
    FastAPI Dependency to validate the incoming Supabase JWT token.
    Runs on background thread pools to prevent main event-loop deadlocks.
    """
    token = credentials.credentials
    try:
        # Validate the token directly with the Supabase Auth server (Synchronous)
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session has expired or is invalid."
            )
        return response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )