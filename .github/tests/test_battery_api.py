"""
Tests for Guadaware Battery API (guadawareSystemBatteryAPI.py).
"""
import pytest


class TestBatteryPercentage:
    def test_get_battery_percentage(self, battery):
        response = battery.get("/getBatteryPercentage")
        assert response.status_code == 200
        value = response.text.strip()
        if value:
            assert value.isdigit()
            assert 0 <= int(value) <= 100

    def test_battery_percentage_is_number(self, battery):
        response = battery.get("/getBatteryPercentage")
        assert response.status_code == 200
        if response.text.strip():
            assert response.text.strip().isdigit()


class TestBatteryStatus:
    def test_get_battery_status(self, battery):
        response = battery.get("/getBatteryStatus")
        assert response.status_code == 200
        valid_statuses = [
            "Charging", "Discharging", "Full",
            "Not charging", "Unknown", ""
        ]
        assert response.text.strip() in valid_statuses


class TestBatteryEndpointIntegration:
    def test_both_endpoints_work(self, battery):
        pct = battery.get("/getBatteryPercentage")
        status = battery.get("/getBatteryStatus")
        assert pct.status_code == 200
        assert status.status_code == 200

    def test_battery_percentage_range(self, battery):
        response = battery.get("/getBatteryPercentage")
        assert response.status_code == 200
        text = response.text.strip()
        if text:
            assert 0 <= int(text) <= 100

    def test_battery_status_valid(self, battery):
        response = battery.get("/getBatteryStatus")
        assert response.status_code == 200
        text = response.text.strip()
        if text:
            valid = ["Charging", "Discharging", "Full", "Not charging", "Unknown"]
            assert text in valid
