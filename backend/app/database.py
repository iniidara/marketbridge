from supabase import create_client, Client
from app.config import settings

# Initialize the standard, stable Supabase client (avoids the ClientOptions bug)
supabase: Client = create_client(
    settings.SUPABASE_URL, 
    settings.SUPABASE_KEY
)