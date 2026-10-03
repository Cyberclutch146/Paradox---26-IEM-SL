"""Tests for orchestrator integration logic."""

import pytest
from orchestrator import synthesize_risk_assessment


class TestSynthesizeRiskAssessment:
    """Tests for combining GIS and risk model outputs."""

    def test_gis_high_risk_model_low_returns_elevated(self):
        """When GIS flags high-risk parcels but model says low, result should be elevated."""
        gis_result = {
            "type": "FeatureCollection",
            "features": [
                {"properties": {"risk_level": "High", "ai_confidence": "High"}},
                {"properties": {"risk_level": "High", "ai_confidence": "High"}},
            ],
            "gis_context": {"mean_slope": 15.0, "elevation_range": 100.0},
        }
        risk_result = {
            "risk_score": 0.003,
            "risk_level": "low",
            "model": "model_main.json",
        }

        result = synthesize_risk_assessment(gis_result, risk_result)

        assert result["risk_level"] in ("moderate", "high")
        assert result["risk_score"] > risk_result["risk_score"]
        assert "high_risk_parcels" in result["evidence"]["gis"]
        assert result["evidence"]["gis"]["high_risk_parcels"] == 2

    def test_both_low_returns_low(self):
        """When both GIS and model agree on low, result should be low."""
        gis_result = {
            "type": "FeatureCollection",
            "features": [],
            "gis_context": {"mean_slope": 5.0, "elevation_range": 20.0},
        }
        risk_result = {
            "risk_score": 0.1,
            "risk_level": "low",
            "model": "model_main.json",
        }

        result = synthesize_risk_assessment(gis_result, risk_result)

        assert result["risk_level"] == "low"
        assert result["risk_score"] == pytest.approx(risk_result["risk_score"], rel=0.5)

    def test_both_high_returns_high(self):
        """When both GIS and model agree on high, result should be high."""
        gis_result = {
            "type": "FeatureCollection",
            "features": [
                {"properties": {"risk_level": "High", "ai_confidence": "High"}},
            ],
            "gis_context": {"mean_slope": 30.0, "elevation_range": 300.0},
        }
        risk_result = {
            "risk_score": 0.85,
            "risk_level": "high",
            "model": "model_main.json",
        }

        result = synthesize_risk_assessment(gis_result, risk_result)

        assert result["risk_level"] == "high"
        assert result["risk_score"] >= 0.7

    def test_gis_moderate_model_low_returns_moderate(self):
        """When GIS shows moderate risk parcels, result should be at least moderate."""
        gis_result = {
            "type": "FeatureCollection",
            "features": [
                {"properties": {"risk_level": "Moderate", "ai_confidence": "High"}},
            ],
            "gis_context": {"mean_slope": 20.0, "elevation_range": 150.0},
        }
        risk_result = {
            "risk_score": 0.15,
            "risk_level": "low",
            "model": "model_main.json",
        }

        result = synthesize_risk_assessment(gis_result, risk_result)

        assert result["risk_level"] in ("moderate", "high")
        assert result["risk_score"] > risk_result["risk_score"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])