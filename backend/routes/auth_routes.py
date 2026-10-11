from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import httpx

router = APIRouter(tags=["authentication"])

class GoogleAuthRequest(BaseModel):
    access_token: str

class EmailAuthRequest(BaseModel):
    email: str
    password: str

@router.get("/api/auth/config")
async def get_auth_config():
    return {
        "google_client_id": os.getenv("GOOGLE_CLIENT_ID") or ""
    }

@router.post("/api/auth/google")
async def google_login(req: GoogleAuthRequest):
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    
    # Check if we should run in developer mock mode
    if not client_id or client_id.strip() == "" or req.access_token.startswith("mock_"):
        # Simulated profile for developer local mock testing
        return {
            "success": True,
            "user": {
                "name": "Alex Morgan",
                "email": "alex.morgan@example.com",
                "picture": "https://ui-avatars.com/api/?name=Alex+Morgan&background=10b981&color=fff&size=96"
            }
        }
        
    # Execute actual token verification with Google APIs
    try:
        async with httpx.AsyncClient() as client:
            # Query Google Userinfo endpoint using the user access token
            res = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {req.access_token}"}
            )
            
            if res.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google Access Token")
                
            user_info = res.json()
            
            # Extract user profile info
            name = user_info.get("name", user_info.get("email", "Google User"))
            email = user_info.get("email")
            picture = user_info.get("picture", f"https://ui-avatars.com/api/?name={name}&background=10b981&color=fff")
            
            return {
                "success": True,
                "user": {
                    "name": name,
                    "email": email,
                    "picture": picture
                }
            }
            
    except httpx.RequestError as e:
        raise HTTPException(status_code=500, detail=f"Google API verification connection error: {str(e)}")

@router.post("/api/auth/login")
async def email_login(req: EmailAuthRequest):
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
        
    # Verify basic email formatting
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
        
    # Simple simulated validation for dev testing: accept all logins!
    name = req.email.split("@")[0].replace(".", " ").title()
    avatar_url = f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=3b82f6&color=fff&size=96"
    
    return {
        "success": True,
        "user": {
            "name": name,
            "email": req.email,
            "picture": avatar_url
        }
    }
