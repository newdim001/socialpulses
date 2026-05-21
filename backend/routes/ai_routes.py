"""AI routes."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import httpx
import json
import logging
logger = logging.getLogger("ai_routes")
router = APIRouter(prefix="/api/ai", tags=["AI"])

# ── AI Content Generation ──

AI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
AI_API_URL = os.environ.get("AI_API_URL", "https://api.deepseek.com/v1/chat/completions")
AI_MODEL = os.environ.get("AI_MODEL", "deepseek-chat")


@router.post("/generate")
async def ai_generate(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate post content using AI."""
    check_ai_credit(user, db)
    topic = data.get("topic", "")
    tone = data.get("tone", "professional")
    length = data.get("length", "medium")  # short, medium, long
    platform = data.get("platform", "twitter")

    if not AI_API_KEY:
        return {"error": "AI not configured - set OPENAI_API_KEY or DEEPSEEK_API_KEY"}

    length_map = {"short": "1-2 sentences (max 280 chars)", "medium": "3-4 sentences", "long": "5-8 sentences"}
    platform_info = {
        "twitter": "X/Twitter - concise, engaging, max 280 characters, use relevant hashtags",
        "linkedin": "LinkedIn - professional, thought-leadership style, 2-3 paragraphs, include industry insights",
        "instagram": "Instagram - visual, casual, emojis welcome, 3-5 short lines with relevant hashtags",
        "facebook": "Facebook - conversational, engaging, 2-4 sentences that encourage discussion",
    }
    platform_guide = platform_info.get(platform, "Social media post")

    prompt = f"""You are a professional social media content writer. Write a {tone} post for {platform_guide}.

Topic: {topic}
Length: {length_map.get(length, "3-4 sentences")}
Tone: {tone}

Write only the post content. No explanations, no quotes, no formatting. Just the raw post text."""

    try:
        import requests
        resp = requests.post(
            AI_API_URL,
            headers={
                "Authorization": "Bearer " + AI_API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "model": AI_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 500,
                "temperature": 0.7,
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        content = result["choices"][0]["message"]["content"].strip()
        increment_usage(user.client_id, "ai_calls", db)
        return {"content": content, "model": AI_MODEL}
    except Exception as e:
        raise HTTPException(500, f"AI generation failed: {str(e)[:100]}")


@router.post("/variations")
async def ai_variations(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate variations of existing content."""
    check_ai_credit(user, db)
    original = data.get("content", "")
    count = min(data.get("count", 3), 5)

    if not AI_API_KEY:
        return {"error": "AI not configured"}

    prompt = f"""Rewrite the following social media post in {count} different variations. Each variation should have a different angle or style while keeping the same core message.

Original: {original}

Return ONLY the variations, one per line. No numbering, no explanations."""

    try:
        import requests
        resp = requests.post(
            AI_API_URL,
            headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1000, "temperature": 0.8},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        text = result["choices"][0]["message"]["content"].strip()
        variations = [v.strip() for v in text.split("\n") if v.strip()]
        increment_usage(user.client_id, "ai_calls", db)
        return {"variations": variations[:count]}
    except Exception as e:
        raise HTTPException(500, f"AI variation failed: {str(e)[:100]}")


# ── AI Content Repurposer ──

VALID_FORMATS = ["blog_post", "tweet_thread", "linkedin_post", "instagram_caption", "youtube_transcript", "newsletter"]

@router.post("/content-ideas")
async def ai_content_ideas(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate content ideas based on industry/niche."""
    check_ai_credit(user, db)
    industry = data.get("industry", "")
    count = data.get("count", 6)
    platform = data.get("platform", "social media")

    if not AI_API_KEY:
        return {"ideas": [
            {"title": "Industry Trends", "description": f"Share the latest trends in {industry}.", "platform": "linkedin"},
            {"title": "Behind the Scenes", "description": f"Show how things work in {industry}.", "platform": "instagram"},
            {"title": "Quick Tips", "description": f"Share tips for {industry}.", "platform": "twitter"},
        ]}

    prompt = "You are a social media strategist. Generate " + str(count) + " content ideas for " + industry + " on " + platform + "."
    prompt += " Return ONLY JSON array with fields: title, description, platform."

    try:
        import requests, json
        resp = requests.post(AI_API_URL,
            headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1000, "temperature": 0.8},
            timeout=30)
        resp.raise_for_status()
        result = resp.json()
        content = result["choices"][0]["message"]["content"].strip().replace("```json", "").replace("```", "").strip()
        increment_usage(user.client_id, "ai_calls", db)
        return {"ideas": json.loads(content)}
    except Exception as e:
        return {"ideas": [
            {"title": industry + " Success Story", "description": "Share a case study.", "platform": "linkedin"},
            {"title": industry + " Myths", "description": "Address common misconceptions.", "platform": platform or "twitter"},
        ]}


@router.post("/best-time")
async def ai_best_time(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Find optimal posting time based on industry and platform."""
    check_ai_credit(user, db)
    industry = data.get("industry", "")
    platform = data.get("platform", "instagram")

    if not AI_API_KEY:
        return {"recommendation": "12:00 PM - 1:00 PM", "reasoning": f"Based on general {industry} audience patterns."}

    prompt = "You are a social media analytics expert."
    prompt += " Recommend the best posting time for " + industry + " on " + platform + "."
    prompt += " Return ONLY JSON with fields: recommendation (day + time range), reasoning (1-2 sentences)."

    try:
        import requests, json
        resp = requests.post(AI_API_URL,
            headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 300, "temperature": 0.5},
            timeout=30)
        resp.raise_for_status()
        result = resp.json()
        content = result["choices"][0]["message"]["content"].strip().replace("```json", "").replace("```", "").strip()
        increment_usage(user.client_id, "ai_calls", db)
        return json.loads(content)
    except:
        return {"recommendation": "Tuesday 10:00 - 11:00 AM", "reasoning": f"Mid-week mornings work best for {industry} on {platform}."}


# —— AI Sentiment ——

@router.post("/sentiment")
async def ai_sentiment(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    check_ai_credit(user, db)
    text = data.get("text", "")
    if not text:
        raise HTTPException(400, "Text is required")
    if not AI_API_KEY:
        return {"sentiment": "neutral", "score": 0.5, "analysis": "AI not configured."}
    prompt = "Analyze sentiment. Return JSON with: sentiment, score (0-1), analysis. Text: " + text
    try:
        import requests, json
        resp = requests.post(AI_API_URL, headers={"Authorization": "Bearer "+AI_API_KEY}, json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 200}, timeout=30)
        resp.raise_for_status()
        c = resp.json()["choices"][0]["message"]["content"].strip().replace("```json","").replace("```","").strip()
        increment_usage(user.client_id, "ai_calls", db)
        return json.loads(c)
    except:
        return {"sentiment": "neutral", "score": 0.5, "analysis": "Could not analyze sentiment."}


# —— AI Reply Suggestions ——

@router.post("/reply-suggestions")
async def ai_reply_suggestions(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    check_ai_credit(user, db)
    messages = data.get("messages", [])
    context = data.get("context", "")
    if not AI_API_KEY:
        return {"suggestions": [{"text": "Thanks! We will get back to you.", "type": "professional"}, {"text": "Happy to help!", "type": "friendly"}, {"text": "Appreciate your patience!", "type": "appreciative"}]}
    prompt = "Generate 3 reply suggestions. Messages: " + str(messages) + " Context: " + context
    prompt += " Return JSON: {suggestions: [{text, type}]}"
    try:
        import requests, json
        resp = requests.post(AI_API_URL, headers={"Authorization": "Bearer "+AI_API_KEY}, json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 500}, timeout=30)
        resp.raise_for_status()
        c = resp.json()["choices"][0]["message"]["content"].strip().replace("```json","").replace("```","").strip()
        increment_usage(user.client_id, "ai_calls", db)
        return json.loads(c)
    except:
        return {"suggestions": [{"text": "Thanks! We will get back to you soon.", "type": "professional"}, {"text": "Happy to help with that!", "type": "friendly"}, {"text": "We appreciate your feedback!", "type": "appreciative"}]}


@router.post("/repurpose")
async def ai_repurpose(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Repurpose content from one format to multiple target formats."""
    check_ai_credit(user, db)
    content_src = data.get("content", "")
    source_format = data.get("source_format", "")
    target_formats = data.get("target_formats", [])

    if not content_src:
        raise HTTPException(400, "Content is required")
    if source_format not in VALID_FORMATS:
        raise HTTPException(400, f"Invalid source format. Valid: {', '.join(VALID_FORMATS)}")
    invalid = [f for f in target_formats if f not in VALID_FORMATS or f == source_format]
    if invalid:
        raise HTTPException(400, f"Invalid or duplicate target formats: {invalid}")

    if not AI_API_KEY:
        raise HTTPException(400, "AI not configured - set OPENAI_API_KEY or DEEPSEEK_API_KEY")

    results = {}
    for target_format in target_formats:
        fmt_name = target_format.replace('_', ' ')
        src_name = source_format.replace('_', ' ')
        prompt = f"""You are a professional content repurposer. Rewrite the following {src_name} into a {fmt_name} format.

Source ({src_name}):
{content_src}

Guidelines for {fmt_name}:
- blog_post: 3-5 paragraphs, detailed, SEO-friendly, subheadings if applicable
- tweet_thread: 3-7 connected tweets, each under 280 chars, use thread numbering (1/N, 2/N...)
- linkedin_post: Professional, 2-4 paragraphs, thought-leadership style, hashtags at end
- instagram_caption: Short, punchy, emojis welcome, 3-6 lines with hashtags
- youtube_transcript: Conversational, hook in first 10 seconds, natural speech patterns
- newsletter: Friendly, personal, 2-4 paragraphs with a clear value proposition

Return ONLY the repurposed content. No explanations, no quotes, no preamble."""
        try:
            resp = requests.post(
                AI_API_URL,
                headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
                json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1500, "temperature": 0.7},
                timeout=30,
            )
            resp.raise_for_status()
            result = resp.json()
            results[target_format] = result["choices"][0]["message"]["content"].strip()
        except Exception as e:
            results[target_format] = None

    increment_usage(user.client_id, "ai_calls", db)
    return {"results": results}



# —— AI Rewrite ——

@router.post("/rewrite")
async def ai_rewrite(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Rewrite/paraphrase content with specified tone and platform."""
    check_ai_credit(user, db)
    content = data.get("content", "")
    tone = data.get("tone", "professional")
    platform = data.get("platform", "twitter")
    count = min(data.get("count", 3), 5)

    if not content:
        raise HTTPException(400, "Content is required")

    if not AI_API_KEY:
        return {"error": "AI not configured - set OPENAI_API_KEY or DEEPSEEK_API_KEY"}

    prompt = f"""You are a professional content writer. Rewrite the following content in {count} different variations with a {tone} tone for {platform}.

Each variation should have a slightly different angle or style while keeping the core message intact.

Original content: {content}

Return ONLY the variations, one per line. No numbering, no explanations, no preamble."""

    try:
        import requests
        resp = requests.post(
            AI_API_URL,
            headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 1000, "temperature": 0.8},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        text = result["choices"][0]["message"]["content"].strip()
        variations = [v.strip() for v in text.split("\n") if v.strip()]
        increment_usage(user.client_id, "ai_calls", db)
        return {"variations": variations[:count]}
    except Exception as e:
        raise HTTPException(500, "AI rewrite failed")


# —— AI Hashtags ——

@router.post("/hashtags")
async def ai_hashtags(data: dict, user=Depends(get_current_user), db=Depends(get_db)):
    """Generate hashtag suggestions grouped by category."""
    check_ai_credit(user, db)
    content = data.get("content", "")
    platform = data.get("platform", "instagram")
    count = min(data.get("count", 10), 30)

    if not content:
        raise HTTPException(400, "Content is required")

    if not AI_API_KEY:
        return {"error": "AI not configured - set OPENAI_API_KEY or DEEPSEEK_API_KEY"}

    prompt = f"""You are a social media hashtag strategist. Generate {count} relevant hashtags for the following content, organized into categories.

Content: {content}
Platform: {platform}

Return ONLY a JSON object with the following structure:
{{
  "trending": ["#tag1", "#tag2", ...],
  "niche": ["#tag1", "#tag2", ...],
  "branded": ["#tag1", "#tag2", ...]
}}

Distribute the {count} hashtags across the three categories. No explanations, no markdown formatting."""

    try:
        import requests
        resp = requests.post(
            AI_API_URL,
            headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [{"role": "user", "content": prompt}], "max_tokens": 500, "temperature": 0.7},
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        text = result["choices"][0]["message"]["content"].strip().replace("```json", "").replace("```", "").strip()
        hashtags = json.loads(text)
        increment_usage(user.client_id, "ai_calls", db)
        return hashtags
    except Exception as e:
        raise HTTPException(500, "AI hashtag generation failed")




# ── Post Analytics ──

@router.get("/api/analytics/summary")
def analytics_summary(year: Optional[int] = None, month: Optional[int] = None, user=Depends(get_current_user), db=Depends(get_db)):