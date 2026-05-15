from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import asyncio
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ----------------- WhatsApp constants -----------------
PHONE_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
TOKEN    = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
API_V    = os.environ.get("WHATSAPP_API_VERSION", "v22.0")
LANG     = os.environ.get("WHATSAPP_DEFAULT_LANG", "es")
WA_URL   = f"https://graph.facebook.com/{API_V}/{PHONE_ID}/messages"

# ----------------- Helpers -----------------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()

def parse_iso(s: str) -> datetime:
    dt = datetime.fromisoformat(s.replace('Z', '+00:00')) if isinstance(s, str) else s
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt

def temperature_of(created_at_iso: str) -> str:
    created = parse_iso(created_at_iso)
    delta = now_utc() - created
    if delta < timedelta(hours=24):
        return "hot"
    if delta < timedelta(days=7):
        return "warm"
    return "cold"

def admin_emails() -> List[str]:
    raw = os.environ.get("ADMIN_EMAILS", "").strip()
    if not raw:
        return []
    return [e.strip().lower() for e in raw.split(",") if e.strip()]

# ----------------- WhatsApp senders -----------------
async def send_whatsapp_template(phone: str, template: str, variables: list):
    payload = {
        "messaging_product": "whatsapp",
        "to": phone.lstrip("+"),
        "type": "template",
        "template": {
            "name": template,
            "language": {"code": LANG},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": str(v)} for v in variables],
            }] if variables else [],
        },
    }
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(WA_URL, headers={"Authorization": f"Bearer {TOKEN}"}, json=payload)
        return r.status_code, r.json()

async def send_whatsapp_free_message(phone: str, text: str):
    payload = {
        "messaging_product": "whatsapp",
        "to": phone.lstrip("+"),
        "type": "text",
        "text": {"body": text}
    }
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(WA_URL, headers={"Authorization": f"Bearer {TOKEN}"}, json=payload)
        return r.status_code, r.json()

# ----------------- Models -----------------
class LeadCreate(BaseModel):
    name: str
    age: int
    phone: str
    city: str
    time_preference: str              # "mañanas" | "tardes" | "indiferente"
    id_doc_type: str                  # "DNI" | "NIE" | "AMBAS"
    availability: Optional[str] = None  # kept for backward compatibility
    id_document_type: Optional[str] = None  # kept for backward compatibility
    has_documentation: Optional[bool] = None
    likes_public: bool = True
    is_social: bool = True
    wants_flexible: bool = True
    consent: bool

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    office_id: Optional[str] = None

class OfficeCreate(BaseModel):
    name: str
    address: str
    city: str
    maps_url: Optional[str] = None
    hiring_open: bool = True

class OfficeUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    maps_url: Optional[str] = None
    hiring_open: Optional[bool] = None

class AppointmentCreate(BaseModel):
    office_id: str
    scheduled_at: str           # ISO datetime
    age_min: int
    age_max: int
    doc_type_filter: str        # "DNI" | "NIE" | "AMBAS"
    num_leads_requested: int

# ----------------- Auth -----------------
async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = parse_iso(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now_utc():
        raise HTTPException(status_code=401, detail="Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    whitelist = admin_emails()
    if whitelist and user.get("email", "").lower() not in whitelist:
        raise HTTPException(status_code=403, detail="No autorizado")
    return user

@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    async with httpx.AsyncClient(timeout=15.0) as hclient:
        r = await hclient.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session_id")
    data = r.json()
    email = data["email"].lower()
    whitelist = admin_emails()
    if whitelist and email not in whitelist:
        raise HTTPException(status_code=403, detail="Email no autorizado")

    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name"), "picture": data.get("picture")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "created_at": iso(now_utc()),
        })

    session_token = data["session_token"]
    expires_at = now_utc() + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": iso(expires_at),
        "created_at": iso(now_utc()),
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none",
    )
    return {
        "user_id": user_id,
        "email": email,
        "name": data.get("name"),
        "picture": data.get("picture"),
    }

@api_router.get("/auth/me")
async def auth_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user.get("name"),
        "picture": user.get("picture"),
    }

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ----------------- Leads (public submit + admin read) -----------------
@api_router.post("/leads")
async def create_lead(payload: LeadCreate):
    if not payload.consent:
        raise HTTPException(status_code=400, detail="Consentimiento requerido")
    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    doc = {
        "lead_id": lead_id,
        "name": payload.name.strip(),
        "age": payload.age,
        "phone": payload.phone.strip(),
        "city": payload.city.strip(),
        "time_preference": payload.time_preference,
        "id_doc_type": payload.id_doc_type,
        # backward-compat aliases
        "availability": payload.availability or payload.time_preference,
        "id_document_type": payload.id_doc_type,
        "has_documentation": payload.id_doc_type in ("DNI", "NIE"),
        "likes_public": payload.likes_public,
        "is_social": payload.is_social,
        "wants_flexible": payload.wants_flexible,
        "consent": payload.consent,
        "status": "Pendiente",
        "verified": False,
        "verified_at": None,
        "welcome_msg_id": None,
        "office_id": None,
        "appointment_id": None,
        "notes": "",
        "created_at": iso(now_utc()),
    }
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    doc["temperature"] = temperature_of(doc["created_at"])

    try:
        code, resp = await send_whatsapp_template(
            doc["phone"],
            "top_f2f_bienvenida",
            [doc["name"], str(doc["age"]), doc["city"], doc["time_preference"]],
        )
        wa_msg_id = (resp.get("messages") or [{}])[0].get("id")
        await db.leads.update_one(
            {"lead_id": lead_id},
            {"$set": {"welcome_msg_id": wa_msg_id}},
        )
        doc["welcome_msg_id"] = wa_msg_id
        logger.info(f"WhatsApp bienvenida enviado a {doc['phone']} (status={code})")
    except Exception as e:
        logger.error(f"Error enviando bienvenida WhatsApp: {e}")

    return doc

@api_router.get("/leads/count-available")
async def count_available_leads(age_min: int, age_max: int, doc_type: str):
    query = {
        "status": "Pendiente",
        "verified": True,
        "age": {"$gte": age_min, "$lte": age_max},
        "consent": True,
    }
    if doc_type == "DNI":
        query["id_doc_type"] = "DNI"
    elif doc_type == "NIE":
        query["id_doc_type"] = "NIE"
    count = await db.leads.count_documents(query)
    return {"count": count}

@api_router.get("/leads")
async def list_leads(
    temperature: Optional[str] = None,
    status: Optional[str] = None,
    city: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user),
):
    query = {}
    if status:
        query["status"] = status
    if city:
        query["city"] = city
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for l in leads:
        l["temperature"] = temperature_of(l["created_at"])
    if temperature:
        leads = [l for l in leads if l["temperature"] == temperature]
    return leads

@api_router.get("/leads/{lead_id}")
async def get_lead(lead_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    lead["temperature"] = temperature_of(lead["created_at"])
    return lead

@api_router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, payload: LeadUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = await db.leads.update_one({"lead_id": lead_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    lead["temperature"] = temperature_of(lead["created_at"])
    return lead

# ----------------- Offices -----------------
@api_router.get("/offices")
async def list_offices(user: Dict[str, Any] = Depends(get_current_user)):
    return await db.offices.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

@api_router.post("/offices")
async def create_office(payload: OfficeCreate, user: Dict[str, Any] = Depends(get_current_user)):
    office_id = f"office_{uuid.uuid4().hex[:12]}"
    doc = {
        "office_id": office_id,
        "name": payload.name,
        "address": payload.address,
        "city": payload.city,
        "maps_url": payload.maps_url or "",
        "hiring_open": payload.hiring_open,
        "created_at": iso(now_utc()),
    }
    await db.offices.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.patch("/offices/{office_id}")
async def update_office(office_id: str, payload: OfficeUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nada que actualizar")
    res = await db.offices.update_one({"office_id": office_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")
    return await db.offices.find_one({"office_id": office_id}, {"_id": 0})

@api_router.delete("/offices/{office_id}")
async def delete_office(office_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    res = await db.offices.delete_one({"office_id": office_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")
    return {"ok": True}

# ----------------- Appointments / Citaciones -----------------
async def queue_whatsapp_events(appointment_id: str, lead_ids: List[str], scheduled_at: str):
    scheduled_dt = parse_iso(scheduled_at)
    now_iso = iso(now_utc())
    events = []
    for lead_id in lead_ids:
        events.append({
            "log_id": f"log_{uuid.uuid4().hex[:12]}",
            "appointment_id": appointment_id,
            "lead_id": lead_id,
            "kind": "citacion_24h",
            "scheduled_for": iso(scheduled_dt - timedelta(hours=24)),
            "status": "queued",
            "channel": "whatsapp",
            "created_at": now_iso,
        })
        events.append({
            "log_id": f"log_{uuid.uuid4().hex[:12]}",
            "appointment_id": appointment_id,
            "lead_id": lead_id,
            "kind": "recordatorio_2h",
            "scheduled_for": iso(scheduled_dt - timedelta(hours=2)),
            "status": "queued",
            "channel": "whatsapp",
            "created_at": now_iso,
        })
    if events:
        await db.automation_logs.insert_many(events)

# kept for backward compatibility — new code uses queue_whatsapp_events
async def queue_automation(appointment_id: str, lead_ids: List[str], scheduled_at: datetime):
    await queue_whatsapp_events(appointment_id, lead_ids, iso(scheduled_at))

@api_router.post("/appointments")
async def create_appointment(payload: AppointmentCreate, user: Dict[str, Any] = Depends(get_current_user)):
    office = await db.offices.find_one({"office_id": payload.office_id}, {"_id": 0})
    if not office:
        raise HTTPException(status_code=404, detail="Oficina no encontrada")
    scheduled = parse_iso(payload.scheduled_at)
    if scheduled - now_utc() < timedelta(hours=12):
        raise HTTPException(status_code=400, detail="La citación debe tener mínimo 12h de antelación")
    if payload.num_leads_requested <= 0:
        raise HTTPException(status_code=400, detail="Selecciona al menos un lead")

    # Build filter query
    query: Dict[str, Any] = {
        "status": "Pendiente",
        "verified": True,
        "age": {"$gte": payload.age_min, "$lte": payload.age_max},
        "consent": True,
    }
    if payload.doc_type_filter == "DNI":
        query["id_doc_type"] = "DNI"
    elif payload.doc_type_filter == "NIE":
        query["id_doc_type"] = "NIE"
    # AMBAS → no doc_type filter

    selected = await db.leads.find(query, {"_id": 0}).limit(payload.num_leads_requested).to_list(payload.num_leads_requested)
    if not selected:
        raise HTTPException(status_code=400, detail="No hay leads verificados que cumplan los filtros")

    appointment_id = f"appt_{uuid.uuid4().hex[:12]}"
    selected_ids = [l["lead_id"] for l in selected]

    doc = {
        "appointment_id": appointment_id,
        "office_id": payload.office_id,
        "office_name": office["name"],
        "office_address": office["address"],
        "office_city": office["city"],
        "office_maps_url": office.get("maps_url", ""),
        "scheduled_at": iso(scheduled),
        "age_min": payload.age_min,
        "age_max": payload.age_max,
        "doc_type_filter": payload.doc_type_filter,
        "num_leads_requested": payload.num_leads_requested,
        "lead_ids": selected_ids,
        "status": "active",
        "created_at": iso(now_utc()),
    }
    await db.appointments.insert_one(doc)
    await db.leads.update_many(
        {"lead_id": {"$in": selected_ids}},
        {"$set": {"status": "Citado", "office_id": payload.office_id, "appointment_id": appointment_id}},
    )
    await queue_whatsapp_events(appointment_id, selected_ids, iso(scheduled))
    doc.pop("_id", None)
    return doc

@api_router.get("/appointments")
async def list_appointments(user: Dict[str, Any] = Depends(get_current_user)):
    items = await db.appointments.find({}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    return items

@api_router.get("/appointments/{appointment_id}")
async def get_appointment(appointment_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    appt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Citación no encontrada")
    leads = await db.leads.find({"lead_id": {"$in": appt["lead_ids"]}}, {"_id": 0}).to_list(500)
    for l in leads:
        l["temperature"] = temperature_of(l["created_at"])
    appt["leads"] = leads
    return appt

@api_router.post("/appointments/{appointment_id}/cancel")
async def cancel_appointment(appointment_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    appt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Citación no encontrada")
    await db.appointments.update_one({"appointment_id": appointment_id}, {"$set": {"status": "cancelled"}})
    await db.leads.update_many(
        {"lead_id": {"$in": appt["lead_ids"]}, "appointment_id": appointment_id},
        {"$set": {"status": "Pendiente", "appointment_id": None}},
    )
    await db.automation_logs.update_many(
        {"appointment_id": appointment_id, "status": "queued"},
        {"$set": {"status": "cancelled"}},
    )
    return {"ok": True}

@api_router.post("/appointments/{appointment_id}/reactivate")
async def reactivate_appointment(appointment_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    appt = await db.appointments.find_one({"appointment_id": appointment_id}, {"_id": 0})
    if not appt:
        raise HTTPException(status_code=404, detail="Citación no encontrada")
    scheduled = parse_iso(appt["scheduled_at"])
    if scheduled - now_utc() < timedelta(hours=12):
        raise HTTPException(status_code=400, detail="No se puede reactivar: queda menos de 12h")
    await db.appointments.update_one({"appointment_id": appointment_id}, {"$set": {"status": "active"}})
    await db.leads.update_many(
        {"lead_id": {"$in": appt["lead_ids"]}},
        {"$set": {"status": "Citado", "appointment_id": appointment_id, "office_id": appt["office_id"]}},
    )
    await db.automation_logs.update_many(
        {"appointment_id": appointment_id, "status": "cancelled"},
        {"$set": {"status": "queued"}},
    )
    return {"ok": True}

# ----------------- WhatsApp Webhooks -----------------
@api_router.get("/webhooks/whatsapp")
async def wa_verify(request: Request):
    mode      = request.query_params.get("hub.mode")
    token     = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    if mode == "subscribe" and token == os.environ.get("WHATSAPP_VERIFY_TOKEN"):
        return PlainTextResponse(challenge)
    raise HTTPException(status_code=403)

@api_router.post("/webhooks/whatsapp")
async def wa_webhook(request: Request):
    data = await request.json()
    now_iso = iso(now_utc())

    for entry in data.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})

            for st in value.get("statuses", []):
                await db.automation_logs.update_one(
                    {"provider_message_id": st["id"]},
                    {"$set": {"status": st["status"], "last_status_at": now_iso}},
                )

            for msg in value.get("messages", []):
                if msg.get("type") != "text":
                    continue
                phone = "+" + msg["from"]
                text  = (msg.get("text") or {}).get("body", "").strip().lower()
                lead  = await db.leads.find_one({"phone": phone}, {"_id": 0})
                if not lead:
                    continue

                if not lead.get("verified"):
                    if text.startswith("si"):
                        await db.leads.update_one(
                            {"lead_id": lead["lead_id"]},
                            {"$set": {"verified": True, "verified_at": now_iso}},
                        )
                elif lead.get("status") == "Citado":
                    if text.startswith("si"):
                        await db.leads.update_one(
                            {"lead_id": lead["lead_id"]}, {"$set": {"status": "Confirmado"}}
                        )
                    elif text.startswith("no"):
                        await db.leads.update_one(
                            {"lead_id": lead["lead_id"]}, {"$set": {"status": "No asistirá"}}
                        )

                await db.lead_messages.insert_one({
                    "msg_id": f"wam_{uuid.uuid4().hex[:12]}",
                    "lead_id": lead["lead_id"],
                    "direction": "in",
                    "text": text,
                    "received_at": now_iso,
                })

    return {"ok": True}

# ----------------- Dashboard -----------------
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: Dict[str, Any] = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0, "created_at": 1, "status": 1}).to_list(10000)
    hot = warm = cold = 0
    pendientes = 0
    for l in leads:
        t = temperature_of(l["created_at"])
        if t == "hot": hot += 1
        elif t == "warm": warm += 1
        else: cold += 1
        if l.get("status") in ("Nuevo", "Pendiente"):
            pendientes += 1
    offices = await db.offices.count_documents({})
    offices_open = await db.offices.count_documents({"hiring_open": True})
    today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    appts_today = await db.appointments.find(
        {"scheduled_at": {"$gte": iso(today_start), "$lt": iso(today_end)}, "status": "active"},
        {"_id": 0},
    ).to_list(500)
    leads_today = sum(len(a.get("lead_ids", [])) for a in appts_today)
    upcoming = await db.appointments.find(
        {"scheduled_at": {"$gte": iso(now_utc())}, "status": "active"}, {"_id": 0}
    ).sort("scheduled_at", 1).limit(5).to_list(5)
    return {
        "total_leads": len(leads),
        "hot": hot,
        "warm": warm,
        "cold": cold,
        "pendientes": pendientes,
        "offices": offices,
        "offices_open": offices_open,
        "leads_citados_today": leads_today,
        "appointments_today": len(appts_today),
        "upcoming_appointments": upcoming,
    }

# ----------------- Automation Logs -----------------
@api_router.get("/automation/logs")
async def automation_logs(appointment_id: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    q = {}
    if appointment_id:
        q["appointment_id"] = appointment_id
    return await db.automation_logs.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

# ----------------- Health -----------------
@api_router.get("/")
async def root():
    return {"app": "TOP F2F", "ok": True}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- WhatsApp dispatcher -----------------
async def whatsapp_dispatcher():
    logger.info("WhatsApp dispatcher started")
    while True:
        try:
            now_iso = iso(now_utc())
            cursor = db.automation_logs.find({
                "status": "queued",
                "scheduled_for": {"$lte": now_iso},
                "channel": "whatsapp",
            }).limit(50)

            async for ev in cursor:
                try:
                    lead = await db.leads.find_one({"lead_id": ev["lead_id"]}, {"_id": 0})
                    appt = await db.appointments.find_one({"appointment_id": ev["appointment_id"]}, {"_id": 0})

                    if not lead or not appt or appt.get("status") != "active":
                        await db.automation_logs.update_one(
                            {"log_id": ev["log_id"]}, {"$set": {"status": "cancelled"}}
                        )
                        continue

                    hora = parse_iso(appt["scheduled_at"]).strftime("%H:%M")

                    if ev["kind"] == "citacion_24h":
                        await send_whatsapp_template(lead["phone"], "top_f2f_citacion_a", [hora])
                        await asyncio.sleep(2)
                        await send_whatsapp_template(lead["phone"], "top_f2f_citacion_b", [
                            appt.get("office_address", ""),
                            appt.get("office_city", ""),
                            appt.get("office_maps_url", ""),
                        ])
                        await db.automation_logs.update_one(
                            {"log_id": ev["log_id"]},
                            {"$set": {"status": "sent", "sent_at": iso(now_utc())}},
                        )

                    elif ev["kind"] == "recordatorio_2h":
                        if lead.get("status") != "Confirmado":
                            await db.automation_logs.update_one(
                                {"log_id": ev["log_id"]}, {"$set": {"status": "skipped"}}
                            )
                            continue
                        await send_whatsapp_template(lead["phone"], "top_f2f_recordatorio_2h", [])
                        await db.automation_logs.update_one(
                            {"log_id": ev["log_id"]},
                            {"$set": {"status": "sent", "sent_at": iso(now_utc())}},
                        )

                except Exception as e:
                    logger.exception(f"Error en evento {ev.get('log_id')}: {e}")
                    await db.automation_logs.update_one(
                        {"log_id": ev["log_id"]}, {"$set": {"status": "failed", "error": str(e)}}
                    )

        except Exception as e:
            logger.exception(f"Error en dispatcher: {e}")

        await asyncio.sleep(60)

# ----------------- Startup / Shutdown -----------------
@app.on_event("startup")
async def start_dispatcher():
    asyncio.create_task(whatsapp_dispatcher())

@app.on_event("startup")
async def seed_initial_data():
    existing = await db.offices.find_one({"address": "Calle Hortaleza 20, 1º Izquierda, 28002"})
    if not existing:
        await db.offices.insert_one({
            "office_id": f"office_{uuid.uuid4().hex[:12]}",
            "name": "Madrid Centro",
            "address": "Calle Hortaleza 20, 1º Izquierda, 28002",
            "city": "Madrid",
            "maps_url": "",
            "hiring_open": True,
            "created_at": iso(now_utc()),
        })
        logger.info("Seeded initial office: Madrid Centro")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
