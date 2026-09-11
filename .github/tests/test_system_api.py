"""
Tests for Guadaware System API (guadawareSystemAPI.py).
"""
import json
import pytest


class TestCORSHeaders:
    def test_cors_headers_present(self, api):
        response = api.get(
            "/getRAMUsage",
            headers={"Origin": "http://localhost:8000"}
        )
        assert "Access-Control-Allow-Origin" in response.headers

    def test_cors_origin_allowed(self, api):
        response = api.get(
            "/getRAMUsage",
            headers={"Origin": "http://localhost:8000"}
        )
        assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:8000"

    def test_cors_origin_not_allowed(self, api):
        response = api.get(
            "/getRAMUsage",
            headers={"Origin": "http://evil.com"}
        )
        assert "Access-Control-Allow-Origin" not in response.headers

    def test_accept_ranges_header(self, api):
        response = api.get("/getRAMUsage")
        assert response.headers.get("Accept-Ranges") == "bytes"


class TestSystemInfo:
    def test_get_ram_usage(self, api):
        response = api.get("/getRAMUsage")
        assert response.status_code == 200
        assert "/" in response.text

    def test_get_disk_usage(self, api):
        response = api.get("/getDiskUsage")
        assert response.status_code == 200
        assert "/" in response.text

    def test_get_guadaware_build(self, api):
        response = api.get("/getGuadawareBuild")
        assert response.status_code == 200


class TestShell:
    def test_sh_echo(self, api):
        response = api.get("/sh/echo%20hello")
        assert response.status_code == 200
        assert "hello" in response.text

    def test_sh_date(self, api):
        response = api.get("/sh/date")
        assert response.status_code == 200
        assert len(response.text) > 0

    def test_sh_invalid_command(self, api):
        response = api.get("/sh/nonexistent_command_12345")
        assert response.status_code == 200


class TestPhotos:
    def test_get_photo_list(self, api):
        response = api.get("/getPhotoList")
        assert response.status_code == 200
        data = json.loads(response.text)
        assert isinstance(data, list)

    def test_serve_photo_not_found(self, api):
        response = api.get("/photo/nonexistent.jpg")
        assert response.status_code == 404

    def test_serve_photo_forbidden(self, api):
        response = api.get("/photo/../../../etc/passwd")
        assert response.status_code in (403, 404)


class TestContacts:
    def test_get_contact_list(self, api):
        response = api.get("/getContactList")
        assert response.status_code == 200
        data = json.loads(response.text)
        assert isinstance(data, list)

    def test_save_and_delete_contact(self, api):
        vcard = (
            "BEGIN:VCARD\r\n"
            "VERSION:3.0\r\n"
            "FN:Test Contact\r\n"
            "TEL;TYPE=CELL:123456789\r\n"
            "EMAIL:test@example.com\r\n"
            "END:VCARD"
        )
        response = api.post(
            "/saveContact",
            json={"vcard": vcard, "uid": ""}
        )
        assert response.status_code == 200
        data = json.loads(response.text)
        assert data.get("ok") is True
        assert "uid" in data

        uid = data["uid"]
        del_response = api.delete(f"/deleteContact/{uid}")
        assert del_response.status_code == 200

    def test_delete_nonexistent_contact(self, api):
        response = api.delete("/deleteContact/nonexistent_uid_12345")
        assert response.status_code == 200
        data = json.loads(response.text)
        assert data.get("ok") is True


class TestInstallApp:
    def test_install_app(self, api):
        response = api.get("/installApp/test")
        assert response.status_code == 200
