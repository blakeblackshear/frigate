import datetime

from fastapi.testclient import TestClient

from frigate.models import Event, ReviewSegment
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment])

    # Does not return any data point since the end time (before parameter) is not passed and the review segment end_time is 2 seconds from now
    def test_get_review_no_filters_no_matches(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            super().insert_mock_review_segment("123456.random", now, now + 2)
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 0

    def test_get_review_no_filters(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            super().insert_mock_review_segment("123456.random", now - 2, now - 1)
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1

    def test_get_review_with_time_filter_no_matches(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2)
            params = {
                "after": now,
                "before": now + 3,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 0

    def test_get_review_with_time_filter(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2)
            params = {
                "after": now - 1,
                "before": now + 3,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1
            assert reviews_in_response[0]["id"] == id

    def test_get_review_with_limit_filter(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            id = "123456.random"
            id2 = "654321.random"
            super().insert_mock_review_segment(id, now, now + 2)
            super().insert_mock_review_segment(id2, now + 1, now + 2)
            params = {
                "limit": 1,
                "after": now,
                "before": now + 3,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1
            assert reviews_in_response[0]["id"] == id2

    def test_get_review_with_all_filters(self):
        app = super().create_app()
        now = datetime.datetime.now().timestamp()

        with TestClient(app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2)
            params = {
                "cameras": "front_door",
                "labels": "all",
                "zones": "all",
                "reviewed": 0,
                "limit": 1,
                "severity": "alert",
                "after": now - 1,
                "before": now + 3,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1
            assert reviews_in_response[0]["id"] == id
