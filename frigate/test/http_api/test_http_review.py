from datetime import datetime, timedelta

from fastapi.testclient import TestClient

from frigate.models import Event, Recordings, ReviewSegment
from frigate.review.maintainer import SeverityEnum
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpReview(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])
        self.app = super().create_app()

    def _get_reviews(self, ids: list[str]):
        return list(
            ReviewSegment.select(ReviewSegment.id)
            .where(ReviewSegment.id.in_(ids))
            .execute()
        )

    def _get_recordings(self, ids: list[str]):
        return list(
            Recordings.select(Recordings.id).where(Recordings.id.in_(ids)).execute()
        )

    ####################################################################################################################
    ###################################  GET /review Endpoint   ########################################################
    ####################################################################################################################

    # Does not return any data point since the end time (before parameter) is not passed and the review segment end_time is 2 seconds from now
    def test_get_review_no_filters_no_matches(self):
        now = datetime.now().timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now, now + 2)
            response = client.get("/review")
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 0

    def test_get_review_no_filters(self):
        now = datetime.now().timestamp()

        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random", now - 2, now - 1)
            response = client.get("/review")
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 1

    def test_get_review_with_time_filter_no_matches(self):
        now = datetime.now().timestamp()

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2)
            params = {
                "after": now,
                "before": now + 3,
            }
            response = client.get("/review", params=params)
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 0

    def test_get_review_with_time_filter(self):
        now = datetime.now().timestamp()

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id, now, now + 2)
            params = {
                "after": now - 1,
                "before": now + 3,
            }
            response = client.get("/review", params=params)
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 1
            assert response_json[0]["id"] == id

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
            response = client.get("/review", params=params)
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 1
            assert response_json[0]["id"] == id2

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
            response = client.get("/review", params=params)
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 1
            assert response_json[0]["id"] == id

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
            response = client.get("/review", params=params)
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 0

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
            response = client.get("/review", params=params)
            assert response.status_code == 200
            response_json = response.json()
            assert len(response_json) == 1
            assert response_json[0]["id"] == id

    ####################################################################################################################
    ###################################  GET /review/summary Endpoint   #################################################
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
            response = client.get("/review/summary", params=params)
            assert response.status_code == 200
            response_json = response.json()
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
            self.assertEqual(response_json, expected_response)

    def test_get_review_summary_no_filters(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            response = client.get("/review/summary")
            assert response.status_code == 200
            response_json = response.json()
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
            self.assertEqual(response_json, expected_response)

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
            response = client.get("/review/summary")
            assert response.status_code == 200
            response_json = response.json()
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
            self.assertEqual(response_json, expected_response)

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
                twenty_days_ago.timestamp(),
                None,
                SeverityEnum.detection,
            )
            # One month ago plus 5 seconds fits within the condition (review.start_time > month_ago). Assuming that the endpoint does not take more than 5 seconds to be invoked
            super().insert_mock_review_segment(
                "123459.random",
                one_month_ago_ts + 5,
                None,
                SeverityEnum.detection,
            )
            # This won't appear in the output since it's not within last month start_time clause (review.start_time > month_ago)
            super().insert_mock_review_segment("123450.random", one_month_ago_ts)
            response = client.get("/review/summary")
            assert response.status_code == 200
            response_json = response.json()
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
            self.assertEqual(response_json, expected_response)

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
            response = client.get("/review/summary")
            assert response.status_code == 200
            response_json = response.json()
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
            self.assertEqual(response_json, expected_response)

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
            response = client.get("/review/summary")
            assert response.status_code == 200
            response_json = response.json()
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
            self.assertEqual(response_json, expected_response)

    ####################################################################################################################
    ###################################  POST reviews/viewed Endpoint   ################################################
    ####################################################################################################################
    def test_post_reviews_viewed_no_body(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            response = client.post("/reviews/viewed")
            # Missing ids
            assert response.status_code == 422

    def test_post_reviews_viewed_no_body_ids(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            body = {"ids": [""]}
            response = client.post("/reviews/viewed", json=body)
            # Missing ids
            assert response.status_code == 422

    def test_post_reviews_viewed_non_existent_id(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id)
            body = {"ids": ["1"]}
            response = client.post("/reviews/viewed", json=body)
            assert response.status_code == 200
            response = response.json()
            assert response["success"] == True
            assert response["message"] == "Reviewed multiple items"
            # Verify that in DB the review segment was not changed
            review_segment_in_db = (
                ReviewSegment.select(ReviewSegment.has_been_reviewed)
                .where(ReviewSegment.id == id)
                .get()
            )
            assert review_segment_in_db.has_been_reviewed == False

    def test_post_reviews_viewed(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id)
            body = {"ids": [id]}
            response = client.post("/reviews/viewed", json=body)
            assert response.status_code == 200
            response = response.json()
            assert response["success"] == True
            assert response["message"] == "Reviewed multiple items"
            # Verify that in DB the review segment was changed
            review_segment_in_db = (
                ReviewSegment.select(ReviewSegment.has_been_reviewed)
                .where(ReviewSegment.id == id)
                .get()
            )
            assert review_segment_in_db.has_been_reviewed == True

    ####################################################################################################################
    ###################################  POST reviews/delete Endpoint   ################################################
    ####################################################################################################################
    def test_post_reviews_delete_no_body(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            response = client.post("/reviews/delete")
            # Missing ids
            assert response.status_code == 422

    def test_post_reviews_delete_no_body_ids(self):
        with TestClient(self.app) as client:
            super().insert_mock_review_segment("123456.random")
            body = {"ids": [""]}
            response = client.post("/reviews/delete", json=body)
            # Missing ids
            assert response.status_code == 422

    def test_post_reviews_delete_non_existent_id(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id)
            body = {"ids": ["1"]}
            response = client.post("/reviews/delete", json=body)
            assert response.status_code == 200
            response_json = response.json()
            assert response_json["success"] == True
            assert response_json["message"] == "Deleted review items."
            # Verify that in DB the review segment was not deleted
            review_ids_in_db_after = self._get_reviews([id])
            assert len(review_ids_in_db_after) == 1
            assert review_ids_in_db_after[0].id == id

    def test_post_reviews_delete(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_review_segment(id)
            body = {"ids": [id]}
            response = client.post("/reviews/delete", json=body)
            assert response.status_code == 200
            response_json = response.json()
            assert response_json["success"] == True
            assert response_json["message"] == "Deleted review items."
            # Verify that in DB the review segment was deleted
            review_ids_in_db_after = self._get_reviews([id])
            assert len(review_ids_in_db_after) == 0

    def test_post_reviews_delete_many(self):
        with TestClient(self.app) as client:
            ids = ["123456.random", "654321.random"]
            for id in ids:
                super().insert_mock_review_segment(id)
                super().insert_mock_recording(id)

            review_ids_in_db_before = self._get_reviews(ids)
            recordings_ids_in_db_before = self._get_recordings(ids)
            assert len(review_ids_in_db_before) == 2
            assert len(recordings_ids_in_db_before) == 2

            body = {"ids": ids}
            response = client.post("/reviews/delete", json=body)
            assert response.status_code == 200
            response_json = response.json()
            assert response_json["success"] == True
            assert response_json["message"] == "Deleted review items."

            # Verify that in DB all review segments and recordings that were passed were deleted
            review_ids_in_db_after = self._get_reviews(ids)
            recording_ids_in_db_after = self._get_recordings(ids)
            assert len(review_ids_in_db_after) == 0
            assert len(recording_ids_in_db_after) == 0
