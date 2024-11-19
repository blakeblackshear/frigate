import datetime

from fastapi.testclient import TestClient

from frigate.models import Event, ReviewSegment
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment])

    # Does not return any data point since the end time (before parameter) is not passed and the review segment end_time is 20 seconds from now
    def test_get_reviews_no_filters(self):
        app = super().create_app()

        with TestClient(app) as client:
            super().insert_mock_review_segment("123456.random")
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            assert len(reviews_response.json()) == 0

    def test_get_with_time_filter(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            id = "4566.random"
            super().insert_mock_review_segment(id, now, now + 20)
            params = {
                "after": now - 1,
                "before": now + 21,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1
            assert reviews_in_response[0]["id"] == id
