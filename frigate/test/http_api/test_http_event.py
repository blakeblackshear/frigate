from datetime import datetime
from typing import Any
from unittest.mock import Mock

from fastapi.testclient import TestClient
from playhouse.shortcuts import model_to_dict

from frigate.api.auth import get_allowed_cameras_for_filter, get_current_user
from frigate.comms.event_metadata_updater import EventMetadataPublisher
from frigate.models import Event, Recordings, ReviewSegment, Timeline
from frigate.test.http_api.base_http_test import BaseTestHttp


class TestHttpApp(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment, Timeline])
        self.app = super().create_app()

        # Mock auth to bypass camera access for tests
        async def mock_get_current_user(request: Any):
            return {"username": "test_user", "role": "admin"}

        self.app.dependency_overrides[get_current_user] = mock_get_current_user
        self.app.dependency_overrides[get_allowed_cameras_for_filter] = lambda: [
            "front_door"
        ]

    def tearDown(self):
        self.app.dependency_overrides.clear()
        super().tearDown()

    ####################################################################################################################
    ###################################  GET /events Endpoint   #########################################################
    ####################################################################################################################
    def test_get_event_list_no_events(self):
        with TestClient(self.app) as client:
            events = client.get("/events").json()
            assert len(events) == 0

    def test_get_event_list_no_match_event_id(self):
        id = "123456.random"
        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            events = client.get("/events", params={"event_id": "abc"}).json()
            assert len(events) == 0

    def test_get_event_list_match_event_id(self):
        id = "123456.random"
        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            events = client.get("/events", params={"event_id": id}).json()
            assert len(events) == 1
            assert events[0]["id"] == id

    def test_get_event_list_match_length(self):
        now = int(datetime.now().timestamp())

        id = "123456.random"
        with TestClient(self.app) as client:
            super().insert_mock_event(id, now, now + 1)
            events = client.get(
                "/events", params={"max_length": 1, "min_length": 1}
            ).json()
            assert len(events) == 1
            assert events[0]["id"] == id

    def test_get_event_list_no_match_max_length(self):
        now = int(datetime.now().timestamp())

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_event(id, now, now + 2)
            events = client.get("/events", params={"max_length": 1}).json()
            assert len(events) == 0

    def test_get_event_list_no_match_min_length(self):
        now = int(datetime.now().timestamp())

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_event(id, now, now + 2)
            events = client.get("/events", params={"min_length": 3}).json()
            assert len(events) == 0

    def test_get_event_list_limit(self):
        id = "123456.random"
        id2 = "54321.random"

        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            events = client.get("/events").json()
            assert len(events) == 1
            assert events[0]["id"] == id

            super().insert_mock_event(id2)
            events = client.get("/events").json()
            assert len(events) == 2

            events = client.get("/events", params={"limit": 1}).json()
            assert len(events) == 1
            assert events[0]["id"] == id

            events = client.get("/events", params={"limit": 3}).json()
            assert len(events) == 2

    def test_get_event_list_no_match_has_clip(self):
        now = int(datetime.now().timestamp())

        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_event(id, now, now + 2)
            events = client.get("/events", params={"has_clip": 0}).json()
            assert len(events) == 0

    def test_get_event_list_has_clip(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            super().insert_mock_event(id, has_clip=True)
            events = client.get("/events", params={"has_clip": 1}).json()
            assert len(events) == 1
            assert events[0]["id"] == id

    def test_get_event_list_sort_score(self):
        with TestClient(self.app) as client:
            id = "123456.random"
            id2 = "54321.random"
            super().insert_mock_event(id, top_score=37, score=37, data={"score": 50})
            super().insert_mock_event(id2, top_score=47, score=47, data={"score": 20})
            events = client.get("/events", params={"sort": "score_asc"}).json()
            assert len(events) == 2
            assert events[0]["id"] == id2
            assert events[1]["id"] == id

            events = client.get("/events", params={"sort": "score_des"}).json()
            assert len(events) == 2
            assert events[0]["id"] == id
            assert events[1]["id"] == id2

    def test_get_event_list_sort_start_time(self):
        now = int(datetime.now().timestamp())

        with TestClient(self.app) as client:
            id = "123456.random"
            id2 = "54321.random"
            super().insert_mock_event(id, start_time=now + 3)
            super().insert_mock_event(id2, start_time=now)
            events = client.get("/events", params={"sort": "date_asc"}).json()
            assert len(events) == 2
            assert events[0]["id"] == id2
            assert events[1]["id"] == id

            events = client.get("/events", params={"sort": "date_desc"}).json()
            assert len(events) == 2
            assert events[0]["id"] == id
            assert events[1]["id"] == id2

    def test_get_good_event(self):
        id = "123456.random"

        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            event = client.get(f"/events/{id}").json()

        assert event
        assert event["id"] == id
        assert event["id"] == model_to_dict(Event.get(Event.id == id))["id"]

    def test_get_bad_event(self):
        id = "123456.random"
        bad_id = "654321.other"

        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            event_response = client.get(f"/events/{bad_id}")
            assert event_response.status_code == 404
            assert event_response.json() == "Event not found"

    def test_delete_event(self):
        id = "123456.random"

        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            event = client.get(f"/events/{id}").json()
            assert event
            assert event["id"] == id
            response = client.delete(f"/events/{id}", headers={"remote-role": "admin"})
            assert response.status_code == 200
            event_after_delete = client.get(f"/events/{id}")
            assert event_after_delete.status_code == 404

    def test_event_retention(self):
        id = "123456.random"

        with TestClient(self.app) as client:
            super().insert_mock_event(id)
            client.post(f"/events/{id}/retain", headers={"remote-role": "admin"})
            event = client.get(f"/events/{id}").json()
            assert event
            assert event["id"] == id
            assert event["retain_indefinitely"] is True
            client.delete(f"/events/{id}/retain", headers={"remote-role": "admin"})
            event = client.get(f"/events/{id}").json()
            assert event
            assert event["id"] == id
            assert event["retain_indefinitely"] is False

    def test_event_time_filtering(self):
        morning_id = "123456.random"
        evening_id = "654321.random"
        morning = 1656590400  # 06/30/2022 6 am (GMT)
        evening = 1656633600  # 06/30/2022 6 pm (GMT)

        with TestClient(self.app) as client:
            super().insert_mock_event(morning_id, morning)
            super().insert_mock_event(evening_id, evening)
            # both events come back
            events = client.get("/events").json()
            print("events!!!", events)
            assert events
            assert len(events) == 2
            # morning event is excluded
            events = client.get(
                "/events",
                params={"time_range": "07:00,24:00"},
            ).json()
            assert events
            assert len(events) == 1
            # evening event is excluded
            events = client.get(
                "/events",
                params={"time_range": "00:00,18:00"},
            ).json()
            assert events
            assert len(events) == 1

    def test_set_delete_sub_label(self):
        mock_event_updater = Mock(spec=EventMetadataPublisher)
        app = super().create_app(event_metadata_publisher=mock_event_updater)
        id = "123456.random"
        sub_label = "sub"

        def update_event(payload: Any, topic: str):
            event = Event.get(id=id)
            event.sub_label = payload[1]
            event.save()

        mock_event_updater.publish.side_effect = update_event

        with TestClient(app) as client:
            super().insert_mock_event(id)
            new_sub_label_response = client.post(
                f"/events/{id}/sub_label",
                json={"subLabel": sub_label},
                headers={"remote-role": "admin"},
            )
            assert new_sub_label_response.status_code == 200
            event = client.get(f"/events/{id}").json()
            assert event
            assert event["id"] == id
            assert event["sub_label"] == sub_label
            empty_sub_label_response = client.post(
                f"/events/{id}/sub_label",
                json={"subLabel": ""},
                headers={"remote-role": "admin"},
            )
            assert empty_sub_label_response.status_code == 200
            event = client.get(f"/events/{id}").json()
            assert event
            assert event["id"] == id
            assert event["sub_label"] == None

    def test_sub_label_list(self):
        mock_event_updater = Mock(spec=EventMetadataPublisher)
        app = super().create_app(event_metadata_publisher=mock_event_updater)
        app.event_metadata_publisher = mock_event_updater
        id = "123456.random"
        sub_label = "sub"

        def update_event(payload: Any, _: str):
            event = Event.get(id=id)
            event.sub_label = payload[1]
            event.save()

        mock_event_updater.publish.side_effect = update_event

        with TestClient(app) as client:
            super().insert_mock_event(id)
            client.post(
                f"/events/{id}/sub_label",
                json={"subLabel": sub_label},
                headers={"remote-role": "admin"},
            )
            sub_labels = client.get("/sub_labels").json()
            assert sub_labels
            assert sub_labels == [sub_label]
