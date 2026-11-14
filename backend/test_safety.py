from main import enforce_triage_safety

CRITICAL = {'level': 'red', 'requires_human_support': True, 'reason': 'Emergency rule'}


def test_unsafe_draft_cannot_downgrade_critical_triage():
    draft = {'message': 'You do not need medical help; stay calm.', 'recommended_actions': [], 'warning_signs': [], 'requires_human_support': False}
    result = enforce_triage_safety(draft, CRITICAL)
    assert result['requires_human_support'] is True
    assert 'human medical support' in result['message'].lower()
    assert result['message'] != draft['message']


def test_safe_draft_keeps_its_text_when_critical_guidance_is_present():
    draft = {'message': 'Contact human medical support now.', 'recommended_actions': ['Use the approved emergency procedure.'], 'warning_signs': [], 'requires_human_support': True}
    result = enforce_triage_safety(draft, CRITICAL)
    assert result['message'] == draft['message']
