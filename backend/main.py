import os
import re
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title='ASTRA API', description='Astronaut medical decision-support prototype', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=['http://localhost:3000', 'http://127.0.0.1:3000'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

PROFILE = {'id': 'demo-001', 'name': 'Alex Morgan', 'role': 'Mission specialist', 'mission': 'ARES-01', 'mission_day': 127, 'allergies': ['None reported (fictional)'], 'medical_history': 'No relevant history recorded in this fictional profile.', 'baseline': 'Heart rate 64–72 bpm · SpO₂ 97–100%'}
VITALS = {'heart_rate': 68, 'spo2': 98, 'temperature': 36.7, 'blood_pressure': '118/76', 'recorded_at': '2026-06-21T08:14:00Z'}
REFERENCES = [
    {'id': 'nasa-vestibular', 'title': 'Risk of Altered Sensorimotor and Vestibular Function', 'section': 'Risks Involving Human Physiology', 'source': 'NASA Human Research Program', 'url': 'https://www.nasa.gov/hrp/risks/', 'text': 'Astronauts can experience motion sickness, issues with hand-eye or gait coordination, and dizziness during gravitational changes. Research seeks to help astronauts recover faster from these changes.', 'keywords': ['dizzy', 'dizziness', 'gravity', 'balance', 'coordination', 'vestibular', 'motion sickness']},
    {'id': 'nasa-cardiovascular', 'title': 'Risk of Cardiovascular Adaptations', 'section': 'Risks Involving Human Physiology', 'source': 'NASA Human Research Program', 'url': 'https://www.nasa.gov/hrp/risks/', 'text': 'Weightlessness alters blood circulation and how the heart and blood vessels function, potentially increasing the risk of cardiovascular events.', 'keywords': ['chest', 'heart', 'cardiovascular', 'circulation', 'blood pressure']},
    {'id': 'nasa-hypoxia', 'title': 'Risk of Hypoxia', 'section': 'Risks Involving Human Physiology', 'source': 'NASA Human Research Program', 'url': 'https://www.nasa.gov/hrp/risks/', 'text': 'Mild hypoxia occurs when oxygen levels in body tissues become lower than normal. This is relevant to deep-space mission planning and spacewalk preparation.', 'keywords': ['breathing', 'breath', 'oxygen', 'hypoxia', 'spo2', 'shortness']},
    {'id': 'nasa-sleep', 'title': 'Risk of Inadequate Sleep and Irregular Schedules', 'section': 'Behavioral Performance and Human Factors', 'source': 'NASA Human Research Program', 'url': 'https://www.nasa.gov/hrp/risks/', 'text': 'Space crews may experience chronic sleep loss, constant work demands, and irregularities in their internal biological clocks.', 'keywords': ['sleep', 'tired', 'fatigue', 'circadian', 'schedule']},
]

class MessageRequest(BaseModel):
    astronaut_id: str = 'demo-001'
    message: str = Field(min_length=1, max_length=4000)
    consultation_id: str | None = None

class MedicalResponse(BaseModel):
    message: str
    warning_signs: list[str]
    recommended_actions: list[str]
    requires_human_support: bool
    mode: Literal['deterministic_demo', 'llm_grounded'] = 'deterministic_demo'


def retrieve(message: str) -> list[dict]:
    text = message.lower()
    matches = [r for r in REFERENCES if any(k in text for k in r['keywords'])]
    if not matches:
        return []
    return [{k: v for k, v in r.items() if k != 'keywords'} for r in matches[:2]]


def triage(message: str, vitals: dict) -> dict:
    text = message.lower()
    emergency = any(term in text for term in ['severe chest pain', 'trouble breathing', 'difficulty breathing', 'can\'t breathe', 'cannot breathe', 'unconscious', 'unresponsive', 'severe bleeding'])
    if emergency:
        return {'level': 'red', 'reason': 'Illustrative emergency symptom rule matched. Activate the approved mission emergency procedure and contact human medical support immediately.', 'requires_human_support': True, 'rule_id': 'DEMO-EMERGENCY-01', 'validated': False}
    if any(term in text for term in ['dizzy', 'dizziness', 'nausea', 'headache', 'faint', 'unsteady']):
        return {'level': 'yellow', 'reason': 'Illustrative symptom rule matched; further assessment is required. This is not a validated clinical triage result.', 'requires_human_support': True, 'rule_id': 'DEMO-SYMPTOM-01', 'validated': False}
    return {'level': 'green', 'reason': 'No illustrative escalation rule matched. This does not rule out a medical concern.', 'requires_human_support': False, 'rule_id': 'DEMO-DEFAULT-01', 'validated': False}


def build_response(message: str, level: dict, references: list[dict]) -> dict:
    if level['level'] == 'red':
        text = 'This concern matches ASTRA’s illustrative emergency rule. Activate the applicable approved mission emergency procedure and contact human medical support now. Do not wait for further AI assessment.'
        actions = ['Activate the approved mission emergency procedure.', 'Contact the crew medical officer or ground medical support immediately.', 'Use only approved protocols and available trained human assistance.']
    elif not references:
        text = 'I found no matching reference in the small demo knowledge base. I can’t provide a source-grounded medical explanation for this message. If this is a health concern, contact human medical support.'
        actions = ['Clarify the health concern or provide relevant symptoms.', 'Contact human medical support for assessment if needed.', 'Do not treat this demo response as medical advice.']
    elif level['level'] == 'yellow':
        text = 'Your report is relevant to changes in sensorimotor and vestibular function described by NASA. This research reference provides background, not a diagnosis or treatment protocol. Further assessment is needed.'
        actions = ['Follow the applicable approved mission medical procedure.', 'Contact human medical support for assessment.', 'Record when symptoms began and whether they are changing.']
    else:
        text = 'I found background information in the curated demo references. This is not a diagnosis. A human medical professional should interpret symptoms in the mission context.'
        actions = ['Review the cited background reference.', 'Use the applicable approved mission medical procedure.', 'Contact human medical support if you have symptoms or concerns.']
    return MedicalResponse(message=text, warning_signs=['Severe or worsening symptoms', 'New breathing difficulty, chest pain, confusion, fainting, or reduced responsiveness'], recommended_actions=actions, requires_human_support=level['requires_human_support']).model_dump()


def enforce_triage_safety(response: dict, level: dict) -> dict:
    """The deterministic result owns escalation; model text may never lower it."""
    if not level.get('requires_human_support'):
        return response
    safe = dict(response)
    safe['requires_human_support'] = True
    original = safe.get('message', '')
    safe['message'] = original if 'human medical support' in original.lower() else 'Contact human medical support now. ' + original
    actions = list(dict.fromkeys(safe.get('recommended_actions', [])))
    if 'Activate the applicable approved mission emergency procedure.' not in actions:
        actions.insert(0, 'Activate the applicable approved mission emergency procedure.')
    # Keep one procedural action when wording differs only by "applicable"/"approved".
    def normalize(action: str) -> str:
        return action.lower().replace('applicable ', '').replace('approved ', '').strip()
    deduped: list[str] = []
    seen: set[str] = set()
    for action in actions:
        key = normalize(action)
        if key not in seen:
            seen.add(key)
            deduped.append(action)
    safe['recommended_actions'] = deduped
    if not safe.get('warning_signs'):
        safe['warning_signs'] = ['Severe or worsening symptoms', 'New breathing difficulty, chest pain, confusion, fainting, or reduced responsiveness']
    return safe


def database():
    directory = Path(os.getenv('ASTRA_DATA_DIR', str(Path(__file__).parent / 'data')))
    directory.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(directory / 'astra.db')
    conn.row_factory = sqlite3.Row
    conn.execute('CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, consultation_id TEXT NOT NULL, astronaut_id TEXT NOT NULL, severity TEXT NOT NULL, symptoms TEXT NOT NULL, response TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL)')
    return conn


def save_incident(astronaut_id: str, consultation_id: str, message: str, level: dict, response: dict) -> str:
    incident_id = 'INC-' + uuid.uuid4().hex[:8].upper()
    with database() as conn:
        conn.execute('INSERT INTO incidents VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (incident_id, consultation_id, astronaut_id, level['level'], message, response['message'], 'open', datetime.now(timezone.utc).isoformat()))
    return incident_id


@app.get('/api/health')
def health_check():
    return {'status': 'operational', 'mode': 'local_demo', 'llm_connected': False}


@app.get('/api/health/summary')
def summary():
    return {'astronaut': PROFILE, 'vitals': VITALS, 'simulated': True}


@app.get('/api/astronaut/profile')
def profile():
    return PROFILE


@app.get('/api/health/vitals')
def vitals():
    return {**VITALS, 'simulated': True}


@app.post('/api/consultation/message')
def consultation(request: MessageRequest):
    if request.astronaut_id != PROFILE['id']:
        raise HTTPException(status_code=404, detail='Demo astronaut not found')
    message = re.sub(r'\s+', ' ', request.message).strip()
    documents = retrieve(message)
    level = triage(message, VITALS)
    response = build_response(message, level, documents)
    response = enforce_triage_safety(response, level)
    consultation_id = request.consultation_id or 'CON-' + uuid.uuid4().hex[:8].upper()
    incident_id = save_incident(request.astronaut_id, consultation_id, message, level, response)
    return {'response': response, 'triage': level, 'references': documents, 'incident_id': incident_id, 'consultation_id': consultation_id, 'simulated': True}


@app.get('/api/incidents')
def incidents():
    with database() as conn:
        rows = conn.execute('SELECT id, consultation_id, astronaut_id, severity, symptoms, status, created_at FROM incidents ORDER BY created_at DESC').fetchall()
    return [dict(row) for row in rows]


@app.get('/api/incidents/{incident_id}')
def incident(incident_id: str):
    with database() as conn:
        row = conn.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail='Incident not found')
    return dict(row)


@app.post('/api/triage/evaluate')
def evaluate(request: MessageRequest):
    return triage(request.message, VITALS)
