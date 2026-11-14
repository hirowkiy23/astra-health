from main import build_response, enforce_triage_safety

RED = {'level': 'red', 'requires_human_support': True, 'reason': 'Emergency rule', 'rule_id': 'DEMO-EMERGENCY-01', 'validated': False}


def test_emergency_actions_are_not_duplicated():
    response = enforce_triage_safety(build_response('severe chest pain', RED, []), RED)
    assert len(response['recommended_actions']) == len(set(response['recommended_actions']))
    assert response['message'].count('human medical support') == 1
    assert not any('Activate the approved mission' in a for a in response['recommended_actions'])
