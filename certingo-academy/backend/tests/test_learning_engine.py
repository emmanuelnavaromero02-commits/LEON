from app.services.academy.learning_engine import MasteryEngine

def test_mastery_calculation_increase():
    engine = MasteryEngine()
    score = 0.5
    new_score = engine.calculate_new_score(score, True, "medium")
    assert new_score > score
    assert new_score == 0.6

def test_mastery_calculation_decrease():
    engine = MasteryEngine()
    score = 0.5
    new_score = engine.calculate_new_score(score, False, "easy")
    assert new_score < score
    # 0.5 - (0.05 * 1.5) = 0.5 - 0.075 = 0.425
    assert new_score == 0.425

def test_mastery_bounds():
    engine = MasteryEngine()
    assert engine.calculate_new_score(0.98, True, "hard") == 1.0
    assert engine.calculate_new_score(0.02, False, "hard") == 0.0
