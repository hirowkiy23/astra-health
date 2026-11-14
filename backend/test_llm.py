from main import build_response, enforce_triage_safety, extract_json

RED = {'level': 'red', 'requires_human_support': True, 'reason': 'Emergency rule', 'rule_id': 'DEMO-EMERGENCY-01', 'validated': False}
DRAFT = '{"message":"Background information from NASA HRP is available.","warning_signs":["Worsening symptoms"],"recommended_actions":["Follow the mission medical procedure."],"requires_human_support":false}'


def test_extract_json_handles_fenced_payload():
    parsed = extract_json('```json\n' + DRAFT + '\n```')
    assert parsed is not None
    assert parsed['message'].startswith('Background information')


def test_extract_json_handles_prose_around_payload():
    parsed = extract_json('Here is the result:\n' + DRAFT)
    assert parsed is not None
    assert parsed['requires_human_support'] is False


def test_extract_json_rejects_non_json():
    assert extract_json('I cannot help with that.') is None


def test_llm_draft_is_upgraded_to_required_escalation():
    draft = extract_json(DRAFT)
    assert draft is not None
    result = enforce_triage_safety(draft, RED)
    assert result['requires_human_support'] is True
    assert 'human medical support' in result['message'].lower()
    assert result['recommended_actions'][0].startswith('Activate the applicable')


def test_yellow_escalation_does_not_inject_emergency_procedure():
    draft = {'message': 'Worth reviewing.', 'recommended_actions': ['Sit down.'], 'warning_signs': ['Worsening'], 'requires_human_support': False}
    result = enforce_triage_safety(draft, {'level': 'yellow', 'requires_human_support': True})
    assert result['requires_human_support'] is True
    assert 'human medical support' in result['message'].lower()
    assert not any('emergency procedure' in a.lower() for a in result['recommended_actions'])


def test_malformed_llm_output_falls_back_to_deterministic_response():
    fallback = build_response('dizzy', {'level': 'yellow', 'requires_human_support': True}, [])
    draft = extract_json('not json') or fallback
    result = enforce_triage_safety(draft, {'level': 'yellow', 'requires_human_support': True})
    assert result['message'] == fallback['message']
