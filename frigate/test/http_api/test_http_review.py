from fastapi.testclient import TestClient

from frigate.models import Event, ReviewSegment
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment])

    # Does not return any data point since the end time (before parameter) is not passed
    def test_get_reviews_no_filters(self):
        app = super().create_app()

        with TestClient(app) as client:
            super().insert_mock_review_segment("123456.random")
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            assert len(reviews_response.json()) == 0
