from datetime import datetime, timedelta
import json

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
        now = datetime.now().timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now, now + 2)
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 0

    def test_get_review_no_filters(self):
        now = datetime.now().timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now - 2, now - 1)
            reviews_response = client.get("/review")
            assert reviews_response.status_code == 200
            reviews_in_response = reviews_response.json()
            assert len(reviews_in_response) == 1

    def test_get_review_with_time_filter_no_matches(self):
        now = datetime.now().timestamp()

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
        now = datetime.now().timestamp()

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
        now = datetime.now().timestamp()

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
        now = datetime.now().timestamp()

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
        now = datetime.now().timestamp()

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
        now = datetime.now().timestamp()

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
            super().insert_mock_review_segment("123456.random")
            params = {
                "cameras": "front_door",
                "labels": "all",
                "zones": "all",
                "timezone": "utc",
            }
            review_summary_request = client.get("/review/summary", params=params)
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            # e.g. '2024-11-24'
            today_formatted = datetime.today().strftime("%Y-%m-%d")
            expected_response = {
                "last24Hours": {
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                today_formatted: {
                    "day": today_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
            }
            self.assertEqual(review_summary_response, expected_response)

    def test_get_review_summary_no_filters(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            review_summary_request = client.get("/review/summary")
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            # e.g. '2024-11-24'
            today_formatted = datetime.today().strftime("%Y-%m-%d")
            expected_response = {
                "last24Hours": {
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                today_formatted: {
                    "day": today_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
            }
            self.assertEqual(review_summary_response, expected_response)

    def test_get_review_summary_multiple_days(self):
        now = datetime.now()
        five_days_ago = datetime.today() - timedelta(days=5)

        with TestClient(self.app) as client:
            super().insert_mock_review_segment(
                "123456.random", now.timestamp() - 2, now.timestamp() - 1
            )
            super().insert_mock_review_segment(
                "654321.random",
                five_days_ago.timestamp(),
                five_days_ago.timestamp() + 1,
            )
            review_summary_request = client.get("/review/summary")
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            # e.g. '2024-11-24'
            today_formatted = now.strftime("%Y-%m-%d")
            # e.g. '2024-11-19'
            five_days_ago_formatted = five_days_ago.strftime("%Y-%m-%d")
            expected_response = {
                "last24Hours": {
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                today_formatted: {
                    "day": today_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                five_days_ago_formatted: {
                    "day": five_days_ago_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
            }
            self.assertEqual(review_summary_response, expected_response)

    def test_get_review_summary_multiple_days_edge_cases(self):
        now = datetime.now()
        five_days_ago = datetime.today() - timedelta(days=5)
        twenty_days_ago = datetime.today() - timedelta(days=20)
        one_month_ago = datetime.today() - timedelta(days=30)
        one_month_ago_ts = one_month_ago.timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now.timestamp())
            super().insert_mock_review_segment(
                "123457.random", five_days_ago.timestamp()
            )
            super().insert_mock_review_segment(
                "123458.random",
                one_month_ago_ts,
                None,
                SeverityEnum.detection,
            )
            # One month ago plus 5 seconds fits within the condition (review.start_time > month_ago). Assuming that the endpoint does not take more than 5 seconds to be invoked
            super().insert_mock_review_segment(
                "123459.random",
                one_month_ago.timestamp() + 5,
                None,
                SeverityEnum.detection,
            )
            # This won't appear in the output since it's not within last month start_time clause (review.start_time > month_ago)
            super().insert_mock_review_segment("123450.random", one_month_ago_ts)
            review_summary_request = client.get("/review/summary")
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            # e.g. '2024-11-24'
            today_formatted = now.strftime("%Y-%m-%d")
            # e.g. '2024-11-19'
            five_days_ago_formatted = five_days_ago.strftime("%Y-%m-%d")
            # e.g. '2024-11-04'
            twenty_days_ago_formatted = twenty_days_ago.strftime("%Y-%m-%d")
            # e.g. '2024-10-24'
            one_month_ago_formatted = one_month_ago.strftime("%Y-%m-%d")
            expected_response = {
                "last24Hours": {
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                today_formatted: {
                    "day": today_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                five_days_ago_formatted: {
                    "day": five_days_ago_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                twenty_days_ago_formatted: {
                    "day": twenty_days_ago_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 0,
                    "total_detection": 1,
                },
                one_month_ago_formatted: {
                    "day": one_month_ago_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 0,
                    "total_detection": 1,
                },
            }
            self.assertEqual(review_summary_response, expected_response)

    def test_get_review_summary_multiple_in_same_day(self):
        now = datetime.now()
        five_days_ago = datetime.today() - timedelta(days=5)

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now.timestamp())
            five_days_ago_ts = five_days_ago.timestamp()
            for i in range(20):
                super().insert_mock_review_segment(
                    f"123456_{i}.random_alert",
                    five_days_ago_ts,
                    five_days_ago_ts,
                    SeverityEnum.alert,
                )
            for i in range(15):
                super().insert_mock_review_segment(
                    f"123456_{i}.random_detection",
                    five_days_ago_ts,
                    five_days_ago_ts,
                    SeverityEnum.detection,
                )
            review_summary_request = client.get("/review/summary")
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            # e.g. '2024-11-24'
            today_formatted = now.strftime("%Y-%m-%d")
            # e.g. '2024-11-19'
            five_days_ago_formatted = five_days_ago.strftime("%Y-%m-%d")
            expected_response = {
                "last24Hours": {
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                today_formatted: {
                    "day": today_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 1,
                    "total_detection": 0,
                },
                five_days_ago_formatted: {
                    "day": five_days_ago_formatted,
                    "reviewed_alert": 0,
                    "reviewed_detection": 0,
                    "total_alert": 20,
                    "total_detection": 15,
                },
            }
            self.assertEqual(review_summary_response, expected_response)

    def test_get_review_summary_multiple_in_same_day_with_reviewed(self):
        five_days_ago = datetime.today() - timedelta(days=5)

        with TestClient(self.app) as client:
            five_days_ago_ts = five_days_ago.timestamp()
            for i in range(10):
                super().insert_mock_review_segment(
                    f"123456_{i}.random_alert_not_reviewed",
                    five_days_ago_ts,
                    five_days_ago_ts,
                    SeverityEnum.alert,
                    False,
                )
            for i in range(10):
                super().insert_mock_review_segment(
                    f"123456_{i}.random_alert_reviewed",
                    five_days_ago_ts,
                    five_days_ago_ts,
                    SeverityEnum.alert,
                    True,
                )
            for i in range(10):
                super().insert_mock_review_segment(
                    f"123456_{i}.random_detection_not_reviewed",
                    five_days_ago_ts,
                    five_days_ago_ts,
                    SeverityEnum.detection,
                    False,
                )
            for i in range(5):
                super().insert_mock_review_segment(
                    f"123456_{i}.random_detection_reviewed",
                    five_days_ago_ts,
                    five_days_ago_ts,
                    SeverityEnum.detection,
                    True,
                )
            review_summary_request = client.get("/review/summary")
            assert review_summary_request.status_code == 200
            review_summary_response = review_summary_request.json()
            # e.g. '2024-11-19'
            five_days_ago_formatted = five_days_ago.strftime("%Y-%m-%d")
            expected_response = {
                "last24Hours": {
                    "reviewed_alert": None,
                    "reviewed_detection": None,
                    "total_alert": None,
                    "total_detection": None,
                },
                five_days_ago_formatted: {
                    "day": five_days_ago_formatted,
                    "reviewed_alert": 10,
                    "reviewed_detection": 5,
                    "total_alert": 20,
                    "total_detection": 15,
                },
            }
            self.assertEqual(review_summary_response, expected_response)
