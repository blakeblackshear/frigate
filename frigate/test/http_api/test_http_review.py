from fastapi.testclient import TestClient

from frigate.models import Event, ReviewSegment
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment])

    def test_get_bad_event(self):
        app = super().create_app()
        id = "123456.random"
        bad_id = "654321.other"

        with TestClient(app) as client:
            super().insert_mock_event(id)
            event_response = client.get(f"/events/{bad_id}")
            assert event_response.status_code == 404
            assert event_response.json() == "Event not found"
