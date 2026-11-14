from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_dashboard_returns_synthetic_profile_and_readings():
    response = client.get('/api/health/summary')
    assert response.status_code == 200
    body = response.json()
    assert body['astronaut']['name'] == 'Alex Morgan'
    assert body['astronaut']['mission'] == 'ARES-01'
    assert body['simulated'] is True
    assert body['vitals']['heart_rate'] == 68


def test_emergency_symptom_produces_immediate_red_triage_and_incident(tmp_path, monkeypatch):
    monkeypatch.setenv('ASTRA_DATA_DIR', str(tmp_path))
    response = client.post('/api/consultation/message', json={
        'astronaut_id': 'demo-001', 'message': 'I have severe chest pain and trouble breathing'
    })
    assert response.status_code == 200
    body = response.json()
    assert body['triage']['level'] == 'red'
    assert body['triage']['requires_human_support'] is True
    assert 'emergency' in body['triage']['reason'].lower()
    assert 'LLM' not in body['response']['message']
    assert body['references'][0]['title']
    incident = client.get('/api/incidents/' + body['incident_id'])
    assert incident.status_code == 200
    assert incident.json()['severity'] == 'red'


def test_ambiguous_dizziness_is_yellow_with_source_and_followup(tmp_path, monkeypatch):
    monkeypatch.setenv('ASTRA_DATA_DIR', str(tmp_path))
    response = client.post('/api/consultation/message', json={
        'astronaut_id': 'demo-001', 'message': 'I feel dizzy after the gravity transition'
    })
    body = response.json()
    assert response.status_code == 200
    assert body['triage']['level'] == 'yellow'
    assert body['response']['recommended_actions']
    assert body['response']['warning_signs']
    assert body['references']
    assert body['response']['mode'] == 'deterministic_demo'
    assert 'illustrative' in body['triage']['reason'].lower()


def test_no_matching_reference_is_transparent(tmp_path, monkeypatch):
    monkeypatch.setenv('ASTRA_DATA_DIR', str(tmp_path))
    response = client.post('/api/consultation/message', json={
        'astronaut_id': 'demo-001', 'message': 'Can we play chess tomorrow?'
    })
    body = response.json()
    assert response.status_code == 200
    assert body['references'] == []
    assert 'no matching reference' in body['response']['message'].lower()
    assert body['triage']['level'] == 'green'


def test_incidents_empty_initially(tmp_path, monkeypatch):
    monkeypatch.setenv('ASTRA_DATA_DIR', str(tmp_path))
    assert client.get('/api/incidents').json() == []
