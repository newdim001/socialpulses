import os, sys, json, datetime, random, time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="SocialPulses Free Tools API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

AI_API_KEY = os.environ.get("TOOLS_API_KEY") or ""
AI_BASE_URL = os.environ.get("AI_BASE_URL", "https://api.groq.com/openai/v1")
AI_MODEL = os.environ.get("AI_MODEL", "llama-3.3-70b-versatile")
DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT_PER_IP", "20"))
RATE_LIMIT_MAX = int(os.environ.get("RATE_LIMIT_PER_MIN", "6"))
RATE_WINDOW = 60

rate_store = {}

def get_ip(request):
    fwd = request.headers.get("X-Forwarded-For")
    if fwd: return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def check_limits(request, weight=1):
    ip = get_ip(request); now = time.time()
    if ip not in rate_store:
        rate_store[ip] = {"reqs": [], "daily": 0, "reset": now}
    e = rate_store[ip]
    td = datetime.datetime.now().date()
    lr = datetime.datetime.fromtimestamp(e["reset"]).date()
    if td != lr: e["daily"] = 0; e["reset"] = now
    if e["daily"] >= DAILY_LIMIT:
        raise HTTPException(429, "Daily limit reached (" + str(DAILY_LIMIT) + " requests). Try again tomorrow or sign up.")
    cut = now - RATE_WINDOW
    e["reqs"] = [(t, w) for t, w in e["reqs"] if t > cut]
    wc = sum(w for _, w in e["reqs"])
    if wc + weight > RATE_LIMIT_MAX:
        raise HTTPException(429, "Too fast! Please wait a moment between requests.")
    e["reqs"].append((now, weight)); e["daily"] += weight

async def call_ai(prompt, system="You are a helpful social media assistant."):
    if not AI_API_KEY: raise HTTPException(503, "AI not configured.")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{AI_BASE_URL}/chat/completions", 
            headers={"Authorization": "Bearer " + AI_API_KEY, "Content-Type": "application/json"},
            json={"model": AI_MODEL, "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}], "temperature": 0.7, "max_tokens": 1000})
        if r.status_code == 429: raise HTTPException(429, "AI busy. Try again.")
        if r.status_code != 200: raise HTTPException(502, "AI error: " + str(r.status_code))
        return r.json()["choices"][0]["message"]["content"]

# ── Data ──
NICHES = ["general","tech","fashion","food","fitness","business","travel","music","art","education","finance","health"]
PLATFORMS = ["instagram","tiktok","twitter","linkedin","facebook"]
TONES = ["Professional","Casual","Funny","Inspirational","Educational","Motivational","Witty"]

BT = {
"general":{"instagram":{"mf":["9AM","11AM","2PM","7PM"],"we":["10AM","12PM","3PM","8PM"],"bd":"Wed","bt":"11 AM"},"tiktok":{"mf":["7AM","10AM","12PM","7PM"],"we":["9AM","11AM","2PM","8PM"],"bd":"Thu","bt":"10 AM"},"twitter":{"mf":["8AM","12PM","5PM"],"we":["9AM","11AM","3PM"],"bd":"Wed","bt":"8 AM"},"linkedin":{"mf":["7AM","9AM","12PM","5PM"],"we":["8AM","10AM"],"bd":"Tue","bt":"9 AM"},"facebook":{"mf":["9AM","1PM","3PM"],"we":["10AM","12PM","2PM"],"bd":"Thu","bt":"1 PM"}},
"tech":{"instagram":{"mf":["8AM","10AM","1PM","6PM"],"we":["9AM","11AM","2PM"],"bd":"Tue","bt":"10 AM"},"tiktok":{"mf":["6AM","9AM","11AM","6PM"],"we":["8AM","10AM","1PM","7PM"],"bd":"Thu","bt":"9 AM"},"twitter":{"mf":["7AM","10AM","1PM","4PM"],"we":["8AM","11AM"],"bd":"Wed","bt":"10 AM"},"linkedin":{"mf":["6AM","8AM","11AM","4PM"],"we":["7AM","9AM"],"bd":"Tue","bt":"8 AM"},"facebook":{"mf":["8AM","12PM","2PM"],"we":["9AM","11AM","1PM"],"bd":"Wed","bt":"12 PM"}},
"fashion":{"instagram":{"mf":["10AM","1PM","4PM","8PM"],"we":["11AM","2PM","5PM","9PM"],"bd":"Fri","bt":"1 PM"},"tiktok":{"mf":["9AM","12PM","3PM","8PM"],"we":["10AM","1PM","4PM","9PM"],"bd":"Fri","bt":"12 PM"},"twitter":{"mf":["9AM","12PM","4PM"],"we":["10AM","1PM","3PM"],"bd":"Thu","bt":"12 PM"},"linkedin":{"mf":["8AM","10AM","1PM"],"we":["9AM","11AM"],"bd":"Wed","bt":"10 AM"},"facebook":{"mf":["10AM","2PM","4PM"],"we":["11AM","1PM","3PM"],"bd":"Thu","bt":"2 PM"}},
"food":{"instagram":{"mf":["11AM","1PM","5PM","8PM"],"we":["10AM","12PM","3PM","7PM"],"bd":"Fri","bt":"12 PM"},"tiktok":{"mf":["10AM","12PM","4PM","7PM"],"we":["9AM","11AM","2PM","6PM"],"bd":"Fri","bt":"11 AM"},"twitter":{"mf":["10AM","1PM","5PM"],"we":["11AM","2PM","4PM"],"bd":"Thu","bt":"1 PM"},"linkedin":{"mf":["9AM","11AM","2PM"],"we":["10AM","12PM"],"bd":"Tue","bt":"11 AM"},"facebook":{"mf":["11AM","2PM","5PM"],"we":["10AM","1PM","4PM"],"bd":"Thu","bt":"2 PM"}},
"fitness":{"instagram":{"mf":["6AM","9AM","12PM","6PM"],"we":["7AM","10AM","1PM","5PM"],"bd":"Mon","bt":"7 AM"},"tiktok":{"mf":["5AM","8AM","11AM","5PM"],"we":["6AM","9AM","12PM","4PM"],"bd":"Mon","bt":"6 AM"},"twitter":{"mf":["6AM","9AM","12PM"],"we":["7AM","10AM","1PM"],"bd":"Tue","bt":"8 AM"},"linkedin":{"mf":["5AM","7AM","10AM"],"we":["6AM","8AM"],"bd":"Mon","bt":"7 AM"},"facebook":{"mf":["7AM","10AM","1PM"],"we":["8AM","11AM","2PM"],"bd":"Wed","bt":"9 AM"}},
"business":{"instagram":{"mf":["8AM","10AM","1PM","5PM"],"we":["9AM","11AM","2PM"],"bd":"Tue","bt":"10 AM"},"tiktok":{"mf":["7AM","9AM","12PM","5PM"],"we":["8AM","10AM","1PM"],"bd":"Thu","bt":"9 AM"},"twitter":{"mf":["7AM","9AM","12PM","4PM"],"we":["8AM","10AM"],"bd":"Wed","bt":"9 AM"},"linkedin":{"mf":["6AM","8AM","10AM","12PM"],"we":["7AM","9AM"],"bd":"Tue","bt":"8 AM"},"facebook":{"mf":["8AM","11AM","1PM"],"we":["9AM","12PM"],"bd":"Wed","bt":"11 AM"}},
}

HC = {
"general":{"b":["#socialmedia","#viral","#trending","#contentcreator","#marketing","#digital"],"m":["#socialmediamanager","#contentstrategy","#branding"],"n":["#contentplanning","#engagementtips"]},
"tech":{"b":["#tech","#technology","#innovation","#ai","#startup","#coding"],"m":["#artificialintelligence","#technews","#programming"],"n":["#machinelearning","#saas","#devcommunity"]},
"fashion":{"b":["#fashion","#style","#ootd","#fashionblogger","#trendy"],"m":["#fashioninspo","#streetstyle","#sustainablefashion"],"n":["#minimaliststyle","#capsulewardrobe"]},
"food":{"b":["#food","#foodie","#yummy","#delicious","#instafood"],"m":["#homecooking","#foodblogger","#recipe","#healthyeating"],"n":["#mealprep","#plantbased","#foodstyling"]},
"fitness":{"b":["#fitness","#workout","#gym","#motivation","#health"],"m":["#fitnessmotivation","#personaltrainer","#fitlife"],"n":["#homeworkout","#calisthenics","#yogaeverywhere"]},
"business":{"b":["#business","#entrepreneur","#success","#leadership","#startup"],"m":["#smallbusiness","#businesstips","#entrepreneurship"],"n":["#founderstories","#businesstrategy"]},
}

# ── Endpoints ──

@app.get("/health")
async def health():
    return {"status":"ok","ai_configured":bool(AI_API_KEY),"model":AI_MODEL,"daily_limit":DAILY_LIMIT,"rate_limit":str(RATE_LIMIT_MAX)+"/min"}

@app.get("/niches")
async def niches(): return {"niches":NICHES}

@app.get("/platforms")
async def platforms(): return {"platforms":PLATFORMS}

@app.get("/tones")
async def tones(): return {"tones":TONES}

class BTReq(BaseModel): niche: str = "general"; platform: str = "instagram"
@app.post("/best-time")
async def best_time(req: BTReq, request: Request):
    check_limits(request, 0)
    nd = BT.get(req.niche, BT["general"])
    pd = nd.get(req.platform, nd.get("instagram", BT["general"]["instagram"]))
    return {"niche":req.niche,"platform":req.platform,"best_day":pd["bd"],"best_time":pd["bt"],
        "weekday_times":pd["mf"],"weekend_times":pd["we"],
        "tip":f"Posting on {pd['bd']} at {pd['bt']} typically gets the highest engagement for {req.niche} content on {req.platform}."}

class CapReq(BaseModel): topic: str; platform: str = "instagram"; tone: str = "Casual"; count: int = 3
@app.post("/generate-captions")
async def gen_captions(req: CapReq, request: Request):
    check_limits(request, 2)
    p = f"Generate {req.count} social media captions for {req.platform} about '{req.topic}' with a {req.tone} tone. For each: write caption, suggest hashtags, give tip. Format as Caption [N]: [text] Hashtags: [tags] Tip: [tip]"
    return {"captions": await call_ai(p)}

class IdeasReq(BaseModel): niche: str; platform: str = "instagram"; count: int = 10
@app.post("/content-ideas")
async def gen_ideas(req: IdeasReq, request: Request):
    check_limits(request, 2)
    p = f"Generate {req.count} content ideas for a {req.niche} account on {req.platform}. For each: title, format, engagement score /10, execution tip."
    return {"ideas": await call_ai(p)}

class RepReq(BaseModel): content: str; target_platform: str = "twitter"
@app.post("/repurpose-content")
async def repurpose(req: RepReq, request: Request):
    check_limits(request, 2)
    p = f"Repurpose this content for {req.target_platform}. Keep the core message, adapt the style. Return repurposed version with explanation.\n\nContent: {req.content}"
    return {"repurposed": await call_ai(p)}

class TrendReq(BaseModel): niche: str; count: int = 5
@app.post("/trending-topics")
async def trends(req: TrendReq, request: Request):
    check_limits(request, 2)
    p = f"Suggest {req.count} trending topics for a {req.niche} account. For each: topic, why trending, content angle, best format, growth score/10."
    return {"topics": await call_ai(p)}

class HashReq(BaseModel): topic: str; niche: str = "general"; platform: str = "instagram"
@app.post("/generate-hashtags")
async def gen_hashtags(req: HashReq, request: Request):
    check_limits(request, 1)
    c = HC.get(req.niche, HC["general"])
    b = random.sample(c["b"], min(5, len(c["b"])))
    m = random.sample(c["m"], min(5, len(c["m"])))
    n = random.sample(c["n"], min(3, len(c["n"])))
    try:
        a = await call_ai(f"Generate 5 hashtags about '{req.topic}' for {req.platform}. Return only hashtags separated by commas.")
        ai = [x.strip() for x in a.split(",") if x.strip().startswith("#")]
    except:
        ai = ["#" + req.topic.replace(" ", "")]
    total = b + m + n + ai[:5]
    random.shuffle(total)
    return {"hashtags":total,"breakdown":{"broad":b,"medium":m,"niche":n,"topic_specific":ai[:5]},"tip":f"Mix {len(b)} broad + {len(m)} medium + {len(n)} niche for best reach"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("TOOLS_PORT", 8010))
    print(f"Tools API: Groq {AI_MODEL}, {DAILY_LIMIT}/day/IP, {RATE_LIMIT_MAX}/min/IP")
    uvicorn.run(app, host="127.0.0.1", port=port)
