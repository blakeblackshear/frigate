"""Tests for motion search job limits."""

from datetime import datetime
from unittest.mock import patch

from frigate.jobs import motion_search
from frigate.models import Event, Recordings, ReviewSegment
from frigate.test.http_api.base_http_test import AuthTestClient, BaseTestHttp

URL = "/front_door/search/motion"
BODY = {
    "start_time": 1000,
    "end_time": 2000,
    "polygon_points": [[0, 0], [1, 0], [1, 1]],
}


class TestHttpMotionSearch(BaseTestHttp):
    def setUp(self):
        super().setUp([Event, Recordings, ReviewSegment])
        self.app = self.create_app()

        motion_search._motion_search_jobs.clear()
        self.addCleanup(motion_search._motion_search_jobs.clear)

        runner_patch = patch("frigate.jobs.motion_search.MotionSearchRunner")
        self.runner = runner_patch.start()
        self.addCleanup(runner_patch.stop)

    def start(self, client: AuthTestClient, user: str, body: dict = BODY):
        return client.post(URL, json=body, headers={"remote-user": user})

    def test_second_job_for_same_user_rejected(self):
        with AuthTestClient(self.app) as client:
            self.assertEqual(self.start(client, "alice").status_code, 200)
            self.assertEqual(self.start(client, "alice").status_code, 409)
            self.assertEqual(self.start(client, "bob").status_code, 200)

    def test_user_can_start_again_after_job_finishes(self):
        with AuthTestClient(self.app) as client:
            job_id = self.start(client, "alice").json()["job_id"]
            job = motion_search.get_motion_search_job(job_id)
            job.end_time = datetime.now().timestamp()
            self.assertEqual(self.start(client, "alice").status_code, 200)
            self.assertIsNotNone(motion_search.get_motion_search_job(job_id))

    def test_cancelled_job_frees_user_but_holds_global_slot_until_grace(self):
        with AuthTestClient(self.app) as client:
            job_id = self.start(client, "alice").json()["job_id"]
            with patch("frigate.jobs.motion_search.InterProcessRequestor"):
                self.assertTrue(motion_search.cancel_motion_search_job(job_id))
            job = motion_search.get_motion_search_job(job_id)
            self.assertIsNotNone(job.cancelled_at)
            self.assertIsNone(job.end_time)

            self.assertEqual(self.start(client, "alice").status_code, 200)
            self.assertEqual(self.start(client, "bob").status_code, 200)
            self.assertEqual(self.start(client, "carol").status_code, 429)

            job.cancelled_at -= motion_search.CANCEL_GRACE_SECONDS + 1
            self.assertEqual(self.start(client, "carol").status_code, 200)

    def test_start_failure_releases_slot(self):
        self.runner.return_value.start.side_effect = RuntimeError("boom")
        with AuthTestClient(self.app) as client:
            with self.assertRaises(RuntimeError):
                self.start(client, "alice")
            self.assertEqual(motion_search._motion_search_jobs, {})
            self.runner.return_value.requestor.stop.assert_called_once()

            self.runner.return_value.start.side_effect = None
            self.assertEqual(self.start(client, "alice").status_code, 200)

    def test_shared_identity_skips_per_user_limit(self):
        with AuthTestClient(self.app) as client:
            self.assertEqual(self.start(client, "anonymous").status_code, 200)
            self.assertEqual(self.start(client, "anonymous").status_code, 200)

        motion_search._motion_search_jobs.clear()
        self.minimal_config["auth"] = {"enabled": False}
        app = self.create_app()
        with AuthTestClient(app) as client:
            self.assertEqual(self.start(client, "viewer").status_code, 200)
            self.assertEqual(self.start(client, "viewer").status_code, 200)

    def test_proxy_user_header_keeps_per_user_limit_without_auth(self):
        self.minimal_config["auth"] = {"enabled": False}
        self.minimal_config["proxy"] = {"header_map": {"user": "x-forwarded-user"}}
        app = self.create_app()
        with AuthTestClient(app) as client:
            self.assertEqual(self.start(client, "alice").status_code, 200)
            self.assertEqual(self.start(client, "alice").status_code, 409)

    def test_global_cap_enforced(self):
        with AuthTestClient(self.app) as client:
            for i in range(motion_search.MAX_ACTIVE_JOBS):
                self.assertEqual(self.start(client, f"user{i}").status_code, 200)
            self.assertEqual(self.start(client, "late").status_code, 429)

    def test_finished_jobs_evicted_after_ttl(self):
        with AuthTestClient(self.app) as client:
            old_id = self.start(client, "alice").json()["job_id"]
            recent_id = self.start(client, "bob").json()["job_id"]
            running_id = self.start(client, "carol").json()["job_id"]

        now = 10_000.0
        motion_search.get_motion_search_job(old_id).end_time = (
            now - motion_search.FINISHED_JOB_TTL - 1
        )
        motion_search.get_motion_search_job(recent_id).end_time = now - 1
        motion_search._evict_finished_jobs(now)

        self.assertIsNone(motion_search.get_motion_search_job(old_id))
        self.assertIsNotNone(motion_search.get_motion_search_job(recent_id))
        self.assertIsNotNone(motion_search.get_motion_search_job(running_id))

    def test_username_and_cancel_time_not_broadcast(self):
        job = motion_search.MotionSearchJob(username="alice", cancelled_at=1.0)
        payload = job.to_dict()
        self.assertNotIn("username", payload)
        self.assertNotIn("cancelled_at", payload)
