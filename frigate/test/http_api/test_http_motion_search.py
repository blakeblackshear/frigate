"""Tests for motion search job limits."""

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
        runner_patch.start()
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
            motion_search.get_motion_search_job(job_id).end_time = 1.0
            self.assertEqual(self.start(client, "alice").status_code, 200)

    def test_global_cap_enforced(self):
        with AuthTestClient(self.app) as client:
            for i in range(motion_search.MAX_ACTIVE_JOBS):
                self.assertEqual(self.start(client, f"user{i}").status_code, 200)
            self.assertEqual(self.start(client, "late").status_code, 429)

    def test_over_long_range_rejected(self):
        body = {**BODY, "end_time": BODY["start_time"] + 48 * 3600 + 1}
        with AuthTestClient(self.app) as client:
            resp = self.start(client, "alice", body)

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(motion_search._motion_search_jobs, {})

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

    def test_username_not_broadcast(self):
        job = motion_search.MotionSearchJob(username="alice")
        self.assertNotIn("username", job.to_dict())
