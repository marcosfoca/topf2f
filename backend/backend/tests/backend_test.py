"""Backend tests for TOP F2F MVP."""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://fund-crew.preview.emergentagent.com').rstrip('/')
TOKEN = os.environ.get('TEST_SESSION_TOKEN', 'test_session_1778522227014')
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Health ----------
def test_root(s):
    r = s.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("ok") is True


# ---------- Auth ----------
def test_auth_me_no_token(s):
    r = requests.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_auth_me_with_token(s):
    r = s.get(f"{BASE_URL}/api/auth/me", headers=AUTH)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["email"] == "admin@test.com"


# ---------- Leads ----------
def test_leads_list_requires_auth(s):
    r = requests.get(f"{BASE_URL}/api/leads")
    assert r.status_code == 401


def test_create_lead_consent_false(s):
    payload = {"name": "X", "age": 22, "phone": "600000000", "city": "Madrid",
               "availability": "manana", "has_documentation": True, "consent": False}
    r = s.post(f"{BASE_URL}/api/leads", json=payload)
    assert r.status_code == 400


@pytest.fixture(scope="module")
def created_lead(s):
    payload = {"name": "TEST_Hot Lead", "age": 25, "phone": "600111222", "city": "Madrid",
               "availability": "tarde", "has_documentation": True, "consent": True}
    r = s.post(f"{BASE_URL}/api/leads", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "Nuevo"
    assert d["temperature"] == "hot"
    assert "lead_id" in d
    return d


def test_lead_created_and_persisted(s, created_lead):
    r = s.get(f"{BASE_URL}/api/leads/{created_lead['lead_id']}", headers=AUTH)
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_Hot Lead"


def test_list_leads_with_auth(s):
    r = s.get(f"{BASE_URL}/api/leads", headers=AUTH)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ---------- Offices ----------
def test_list_offices_seeded(s):
    r = s.get(f"{BASE_URL}/api/offices", headers=AUTH)
    assert r.status_code == 200
    offices = r.json()
    assert any(o["name"] == "Madrid Centro" for o in offices)


@pytest.fixture(scope="module")
def created_office(s):
    r = s.post(f"{BASE_URL}/api/offices", json={"name": "TEST_Office", "address": "Calle X 1", "city": "Madrid", "hiring_open": True}, headers=AUTH)
    assert r.status_code == 200, r.text
    return r.json()


def test_office_patch_toggle(s, created_office):
    r = s.patch(f"{BASE_URL}/api/offices/{created_office['office_id']}", json={"hiring_open": False}, headers=AUTH)
    assert r.status_code == 200
    assert r.json()["hiring_open"] is False


def test_office_delete(s):
    # create then delete
    r = s.post(f"{BASE_URL}/api/offices", json={"name": "TEST_DelOffice", "address": "Y 1", "city": "Madrid"}, headers=AUTH)
    oid = r.json()["office_id"]
    r2 = s.delete(f"{BASE_URL}/api/offices/{oid}", headers=AUTH)
    assert r2.status_code == 200


# ---------- Appointments ----------
def _madrid_office_id(s):
    r = s.get(f"{BASE_URL}/api/offices", headers=AUTH)
    for o in r.json():
        if o["name"] == "Madrid Centro":
            return o["office_id"]
    return r.json()[0]["office_id"]


def test_appointment_rejects_less_than_12h(s, created_lead):
    oid = _madrid_office_id(s)
    when = (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat()
    r = s.post(f"{BASE_URL}/api/appointments",
               json={"office_id": oid, "scheduled_at": when, "hot_count": 1},
               headers=AUTH)
    assert r.status_code == 400


def test_appointment_rejects_zero_distribution(s):
    oid = _madrid_office_id(s)
    when = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    r = s.post(f"{BASE_URL}/api/appointments",
               json={"office_id": oid, "scheduled_at": when, "hot_count": 0, "warm_count": 0, "cold_count": 0},
               headers=AUTH)
    assert r.status_code == 400


def test_appointment_rejects_invalid_office(s):
    when = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    r = s.post(f"{BASE_URL}/api/appointments",
               json={"office_id": "office_invalid", "scheduled_at": when, "hot_count": 1},
               headers=AUTH)
    assert r.status_code == 404


@pytest.fixture(scope="module")
def created_appointment(s, created_lead):
    oid = _madrid_office_id(s)
    when = (datetime.now(timezone.utc) + timedelta(hours=20)).isoformat()
    r = s.post(f"{BASE_URL}/api/appointments",
               json={"office_id": oid, "scheduled_at": when, "hot_count": 1},
               headers=AUTH)
    assert r.status_code == 200, r.text
    return r.json()


def test_appointment_creation_marks_lead_citado(s, created_appointment, created_lead):
    r = s.get(f"{BASE_URL}/api/leads/{created_lead['lead_id']}", headers=AUTH)
    assert r.json()["status"] == "Citado"


def test_automation_logs_created(s, created_appointment):
    r = s.get(f"{BASE_URL}/api/automation/logs?appointment_id={created_appointment['appointment_id']}", headers=AUTH)
    assert r.status_code == 200
    logs = r.json()
    kinds = {l["kind"] for l in logs}
    assert {"initial", "reminder_24h", "reminder_2h"}.issubset(kinds)


def test_cancel_appointment(s, created_appointment, created_lead):
    r = s.post(f"{BASE_URL}/api/appointments/{created_appointment['appointment_id']}/cancel", headers=AUTH)
    assert r.status_code == 200
    rl = s.get(f"{BASE_URL}/api/leads/{created_lead['lead_id']}", headers=AUTH)
    assert rl.json()["status"] == "Pendiente"


def test_reactivate_appointment(s, created_appointment, created_lead):
    r = s.post(f"{BASE_URL}/api/appointments/{created_appointment['appointment_id']}/reactivate", headers=AUTH)
    assert r.status_code == 200
    rl = s.get(f"{BASE_URL}/api/leads/{created_lead['lead_id']}", headers=AUTH)
    assert rl.json()["status"] == "Citado"


# ---------- Dashboard ----------
def test_dashboard_stats(s):
    r = s.get(f"{BASE_URL}/api/dashboard/stats", headers=AUTH)
    assert r.status_code == 200
    d = r.json()
    for k in ("total_leads", "hot", "warm", "cold", "pendientes", "offices", "leads_citados_today", "upcoming_appointments"):
        assert k in d
