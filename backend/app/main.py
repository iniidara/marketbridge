import time
import httpx
from fastapi import FastAPI, status, Depends, HTTPException, UploadFile, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth import get_current_user
from app.schemas import ProfileCreateUpdate, VerifierCreate, VerificationSubmit
from app.database import supabase

app = FastAPI(
    title="MarketBridge API",
    description="AI-powered Trust Infrastructure for Informal Traders",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/health", status_code=status.HTTP_200_OK)
async def health_check():
    supabase_connected = False
    error_message = None

    try:
        headers = {
            "apikey": settings.SUPABASE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_KEY}"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.SUPABASE_URL}/rest/v1/traders?select=*&limit=1",
                headers=headers,
                timeout=5.0
            )
            if response.status_code == 200:
                supabase_connected = True
            else:
                error_message = f"Supabase responded with code {response.status_code}"
    except Exception as e:
        error_message = str(e)

    return {
        "status": "healthy",
        "timestamp": time.time(),
        "database": {
            "connected": supabase_connected,
            "provider": "Supabase PostgreSQL",
            "error": error_message
        },
        "version": "1.0.0"
    }

@app.get("/api/v1/auth/me", status_code=status.HTTP_200_OK)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "user_metadata": current_user.user_metadata,
        "created_at": current_user.created_at
    }

@app.get("/api/v1/traders/profile", status_code=status.HTTP_200_OK)
def fetch_trader_profile(current_user: dict = Depends(get_current_user)):
    """
    Retrieves the business profile of the active trader.
    Runs on separate background threads to prevent event-loop locks.
    """
    try:
        result = supabase.table("traders").select("*").eq("user_id", current_user.id).execute()
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found. Please complete profile setup."
            )
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database retrieval failed: {str(e)}"
        )

@app.post("/api/v1/traders/profile", status_code=status.HTTP_200_OK)
def save_trader_profile(payload: ProfileCreateUpdate = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Saves or updates (upserts) the trader's profile.
    Explicitly parses payload from the request body safely.
    """
    try:
        check_query = supabase.table("traders").select("id").eq("user_id", current_user.id).execute()
        
        profile_data = {
            "user_id": current_user.id,
            "business_name": payload.business_name,
            "category": payload.category,
            "description": payload.description,
            "market": payload.market,
            "years_operating": payload.years_operating,
            "shop_address": payload.shop_address
        }

        if check_query.data:
            profile_id = check_query.data[0]["id"]
            result = supabase.table("traders").update(profile_data).eq("id", profile_id).execute()
        else:
            result = supabase.table("traders").insert(profile_data).execute()

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database operation failed to write profile data."
            )

        return {
            "success": True,
            "message": "Profile saved successfully.",
            "data": result.data[0]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database write failed: {str(e)}"
        )

# ==========================================
# EVIDENCE VAULT & STORAGE (FEATURE 4)
# ==========================================

@app.get("/api/v1/traders/evidence", status_code=status.HTTP_200_OK)
def get_my_evidence(current_user: dict = Depends(get_current_user)):
    """
    Fetches all metadata entries for business evidence uploaded by this trader [1].
    """
    try:
        trader_query = supabase.table("traders").select("id").eq("user_id", current_user.id).execute()
        if not trader_query.data:
             return []
        
        trader_id = trader_query.data[0]["id"]
        evidence_query = supabase.table("evidence").select("*").eq("trader_id", trader_id).execute()
        return evidence_query.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch evidence details: {str(e)}"
        )

@app.post("/api/v1/traders/evidence", status_code=status.HTTP_201_CREATED)
def upload_evidence_file(
    file: UploadFile,
    evidence_type: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Saves a binary image file to Supabase Storage and logs metadata in PostgreSQL [1].
    """
    trader_query = supabase.table("traders").select("id").eq("user_id", current_user.id).execute()
    if not trader_query.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please complete your business profile setup before uploading evidence."
        )
    trader_id = trader_query.data[0]["id"]

    allowed_types = ["image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Please upload a PNG or JPEG image."
        )

    max_file_size = 5 * 1024 * 1024  # 5MB
    file_bytes = file.file.read()
    if len(file_bytes) > max_file_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 5MB maximum limit."
        )

    file_extension = file.filename.split(".")[-1]
    storage_path = f"{current_user.id}/{evidence_type}_{int(time.time())}.{file_extension}"

    try:
        supabase.storage.from_("evidence").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type}
        )
        public_url = supabase.storage.from_("evidence").get_public_url(storage_path)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage bucket upload failed: {str(e)}"
        )

    try:
        evidence_record = {
            "trader_id": trader_id,
            "evidence_type": evidence_type,
            "file_url": public_url
        }
        result = supabase.table("evidence").insert(evidence_record).execute()
        if not result.data:
             raise Exception("Database transaction failed.")
        return {
            "success": True,
            "message": "Evidence document uploaded successfully.",
            "data": result.data[0]
        }
    except Exception as e:
        try:
            supabase.storage.from_("evidence").remove(storage_path)
        except:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save evidence entry: {str(e)}"
        )

@app.delete("/api/v1/traders/evidence/{evidence_id}", status_code=status.HTTP_200_OK)
def delete_evidence(evidence_id: str, current_user: dict = Depends(get_current_user)):
    """
    Deletes the specified evidence database entry and its physical object from storage.
    """
    try:
        trader_query = supabase.table("traders").select("id").eq("user_id", current_user.id).execute()
        if not trader_query.data:
            raise HTTPException(status_code=403, detail="Access denied.")
        trader_id = trader_query.data[0]["id"]

        evidence_query = supabase.table("evidence").select("*").eq("id", evidence_id).eq("trader_id", trader_id).execute()
        if not evidence_query.data:
            raise HTTPException(status_code=404, detail="Evidence entry not found.")
        
        file_url = evidence_query.data[0]["file_url"]
        storage_path = file_url.split("/public/evidence/")[-1]

        try:
            supabase.storage.from_("evidence").remove(storage_path)
        except:
            pass

        supabase.table("evidence").delete().eq("id", evidence_id).execute()
        return {"success": True, "message": "Evidence document deleted."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )

# ==========================================
# VERIFIERS & SURVEY SERVICES (FEATURE 5)
# ==========================================

@app.get("/api/v1/traders/verifiers", status_code=status.HTTP_200_OK)
def get_my_verifiers(current_user: dict = Depends(get_current_user)):
    """
    Retrieves all reference verifiers invited by this trader [1].
    """
    try:
        trader_query = supabase.table("traders").select("id").eq("user_id", current_user.id).execute()
        if not trader_query.data:
            return []
        trader_id = trader_query.data[0]["id"]
        
        verifiers_query = supabase.table("verifiers").select("*").eq("trader_id", trader_id).execute()
        return verifiers_query.data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch verifiers: {str(e)}"
        )

@app.post("/api/v1/traders/verifiers", status_code=status.HTTP_201_CREATED)
def invite_verifier_reference(payload: VerifierCreate = Body(...), current_user: dict = Depends(get_current_user)):
    """
    Creates a new pending reference verifier with a secure unique token [1].
    """
    try:
        trader_query = supabase.table("traders").select("id").eq("user_id", current_user.id).execute()
        if not trader_query.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please set up your profile before inviting references."
            )
        trader_id = trader_query.data[0]["id"]

        verifier_data = {
            "trader_id": trader_id,
            "name": payload.name,
            "phone": payload.phone,
            "relationship": payload.relationship,
            "status": "pending"
        }
        
        result = supabase.table("verifiers").insert(verifier_data).execute()
        if not result.data:
             raise Exception("Database insert failed.")
        return {
            "success": True,
            "message": "Reference invitation generated successfully.",
            "data": result.data[0]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register reference verifier: {str(e)}"
        )

@app.get("/api/v1/verify/{token}", status_code=status.HTTP_200_OK)
def resolve_verifier_token(token: str):
    """
    Public Endpoint: Resolves the secure verification token to provide page context.
    No login required [1].
    """
    try:
        verifier_query = supabase.table("verifiers").select("*, traders(business_name)").eq("token", token).execute()
        if not verifier_query.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired verification link."
            )
        
        verifier = verifier_query.data[0]
        if verifier["status"] == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This business verification has already been completed. Thank you!"
            )

        return {
            "verifier_name": verifier["name"],
            "relationship": verifier["relationship"],
            "trader_business_name": verifier["traders"]["business_name"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Token verification lookup failed: {str(e)}"
        )

@app.post("/api/v1/verify/{token}", status_code=status.HTTP_200_OK)
def submit_reliability_verification(token: str, payload: VerificationSubmit = Body(...)):
    """
    Public Endpoint: Submits the 5-question reliability survey responses from the reference [1].
    No login required [1].
    """
    try:
        verifier_query = supabase.table("verifiers").select("id", "status").eq("token", token).execute()
        if not verifier_query.data:
            raise HTTPException(status_code=404, detail="Invalid token.")
        
        verifier = verifier_query.data[0]
        if verifier["status"] == "completed":
            raise HTTPException(status_code=400, detail="Verification already completed.")

        verifier_id = verifier["id"]

        verification_data = {
            "verifier_id": verifier_id,
            "known_years": payload.known_years,
            "trust_rating": payload.trust_rating,
            "would_lend": payload.would_lend,
            "comments": payload.comments
        }
        verification_result = supabase.table("verifications").insert(verification_data).execute()
        if not verification_result.data:
            raise Exception("Failed to record verification survey.")

        supabase.table("verifiers").update({"status": "completed"}).eq("id", verifier_id).execute()

        return {
            "success": True,
            "message": "Thank you! Your business verification has been submitted successfully."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Verification submission failed: {str(e)}"
        )

        # ... Keep all previous imports, config, health check, profile, evidence, and verifier endpoints exactly as is ...

# ==========================================
# TRUST SCORE CALCULATOR & AI SERVICES (FEATURE 6)
# ==========================================

@app.get("/api/v1/traders/trust-score", status_code=status.HTTP_200_OK)
def get_my_trust_score(current_user: dict = Depends(get_current_user)):
    """
    Calculates the exact, deterministic trust score based on database records [1].
    Saves/Updates the score in public.trust_scores and returns the breakdown.
    """
    try:
        # 1. Fetch Profile
        trader_query = supabase.table("traders").select("*").eq("user_id", current_user.id).execute()
        if not trader_query.data:
            raise HTTPException(status_code=400, detail="Please set up your profile first.")
        trader = trader_query.data[0]
        trader_id = trader["id"]

        # A. Identity Score (Max 20)
        identity_score = 0
        if trader.get("business_name") and trader.get("category"):
            identity_score += 10
        if trader.get("shop_address"):
            identity_score += 10

        # B. Business Stability (Max 20)
        years = trader.get("years_operating", 0)
        if years >= 5:
            business_score = 20
        elif years >= 3:
            business_score = 15
        elif years >= 1:
            business_score = 10
        elif years > 0:
            business_score = 5
        else:
            business_score = 0

        # C. Evidence Vault (Max 20)
        # 5 points per unique uploaded document type
        evidence_query = supabase.table("evidence").select("evidence_type").eq("trader_id", trader_id).execute()
        unique_evidence_types = {item["evidence_type"] for item in evidence_query.data}
        evidence_score = min(len(unique_evidence_types) * 5, 20)

        # D. Community Verification (Max 40)
        # Average rating (scaled to 20) + proportion of "Yes" to credit (scaled to 20)
        community_score = 0
        verifiers_query = supabase.table("verifiers").select("id").eq("trader_id", trader_id).eq("status", "completed").execute()
        
        if verifiers_query.data:
            completed_verifier_ids = [item["id"] for item in verifiers_query.data]
            verifications_query = supabase.table("verifications").select("*").in_("verifier_id", completed_verifier_ids).execute()
            
            if verifications_query.data:
                total_refs = len(verifications_query.data)
                rating_sum = 0
                would_lend_count = 0
                
                for v in verifications_query.data:
                    rating_sum += v["trust_rating"]
                    if v["would_lend"] is True:
                        would_lend_count += 1
                
                avg_rating = rating_sum / total_refs
                lend_ratio = would_lend_count / total_refs
                
                rating_points = (avg_rating / 5.0) * 20
                lend_points = lend_ratio * 20
                
                # Volume Dampening: Require at least 3 completed references to scale to full 40 points [1].
                # If they have fewer than 3, scale their score down proportionally [1].
                dampening_factor = min(total_refs / 3.0, 1.0)
                community_score = round((rating_points + lend_points) * dampening_factor)

        overall_score = identity_score + business_score + evidence_score + community_score

        # Save/Upsert the calculated score inside postgres public.trust_scores
        score_record = {
            "trader_id": trader_id,
            "identity_score": identity_score,
            "community_score": community_score,
            "business_score": business_score,
            "evidence_score": evidence_score,
            "overall_score": overall_score
        }

        # Check for existing score entry
        check_score = supabase.table("trust_scores").select("id").eq("trader_id", trader_id).execute()
        if check_score.data:
            score_id = check_score.data[0]["id"]
            supabase.table("trust_scores").update(score_record).eq("id", score_id).execute()
        else:
            supabase.table("trust_scores").insert(score_record).execute()

        return {
            "success": True,
            "identity_score": identity_score,
            "business_score": business_score,
            "evidence_score": evidence_score,
            "community_score": community_score,
            "overall_score": overall_score
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Trust Score calculation failed: {str(e)}"
        )

@app.post("/api/v1/traders/explain", status_code=status.HTTP_200_OK)
def explain_trust_score(current_user: dict = Depends(get_current_user)):
    """
    Feeds the active score, trader metadata, and verifier comments to the Groq API [1].
    Groq (using Llama 3.1 8B Instant) generates a structured JSON explanation [1].
    """
    try:
        # 1. Fetch Profile
        trader_query = supabase.table("traders").select("*").eq("user_id", current_user.id).execute()
        if not trader_query.data:
            raise HTTPException(status_code=400, detail="Profile not configured.")
        trader = trader_query.data[0]
        trader_id = trader["id"]

        # 2. Fetch Score
        score_query = supabase.table("trust_scores").select("*").eq("trader_id", trader_id).execute()
        if not score_query.data:
            raise HTTPException(status_code=400, detail="Calculate trust score first.")
        score = score_query.data[0]

        # 3. Fetch Verifications Comments
        verifiers_query = supabase.table("verifiers").select("id").eq("trader_id", trader_id).eq("status", "completed").execute()
        comments = []
        if verifiers_query.data:
            completed_verifier_ids = [item["id"] for item in verifiers_query.data]
            verifications_query = supabase.table("verifications").select("comments").in_("verifier_id", completed_verifier_ids).execute()
            comments = [v["comments"] for v in verifications_query.data if v["comments"]]

        # 4. Compile the prompt for Groq API
        prompt_content = f"""
        Analyze the following credit trust profile for an informal business:
        - Business Name: {trader['business_name']}
        - Category: {trader['category']}
        - Years Operating: {trader['years_operating']}
        - Location: {trader['market']}
        
        Deterministic Reputation Scores:
        - Overall Reputation Score: {score['overall_score']}/100
        - Identity Profile Verification: {score['identity_score']}/20
        - Business Stability Rating: {score['business_score']}/20
        - Physical Evidence Uploads: {score['evidence_score']}/20
        - Community Validation Feedback: {score['community_score']}/40
        
        Peer Comments:
        {chr(10).join(f'- "{c}"' for c in comments) if comments else 'No written peer comments provided yet.'}
        """

        # Make direct HTTP post request to Groq OpenAI-compatible Chat Completions API
        groq_endpoint = "https://api.groq.com/openai/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "llama-3.1-8b-instant",  # Highly stable, fast free-tier model on Groq [1]
            "messages": [
                {
                    "role": "system",
                    "content": "You are a financial reputational assessment AI. Analyze the credit trust profile and write an objective credit readiness report. You MUST return your response in raw JSON format matching this EXACT schema: {\"overall_summary\": \"Short 2-3 sentence financial explanation of their score...\", \"strengths\": [\"Strength point 1\", \"Strength point 2\"], \"weaknesses\": [\"Vulnerability/Improvement point 1\"], \"recommendations\": [\"Actionable step 1 to improve score\", \"Actionable step 2\"], \"confidence_level\": \"High, Medium, or Low\"}"
                },
                {
                    "role": "user",
                    "content": prompt_content
                }
            ],
            "response_format": {
                "type": "json_object"  # Natively forces Groq to output structurally valid JSON [1]
            },
            "temperature": 0.2
        }

        async_client = httpx.Client()
        response = async_client.post(groq_endpoint, json=payload, headers=headers, timeout=20.0)
        
        if response.status_code != 200:
             raise Exception(f"Groq API returned code {response.status_code}: {response.text}")
        
        response_json = response.json()
        raw_text = response_json["choices"][0]["message"]["content"]
        
        import json
        return json.loads(raw_text)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Groq AI explanation failed: {str(e)}"
        )