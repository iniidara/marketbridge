from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class ProfileCreateUpdate(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    market: str = Field(..., min_length=2, max_length=150)
    years_operating: int = Field(..., ge=0, le=100)
    shop_address: str = Field(..., min_length=5, max_length=500)

# ==========================================
# NEW FEATURE 5 SCHEMAS: VERIFICATION INPUTS
# ==========================================

class VerifierCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full Name of the reference verifier")
    phone: str = Field(..., min_length=5, max_length=50, description="Contact phone number")
    relationship: str = Field(..., min_length=2, max_length=100, description="Relationship to trader (e.g. Supplier, Customer)")

class VerificationSubmit(BaseModel):
    known_years: int = Field(..., ge=0, le=100, description="Years they have known the trader")
    trust_rating: int = Field(..., ge=1, le=5, description="Reliability rating on a scale of 1 to 5")
    would_lend: bool = Field(..., description="Would they trust them with goods on credit")
    comments: Optional[str] = Field(None, max_length=1000, description="Additional reference comments")