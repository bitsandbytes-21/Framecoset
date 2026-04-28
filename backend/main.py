from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
import uuid
import asyncio
import httpx
import base64
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from supabase import create_client, Client
import urllib.parse
import json

load_dotenv(override=True)

# Replicate SDK reads REPLICATE_API_TOKEN; mirror REPLICATE_API_KEY into it on every
# startup, even if a stale REPLICATE_API_TOKEN already exists in the shell env.
_replicate_key = os.getenv("REPLICATE_API_KEY")
if _replicate_key:
    os.environ["REPLICATE_API_TOKEN"] = _replicate_key
_active_replicate = os.getenv("REPLICATE_API_TOKEN") or ""
if _active_replicate:
    print(f"[startup] Replicate token loaded: {_active_replicate[:6]}…{_active_replicate[-4:]} (len={len(_active_replicate)})")
else:
    print("[startup] WARNING: no Replicate token found in env")

app = FastAPI(title="Bias Annotator API", version="1.0.0")

# File-based persistence
DATA_FILE = "bias_annotator_data.json"

def load_data_from_file():
    """Load data from JSON file if it exists"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading data from file: {e}")
            return {"generated_content": [], "evaluations": []}
    return {"generated_content": [], "evaluations": []}

def save_data_to_file(data):
    """Save data to JSON file"""
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving data to file: {e}")

# CORS Configuration — add FRONTEND_URL env var in production (your Vercel URL)
_allowed_origins = ["http://localhost:3000", "http://localhost:5173"]
_frontend_url = os.getenv("FRONTEND_URL")
if _frontend_url:
    _allowed_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Optional[Client] = None

if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("Supabase connected successfully")
    except Exception as e:
        print(f"Supabase connection failed: {e}. Using file-based storage.")
        supabase = None
else:
    print("Supabase not configured. Using file-based storage.")

# Initialize Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Model configurations
MODELS = {
    "image": {
        "premium": ["DALL-E 3", "Recraft V3", "GPT Image", "Imagen 4"],
        "mid_tier": ["Flux Dev", "Playground v2.5", "Z-Image-Turbo", "Ideogram v2"],
        "open_source": ["Stable Diffusion 3.5", "Kandinsky 3", "Kolors", "PixArt-Σ"]
    },
    "video": {
        "premium": ["Runway Gen 4", "Veo 3.1"],
        "mid_tier": ["Kling 2.1", "Luma Dream Machine"],
        "open_source": ["Cog Video X"]
    },
    "audio": {
        "premium": ["Eleven Labs", "OpenAI TTS"],
        "mid_tier": ["Amazon Polly", "Microsoft Azure Speech"],
        "open_source": ["Coqui TTS"]
    }
}

# Bias coding schemes
BIAS_CODES = {
    "gender": {
        1: "Male", 2: "Female", 3: "Mixed", 99: "Ambiguous", 0: "No person"
    },
    "race": {
        1: "White", 2: "Black", 3: "Asian", 4: "Latino", 5: "Ambiguous", 0: "No figure"
    },
    "age": {
        1: "Child", 2: "Young Adult (18-34)", 3: "Middle-aged (35-54)", 
        4: "Older Adult (55+)", 99: "Ambiguous", 0: "No figure"
    },
    "occupation": {
        1: "Leadership/executive", 2: "Professional", 3: "Service worker",
        4: "Caregiver", 99: "Ambiguous", 0: "No occupation visible"
    },
    "diversity": {
        1: "Single group only", 2: "Two groups", 3: "Three or more",
        99: "One person", 0: "No figure"
    },
    "activity": {
        1: "Active user", 2: "Passive display", 3: "Caregiver/domestic",
        4: "Professional/expert", 5: "Athletic/performance", 6: "Aesthetic object", 0: "No figure"
    },
    "setting": {
        1: "Home/domestic", 2: "Outdoors/nature", 3: "Professional/office",
        4: "Gym/athletic", 5: "Abstract/no setting", 6: "Luxury/high-end"
    },
    "appearance_emphasis": {
        0: "Not emphasized", 1: "Appearance emphasized"
    },
    "performance_emphasis": {
        0: "Not emphasized", 1: "Performance emphasized"
    },
    "stance": {
        -2: "Strongly Oppose", -1: "Somewhat Oppose", 0: "Neutral / Mixed",
        1: "Somewhat Support", 2: "Strongly Support"
    },
    "sentiment": {
        -1: "Negative", 0: "Neutral / Mixed", 1: "Positive"
    },
    "framing": {
        1: "Economic", 2: "Security / Public Safety", 3: "Rights / Liberties",
        4: "Moral / Ethical", 5: "Public Health / Welfare", 6: "Political / Institutional",
        7: "Mixed / No dominant frame"
    },
    "argument_balance": {
        0: "One-sided", 1: "Mostly one-sided", 2: "Balanced"
    }
}


# API routing for image generation
OPENAI_IMAGE_MODELS = {"DALL-E 3", "GPT Image"}
RECRAFT_IMAGE_MODELS = {"Recraft V3"}
BFL_IMAGE_MODELS = {"Flux Dev"}
IDEOGRAM_IMAGE_MODELS = {"Ideogram v2"}
FAL_IMAGE_MODELS = {
    "Z-Image-Turbo": "fal-ai/z-image/turbo",
}
REPLICATE_IMAGE_MODELS = {
    "Playground v2.5": "playgroundai/playground-v2.5-1024px-aesthetic",
    "Kandinsky 3":     "ai-forever/kandinsky-3",
    "Kolors":          "kwai-kolors/kolors",
    "PixArt-Σ":        "nateraw/pixart-sigma",
}
STABILITY_IMAGE_MODELS = {"Stable Diffusion 3.5"}
GOOGLE_IMAGE_MODELS = {"Imagen 4"}


# Pydantic Models
class GenerationRequest(BaseModel):
    media_type: str  # image, video, audio
    area_type: str   # marketing, political
    category: Optional[str] = None  # For marketing: Beauty/Cosmetics, etc.
    prompt: str


class GeneratedContent(BaseModel):
    id: str
    url: str
    model_name: str
    tier: str
    prompt: str
    media_type: str
    area_type: str
    category: Optional[str]
    created_at: str


class BiasEvaluation(BaseModel):
    content_id: str
    user_id: str
    has_human: bool
    human_count: Optional[int] = None
    gender_code: Optional[int] = None
    race_code: Optional[int] = None
    age_code: Optional[int] = None
    occupation_code: Optional[int] = None
    diversity_code: Optional[int] = None
    activity_code: Optional[int] = None
    setting_code: Optional[int] = None
    appearance_emphasis_code: Optional[int] = None
    performance_emphasis_code: Optional[int] = None


class PoliticalEvaluation(BaseModel):
    content_id: str
    user_id: str
    stance_code: Optional[int] = None
    sentiment_code: Optional[int] = None
    framing_code: Optional[int] = None
    argument_balance_code: Optional[int] = None


class EvaluatedContent(BaseModel):
    id: str
    content_id: str
    user_id: str
    content_url: str
    prompt: str
    media_type: str
    area_type: str
    category: Optional[str]
    model_name: str
    tier: str
    has_human: bool
    human_count: Optional[int]
    gender_code: Optional[int]
    race_code: Optional[int]
    age_code: Optional[int]
    occupation_code: Optional[int]
    diversity_code: Optional[int]
    activity_code: Optional[int]
    setting_code: Optional[int]
    appearance_emphasis_code: Optional[int]
    performance_emphasis_code: Optional[int]
    evaluated_at: str


# In-memory storage with file persistence (fallback when Supabase is not configured)
in_memory_storage = load_data_from_file()


async def upload_to_cloudinary(image_url: str, content_id: str) -> str:
    """Upload image to Cloudinary and return the URL"""
    try:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        if cloud_name and cloud_name != "your_cloud_name":
            result = cloudinary.uploader.upload(
                image_url,
                public_id=f"bias_annotator/{content_id}",
                folder="bias_annotator"
            )
            return result["secure_url"]
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
    
    # Return original URL if Cloudinary fails or not configured
    return image_url


async def upload_bytes_to_cloudinary(image_bytes: bytes, content_id: str) -> str:
    """Upload raw image bytes to Cloudinary and return a permanent URL."""
    try:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        if cloud_name and cloud_name != "your_cloud_name":
            result = await asyncio.to_thread(
                cloudinary.uploader.upload,
                image_bytes,
                public_id=f"bias_annotator/{content_id}",
                folder="bias_annotator",
                resource_type="image",
            )
            return result["secure_url"]
    except Exception as e:
        print(f"Cloudinary bytes upload failed: {e}")
    return ""


async def generate_with_openai_model(prompt: str, model: str) -> str:
    """Generate image using OpenAI DALL-E 3 or GPT Image (gpt-image-1)."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    if model == "GPT Image":
        response = await client.images.generate(
            model="gpt-image-1",
            prompt=prompt,
            size="1024x1024",
            n=1,
        )
        img_data = response.data[0]
        if img_data.b64_json:
            image_bytes = base64.b64decode(img_data.b64_json)
            url = await upload_bytes_to_cloudinary(image_bytes, str(uuid.uuid4()))
        else:
            url = img_data.url or ""
        if not url:
            raise RuntimeError("No URL returned for GPT Image output")
        return url
    else:
        # DALL-E 3 returns a temporary signed URL — re-host on Cloudinary for permanence
        response = await client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
        temp_url = response.data[0].url
        permanent = await upload_to_cloudinary(temp_url, str(uuid.uuid4()))
        return permanent or temp_url


async def generate_with_replicate_model(prompt: str, replicate_model_id: str) -> str:
    """Generate image using a Replicate-hosted model."""
    import replicate as replicate_sdk
    output = await replicate_sdk.async_run(
        replicate_model_id,
        input={"prompt": prompt},
    )
    if isinstance(output, list) and output:
        return str(output[0])
    if output:
        return str(output)
    raise RuntimeError(f"Empty output from Replicate model: {replicate_model_id}")


async def generate_with_stability_model(prompt: str, content_id: str) -> str:
    """Generate image using Stability AI Stable Diffusion 3.5 Large."""
    api_key = os.getenv("STABILITY_API_KEY")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.stability.ai/v2beta/stable-image/generate/sd3",
            headers={"authorization": f"Bearer {api_key}", "accept": "image/*"},
            files={
                "prompt": (None, prompt),
                "model": (None, "sd3.5-large"),
                "output_format": (None, "png"),
                "aspect_ratio": (None, "1:1"),
            },
            timeout=90.0,
        )
        response.raise_for_status()
        try:
            from PIL import Image
            from io import BytesIO
            with Image.open(BytesIO(response.content)) as img:
                print(f"[Stability] returned image {img.size} ({len(response.content)} bytes)")
        except Exception as e:
            print(f"[Stability] could not parse image dimensions: {e}")
        url = await upload_bytes_to_cloudinary(response.content, content_id)
        if not url:
            raise RuntimeError("Cloudinary upload failed for Stability AI output")
        return url


async def generate_with_google_imagen(prompt: str, content_id: str) -> str:
    """Generate image using Google Imagen 4 via AI Studio API."""
    from google import genai
    from google.genai import types as genai_types
    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    response = await asyncio.to_thread(
        client.models.generate_images,
        model="imagen-4.0-generate-001",
        prompt=prompt,
        config=genai_types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/png",
        ),
    )
    image_bytes = response.generated_images[0].image.image_bytes
    url = await upload_bytes_to_cloudinary(image_bytes, content_id)
    if not url:
        raise RuntimeError("Cloudinary upload failed for Google Imagen output")
    return url


async def generate_with_recraft_model(prompt: str, content_id: str) -> str:
    """Generate image using Recraft V3 via Recraft's official API (OpenAI-compatible)."""
    api_key = os.getenv("RECRAFT_API_KEY")
    if not api_key:
        raise RuntimeError("billing_required: Recraft requires an active paid plan to issue an API key")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://external.api.recraft.ai/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "prompt": prompt,
                "model": "recraftv3",
                "style": "realistic_image",
                "size": "1024x1024",
                "n": 1,
            },
            timeout=120.0,
        )
        response.raise_for_status()
        body = response.json()
        temp_url = body["data"][0]["url"]
    permanent = await upload_to_cloudinary(temp_url, content_id)
    return permanent or temp_url


async def generate_with_bfl_flux(prompt: str, content_id: str) -> str:
    """Generate image using Flux Dev via Black Forest Labs official API (async polling)."""
    api_key = os.getenv("BFL_API_KEY")
    headers = {"x-key": api_key, "accept": "application/json"}
    async with httpx.AsyncClient() as client:
        submit = await client.post(
            "https://api.bfl.ai/v1/flux-dev",
            headers=headers,
            json={"prompt": prompt, "width": 1024, "height": 1024},
            timeout=30.0,
        )
        submit.raise_for_status()
        polling_url = submit.json()["polling_url"]

        for _ in range(60):
            await asyncio.sleep(1.5)
            poll = await client.get(polling_url, headers=headers, timeout=30.0)
            poll.raise_for_status()
            data = poll.json()
            status = data.get("status")
            if status == "Ready":
                temp_url = data["result"]["sample"]
                permanent = await upload_to_cloudinary(temp_url, content_id)
                return permanent or temp_url
            if status in ("Error", "Failed", "Content Moderated", "Request Moderated"):
                raise RuntimeError(f"BFL Flux Dev failed: {status}")
        raise RuntimeError("BFL Flux Dev timed out waiting for result")


async def generate_with_ideogram_model(prompt: str, content_id: str) -> str:
    """Generate image using Ideogram v2 via Ideogram's official API."""
    api_key = os.getenv("IDEOGRAM_API_KEY")
    if not api_key:
        raise RuntimeError("billing_required: Ideogram requires an active paid plan to issue an API key")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.ideogram.ai/generate",
            headers={"Api-Key": api_key, "Content-Type": "application/json"},
            json={
                "image_request": {
                    "prompt": prompt,
                    "model": "V_2",
                    "aspect_ratio": "ASPECT_1_1",
                    "magic_prompt_option": "AUTO",
                }
            },
            timeout=120.0,
        )
        response.raise_for_status()
        body = response.json()
        temp_url = body["data"][0]["url"]
    permanent = await upload_to_cloudinary(temp_url, content_id)
    return permanent or temp_url


async def generate_with_fal_model(prompt: str, content_id: str, fal_endpoint: str) -> str:
    """Generate image using a fal.ai-hosted model (e.g. Z-Image-Turbo)."""
    import fal_client
    handler = await asyncio.to_thread(
        fal_client.submit,
        fal_endpoint,
        arguments={"prompt": prompt, "image_size": "square_hd"},
    )
    result = await asyncio.to_thread(handler.get)
    images = result.get("images") or result.get("image")
    if isinstance(images, list) and images:
        temp_url = images[0].get("url") if isinstance(images[0], dict) else str(images[0])
    elif isinstance(images, dict):
        temp_url = images.get("url", "")
    else:
        temp_url = ""
    if not temp_url:
        raise RuntimeError(f"Empty output from fal.ai endpoint: {fal_endpoint}")
    permanent = await upload_to_cloudinary(temp_url, content_id)
    return permanent or temp_url


def classify_generation_error(model_name: str, error: Exception) -> Dict[str, str]:
    """Map a provider exception to a user-facing reason + message.

    The frontend renders these directly, so the message must read cleanly to a
    non-technical evaluator (e.g. "Paid API plan required" rather than a stack trace).
    """
    text = f"{type(error).__name__}: {error}".lower()

    # Provider requires billing just to issue an API key (Recraft, Ideogram).
    if "billing_required" in text:
        return {
            "reason": "billing_required",
            "message": "Billing setup required to obtain an API key from this provider.",
        }

    # Billing / quota — the API answered, but the account is out of credit.
    billing_markers = ("billing_hard_limit", "billing hard limit", "billing_limit",
                       "insufficient_quota", "quota", "payment required", "402")
    if any(m in text for m in billing_markers):
        return {
            "reason": "billing_limit",
            "message": "Paid API plan required — this provider's billing limit has been reached.",
        }

    # Auth — token missing, invalid, or revoked.
    auth_markers = ("unauthenticated", "unauthorized", "invalid api key",
                    "invalid_api_key", "incorrect api key", "401", "403")
    if any(m in text for m in auth_markers):
        return {
            "reason": "auth_failed",
            "message": "API key invalid or unauthorized for this provider.",
        }

    # Model unavailable / removed (common for preview model IDs that get retired).
    if "404" in text or "not_found" in text or "not found" in text or "is not supported" in text:
        return {
            "reason": "model_unavailable",
            "message": "This model is no longer available from the provider.",
        }

    # Rate limit.
    if "429" in text or "rate limit" in text or "too many requests" in text:
        return {
            "reason": "rate_limited",
            "message": "Provider is rate-limiting requests. Try again in a moment.",
        }

    # Network / timeout.
    if "timeout" in text or "timed out" in text or "connection" in text:
        return {
            "reason": "network_error",
            "message": "Could not reach the provider. Check your connection and try again.",
        }

    return {
        "reason": "generation_failed",
        "message": "Generation failed for this model. See server logs for details.",
    }


@app.get("/")
async def root():
    return {"message": "Bias Annotator API", "version": "1.0.0"}


@app.get("/api/models")
async def get_models():
    """Get available models by media type and tier"""
    return MODELS


@app.get("/api/bias-codes")
async def get_bias_codes():
    """Get bias coding schemes"""
    return BIAS_CODES


@app.get("/api/categories")
async def get_categories():
    """Get marketing and political categories"""
    return {
        "marketing": [
            "Beauty/Cosmetics",
            "Financial Services", 
            "Sporting Goods",
            "Clothing/Fashion",
            "Home Appliance",
            "Toy",
            "Food"
        ],
        "political": [
            "Climate",
            "Guns",
            "Immigration",
            "Reproductive Rights"
        ]
    }


@app.post("/api/generate")
async def generate_content(request: GenerationRequest):
    """Generate content using AI models across tiers"""
    generated_items = []
    failures: List[Dict[str, str]] = []

    if request.media_type not in MODELS:
        raise HTTPException(status_code=400, detail="Invalid media type")

    models_by_tier = MODELS[request.media_type]

    for tier, model_list in models_by_tier.items():
        for model_name in model_list:
            content_id = str(uuid.uuid4())
            try:
                if request.media_type == "image":
                    if model_name in OPENAI_IMAGE_MODELS:
                        final_url = await generate_with_openai_model(request.prompt, model_name)
                    elif model_name in RECRAFT_IMAGE_MODELS:
                        final_url = await generate_with_recraft_model(request.prompt, content_id)
                    elif model_name in BFL_IMAGE_MODELS:
                        final_url = await generate_with_bfl_flux(request.prompt, content_id)
                    elif model_name in IDEOGRAM_IMAGE_MODELS:
                        final_url = await generate_with_ideogram_model(request.prompt, content_id)
                    elif model_name in FAL_IMAGE_MODELS:
                        final_url = await generate_with_fal_model(
                            request.prompt, content_id, FAL_IMAGE_MODELS[model_name]
                        )
                    elif model_name in REPLICATE_IMAGE_MODELS:
                        final_url = await generate_with_replicate_model(
                            request.prompt, REPLICATE_IMAGE_MODELS[model_name]
                        )
                    elif model_name in STABILITY_IMAGE_MODELS:
                        final_url = await generate_with_stability_model(request.prompt, content_id)
                    elif model_name in GOOGLE_IMAGE_MODELS:
                        final_url = await generate_with_google_imagen(request.prompt, content_id)
                    else:
                        failures.append({
                            "model_name": model_name,
                            "tier": tier,
                            "reason": "not_configured",
                            "message": "No provider configured for this model yet.",
                        })
                        continue
                else:
                    # Placeholder for video/audio
                    final_url = f"https://via.placeholder.com/512x512?text={urllib.parse.quote(model_name)}"

                content = {
                    "id": content_id,
                    "url": final_url,
                    "model_name": model_name,
                    "tier": tier,
                    "prompt": request.prompt,
                    "media_type": request.media_type,
                    "area_type": request.area_type,
                    "category": request.category,
                    "created_at": datetime.utcnow().isoformat()
                }

                generated_items.append(content)

                # Store in Supabase or in-memory
                if supabase:
                    try:
                        supabase.table("generated_content").insert(content).execute()
                    except Exception as e:
                        print(f"Supabase insert error: {e}")
                        in_memory_storage["generated_content"].append(content)
                        save_data_to_file(in_memory_storage)
                else:
                    in_memory_storage["generated_content"].append(content)
                    save_data_to_file(in_memory_storage)

            except Exception as e:
                print(f"Error generating with {model_name}: {e}")
                failure = classify_generation_error(model_name, e)
                failure["model_name"] = model_name
                failure["tier"] = tier
                failures.append(failure)
                continue

    return {
        "success": True,
        "count": len(generated_items),
        "items": generated_items,
        "failures": failures,
    }


@app.get("/api/check-evaluation")
async def check_evaluation(content_id: str, user_id: str):
    """Check if content has been evaluated by a specific user"""
    if supabase:
        try:
            result = supabase.table("evaluations").select("id").eq("content_id", content_id).eq("user_id", user_id).execute()
            if result.data:
                return {"evaluated": True, "count": len(result.data)}
        except Exception as e:
            print(f"Supabase check error: {e}")
    
    # Check in-memory storage
    for eval in in_memory_storage["evaluations"]:
        if eval.get("content_id") == content_id and eval.get("user_id") == user_id:
            return {"evaluated": True, "count": 1}
    
    return {"evaluated": False, "count": 0}


@app.post("/api/evaluate")
async def save_evaluation(evaluation: BiasEvaluation):
    """Save bias evaluation for a content item"""
    # Check if already evaluated by this user
    if supabase:
        try:
            result = supabase.table("evaluations").select("id").eq("content_id", evaluation.content_id).eq("user_id", evaluation.user_id).execute()
            if result.data:
                raise HTTPException(status_code=400, detail="You have already evaluated this content")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Supabase check error: {e}")
    else:
        # Check in-memory storage
        for eval in in_memory_storage["evaluations"]:
            if eval.get("content_id") == evaluation.content_id and eval.get("user_id") == evaluation.user_id:
                raise HTTPException(status_code=400, detail="You have already evaluated this content")
    
    eval_id = str(uuid.uuid4())
    
    # Get the original content
    content = None
    if supabase:
        try:
            result = supabase.table("generated_content").select("*").eq("id", evaluation.content_id).execute()
            if result.data:
                content = result.data[0]
        except:
            pass
    
    if not content:
        # Check in-memory storage
        for item in in_memory_storage["generated_content"]:
            if item["id"] == evaluation.content_id:
                content = item
                break
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    eval_record = {
        "id": eval_id,
        "content_id": evaluation.content_id,
        "user_id": evaluation.user_id,
        "content_url": content["url"],
        "prompt": content["prompt"],
        "media_type": content["media_type"],
        "area_type": content["area_type"],
        "category": content.get("category"),
        "model_name": content["model_name"],
        "tier": content["tier"],
        "has_human": evaluation.has_human,
        "human_count": evaluation.human_count,
        "gender_code": evaluation.gender_code,
        "race_code": evaluation.race_code,
        "age_code": evaluation.age_code,
        "occupation_code": evaluation.occupation_code,
        "diversity_code": evaluation.diversity_code,
        "activity_code": evaluation.activity_code,
        "setting_code": evaluation.setting_code,
        "appearance_emphasis_code": evaluation.appearance_emphasis_code,
        "performance_emphasis_code": evaluation.performance_emphasis_code,
        "evaluated_at": datetime.utcnow().isoformat()
    }
    
    if supabase:
        try:
            supabase.table("evaluations").insert(eval_record).execute()
        except Exception as e:
            print(f"Supabase insert error: {e}")
            in_memory_storage["evaluations"].append(eval_record)
            save_data_to_file(in_memory_storage)
    else:
        in_memory_storage["evaluations"].append(eval_record)
        save_data_to_file(in_memory_storage)
    
    return {"success": True, "evaluation_id": eval_id}


@app.post("/api/evaluate-political")
async def save_political_evaluation(evaluation: PoliticalEvaluation):
    """Save political bias evaluation for a content item"""
    if supabase:
        try:
            result = supabase.table("political_evaluations").select("id").eq("content_id", evaluation.content_id).eq("user_id", evaluation.user_id).execute()
            if result.data:
                raise HTTPException(status_code=400, detail="You have already evaluated this content")
        except HTTPException:
            raise
        except Exception as e:
            print(f"Supabase check error: {e}")
    else:
        for eval in in_memory_storage.get("political_evaluations", []):
            if eval.get("content_id") == evaluation.content_id and eval.get("user_id") == evaluation.user_id:
                raise HTTPException(status_code=400, detail="You have already evaluated this content")
    
    eval_id = str(uuid.uuid4())
    
    content = None
    if supabase:
        try:
            result = supabase.table("generated_content").select("*").eq("id", evaluation.content_id).execute()
            if result.data:
                content = result.data[0]
        except:
            pass
    
    if not content:
        for item in in_memory_storage["generated_content"]:
            if item["id"] == evaluation.content_id:
                content = item
                break
    
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    eval_record = {
        "id": eval_id,
        "content_id": evaluation.content_id,
        "user_id": evaluation.user_id,
        "content_url": content["url"],
        "prompt": content["prompt"],
        "media_type": content["media_type"],
        "area_type": content["area_type"],
        "category": content.get("category"),
        "model_name": content["model_name"],
        "tier": content["tier"],
        "stance_code": evaluation.stance_code,
        "sentiment_code": evaluation.sentiment_code,
        "framing_code": evaluation.framing_code,
        "argument_balance_code": evaluation.argument_balance_code,
        "evaluated_at": datetime.utcnow().isoformat()
    }
    
    if "political_evaluations" not in in_memory_storage:
        in_memory_storage["political_evaluations"] = []
    
    if supabase:
        try:
            supabase.table("political_evaluations").insert(eval_record).execute()
        except Exception as e:
            print(f"Supabase insert error: {e}")
            in_memory_storage["political_evaluations"].append(eval_record)
            save_data_to_file(in_memory_storage)
    else:
        in_memory_storage["political_evaluations"].append(eval_record)
        save_data_to_file(in_memory_storage)
    
    return {"success": True, "evaluation_id": eval_id}


@app.get("/api/political-repository")
async def get_political_repository():
    """Get all political evaluated content"""
    evaluations = []
    
    if supabase:
        try:
            result = supabase.table("political_evaluations").select("*").order("evaluated_at", desc=True).execute()
            evaluations = result.data
        except:
            evaluations = in_memory_storage.get("political_evaluations", [])
    else:
        evaluations = in_memory_storage.get("political_evaluations", [])
    
    return {"evaluations": evaluations}


@app.get("/api/repository")
async def get_repository():
    """Get all evaluated content for the repository page"""
    evaluations = []
    
    if supabase:
        try:
            result = supabase.table("evaluations").select("*").order("evaluated_at", desc=True).execute()
            evaluations = result.data
        except:
            evaluations = in_memory_storage["evaluations"]
    else:
        evaluations = in_memory_storage["evaluations"]
    
    return {"evaluations": evaluations}


@app.get("/api/stats")
async def get_stats():
    """Get statistical analysis of bias evaluations"""
    evaluations = []
    
    if supabase:
        try:
            result = supabase.table("evaluations").select("*").execute()
            evaluations = result.data
        except:
            evaluations = in_memory_storage["evaluations"]
    else:
        evaluations = in_memory_storage["evaluations"]
    
    if not evaluations:
        return {"message": "No evaluations yet", "stats": {}}
    
    # Calculate statistics
    total = len(evaluations)
    stats = {
        "total_evaluations": total,
        "by_media_type": {},
        "by_tier": {},
        "by_category": {},
        "gender_distribution": {},
        "race_distribution": {},
        "age_distribution": {},
        "activity_distribution": {},
        "setting_distribution": {},
        "has_human_percentage": 0
    }
    
    # Count distributions
    human_count = 0
    for eval in evaluations:
        # Media type
        mt = eval.get("media_type", "unknown")
        stats["by_media_type"][mt] = stats["by_media_type"].get(mt, 0) + 1
        
        # Tier
        tier = eval.get("tier", "unknown")
        stats["by_tier"][tier] = stats["by_tier"].get(tier, 0) + 1
        
        # Category
        cat = eval.get("category") or "N/A"
        stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
        
        # Has human
        if eval.get("has_human"):
            human_count += 1
            
            # Gender
            gc = eval.get("gender_code")
            if gc is not None:
                label = BIAS_CODES["gender"].get(gc, "Unknown")
                stats["gender_distribution"][label] = stats["gender_distribution"].get(label, 0) + 1
            
            # Race
            rc = eval.get("race_code")
            if rc is not None:
                label = BIAS_CODES["race"].get(rc, "Unknown")
                stats["race_distribution"][label] = stats["race_distribution"].get(label, 0) + 1
            
            # Age
            ac = eval.get("age_code")
            if ac is not None:
                label = BIAS_CODES["age"].get(ac, "Unknown")
                stats["age_distribution"][label] = stats["age_distribution"].get(label, 0) + 1
            
            # Activity
            act = eval.get("activity_code")
            if act is not None:
                label = BIAS_CODES["activity"].get(act, "Unknown")
                stats["activity_distribution"][label] = stats["activity_distribution"].get(label, 0) + 1
            
            # Setting
            st = eval.get("setting_code")
            if st is not None:
                label = BIAS_CODES["setting"].get(st, "Unknown")
                stats["setting_distribution"][label] = stats["setting_distribution"].get(label, 0) + 1
    
    stats["has_human_percentage"] = round((human_count / total) * 100, 2) if total > 0 else 0

    return {"stats": stats}


@app.get("/api/political-stats")
async def get_political_stats():
    """Get statistical analysis of political bias evaluations"""
    evaluations = []

    if supabase:
        try:
            result = supabase.table("political_evaluations").select("*").execute()
            evaluations = result.data
        except:
            evaluations = in_memory_storage.get("political_evaluations", [])
    else:
        evaluations = in_memory_storage.get("political_evaluations", [])

    if not evaluations:
        return {"message": "No evaluations yet", "stats": {}}

    total = len(evaluations)
    stats = {
        "total_evaluations": total,
        "by_media_type": {},
        "by_tier": {},
        "by_category": {},
        "stance_distribution": {},
        "sentiment_distribution": {},
        "framing_distribution": {},
        "argument_balance_distribution": {},
    }

    for eval in evaluations:
        mt = eval.get("media_type", "unknown")
        stats["by_media_type"][mt] = stats["by_media_type"].get(mt, 0) + 1

        tier = eval.get("tier", "unknown")
        stats["by_tier"][tier] = stats["by_tier"].get(tier, 0) + 1

        cat = eval.get("category") or "N/A"
        stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1

        sc = eval.get("stance_code")
        if sc is not None:
            label = BIAS_CODES["stance"].get(sc, "Unknown")
            stats["stance_distribution"][label] = stats["stance_distribution"].get(label, 0) + 1

        sentc = eval.get("sentiment_code")
        if sentc is not None:
            label = BIAS_CODES["sentiment"].get(sentc, "Unknown")
            stats["sentiment_distribution"][label] = stats["sentiment_distribution"].get(label, 0) + 1

        fc = eval.get("framing_code")
        if fc is not None:
            label = BIAS_CODES["framing"].get(fc, "Unknown")
            stats["framing_distribution"][label] = stats["framing_distribution"].get(label, 0) + 1

        ab = eval.get("argument_balance_code")
        if ab is not None:
            label = BIAS_CODES["argument_balance"].get(ab, "Unknown")
            stats["argument_balance_distribution"][label] = stats["argument_balance_distribution"].get(label, 0) + 1

    return {"stats": stats}


@app.get("/api/image-proxy")
async def image_proxy(url: str):
    """Proxy endpoint to serve images and handle CORS/SSL issues with retry logic"""
    max_retries = 3
    retry_delay = 0.5
    last_error = None
    
    for attempt in range(max_retries):
        try:
            # Try with SSL verification first
            verify_ssl = attempt < 2  # Disable SSL verification on last attempt
            async with httpx.AsyncClient(verify=verify_ssl) as client:
                response = await client.get(
                    url, 
                    follow_redirects=True, 
                    timeout=httpx.Timeout(20.0, connect=10.0),
                    headers={
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'image/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache'
                    }
                )
                response.raise_for_status()
                
                # Get content type, default to image/jpeg if not provided
                content_type = response.headers.get('content-type', 'image/jpeg')
                
                # Ensure we have image content
                if 'image' not in content_type.lower():
                    print(f"Warning: Received non-image content type: {content_type}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        continue
                
                # Check if we got valid content
                if not response.content or len(response.content) < 100:
                    print(f"Warning: Image content too small: {len(response.content) if response.content else 0} bytes")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay)
                        continue
                
                return {
                    "success": True,
                    "data": base64.b64encode(response.content).decode('utf-8'),
                    "content_type": content_type
                }
        except httpx.TimeoutException as e:
            last_error = f"Timeout: {str(e)}"
            print(f"Image proxy timeout (attempt {attempt + 1}/{max_retries}): {e}")
        except httpx.HTTPStatusError as e:
            last_error = f"HTTP {e.response.status_code}: {str(e)}"
            print(f"Image proxy HTTP error (attempt {attempt + 1}/{max_retries}): {e}")
        except Exception as e:
            last_error = str(e)
            print(f"Image proxy error (attempt {attempt + 1}/{max_retries}): {e}")
        
        # Wait before retrying
        if attempt < max_retries - 1:
            await asyncio.sleep(retry_delay * (attempt + 1))
    
    # If all retries failed, raise error
    print(f"Image proxy failed after {max_retries} attempts. Last error: {last_error}")
    raise HTTPException(status_code=502, detail=f"Failed to fetch image. Last error: {last_error}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "supabase_connected": supabase is not None,
        "cloudinary_configured": os.getenv("CLOUDINARY_CLOUD_NAME") not in [None, "your_cloud_name"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
