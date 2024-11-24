import datetime

from fastapi.testclient import TestClient

from frigate.models import Event, ReviewSegment
from frigate.review.maintainer import SeverityEnum
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, ReviewSegment])
        self.app = super().create_app()

    ####################################################################################################################
    ###################################  Review Endpoint   #############################################################
    ####################################################################################################################

    # Does not return any data point since the end time (before parameter) is not passed and the review segment end_time is 2 seconds from now
    def test_get_review_no_filters_no_matches(self):
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now, now + 2)
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 0

    def test_get_review_no_filters(self):
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now - 2, now - 1)
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1

    def test_get_review_with_time_filter_no_matches(self):
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
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
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
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
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
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

    def test_get_review_with_severity_filters_no_matches(self):
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2, SeverityEnum.detection)
            params = {
                "severity": "detection",
                "after": now - 1,
                "before": now + 3,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1
            assert reviews_in_response[0]["id"] == id

    def test_get_review_with_severity_filters(self):
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2, SeverityEnum.detection)
            params = {
                "severity": "alert",
                "after": now - 1,
                "before": now + 3,
            }
            reviews_response = client.get("/review", params=params)
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 0

    def test_get_review_with_all_filters(self):
        now = datetime.datetime.now().timestamp()

        with TestClient(self.app) as client:
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

    ####################################################################################################################
    ###################################  Review Summary Endpoint   #####################################################
    ####################################################################################################################
    def test_get_review_summary_all_filters(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id)
            params = {
                "cameras": "front_door",
                "labels": "all",
                "zones": "all",
                "timezone": "utc",
            }
            review_summary_request = client.get("/review/summary", params=params)
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            today = datetime.date.today().strftime('%Y-%m-%d') # e.g. '2024-11-24'
            expected_response = {
                'last24Hours': {
                    'reviewed_alert': 0,
                    'reviewed_detection': 0,
                    'total_alert': 1,
                    'total_detection': 0
                },
                today: {
                    'day': today,
                    'reviewed_alert': 0,
                    'reviewed_detection': 0,
                    'total_alert': 1,
                    'total_detection': 0
                }
            }
            self.assertEqual(review_summary_response, expected_response)

    def test_get_review_summary_no_filters(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            review_summary_request = client.get("/review/summary")
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            today = datetime.date.today().strftime('%Y-%m-%d') # e.g. '2024-11-24'
            expected_response = {
                'last24Hours': {
                    'reviewed_alert': 0,
                    'reviewed_detection': 0,
                    'total_alert': 1,
                    'total_detection': 0
                },
                today: {
                    'day': today,
                    'reviewed_alert': 0,
                    'reviewed_detection': 0,
                    'total_alert': 1,
                    'total_detection': 0
                }
            }
            self.assertEqual(review_summary_response, expected_response)