"""
Tests for Guadaware Notes API (apps/notes/app.py).
"""
import json
import pytest


class TestNotesList:
    def test_list_empty(self, notes):
        response = notes.get("/")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_get_api_returns_list(self, notes):
        response = notes.get("/get")
        assert response.status_code == 200
        data = json.loads(response.text)
        assert isinstance(data, list)


class TestNotesCreate:
    def test_create_note(self, notes):
        response = notes.post(
            "/save",
            json={"title": "Test Note", "content": "Test content", "oldTitle": "", "oldContent": ""}
        )
        assert response.status_code == 200
        data = json.loads(response.text)
        assert data.get("ok") is True

        list_resp = notes.get("/get")
        found = any(
            n["title"] == "Test Note" and n["content"] == "Test content"
            for n in json.loads(list_resp.text)
        )
        assert found

    def test_create_note_empty_title(self, notes):
        response = notes.post(
            "/save",
            json={"title": "", "content": "content", "oldTitle": "", "oldContent": ""}
        )
        assert response.status_code == 400


class TestNotesUpdate:
    def test_update_note(self, notes):
        notes.post(
            "/save",
            json={"title": "ToUpdate", "content": "old", "oldTitle": "", "oldContent": ""}
        )
        response = notes.post(
            "/save",
            json={"title": "Updated", "content": "new", "oldTitle": "ToUpdate", "oldContent": "old"}
        )
        assert response.status_code == 200

        list_resp = notes.get("/get")
        found = any(n["title"] == "Updated" for n in json.loads(list_resp.text))
        assert found


class TestNotesDelete:
    def test_delete_note(self, notes):
        notes.post(
            "/save",
            json={"title": "ToDelete", "content": "bye", "oldTitle": "", "oldContent": ""}
        )
        response = notes.post(
            "/delete",
            json={"title": "ToDelete", "content": "bye"}
        )
        assert response.status_code == 200
        data = json.loads(response.text)
        assert data.get("ok") is True

        list_resp = notes.get("/get")
        found = any(n["title"] == "ToDelete" for n in json.loads(list_resp.text))
        assert not found

    def test_delete_nonexistent(self, notes):
        response = notes.post(
            "/delete",
            json={"title": "DoesNotExist12345", "content": ""}
        )
        assert response.status_code == 404


class TestNotesEdit:
    def test_edit_page_loads(self, notes):
        response = notes.get("/edit")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_edit_page_with_params(self, notes):
        response = notes.get("/edit?title=MyNote&content=Hello")
        assert response.status_code == 200
