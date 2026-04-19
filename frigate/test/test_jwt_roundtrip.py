"""Regression test for create_encoded_jwt + joserfc 1.x OctKey handling.

joserfc 1.x requires an OctKey for symmetric algorithms; passing a raw
string raises MissingKeyError / ValueError inside jwt.encode. This test
pins the fix so a future refactor can't silently reintroduce the crash.
"""

import time
import unittest

from joserfc import jwt
from joserfc.jwk import OctKey

from frigate.api.auth import create_encoded_jwt


class TestCreateEncodedJwtRoundTrip(unittest.TestCase):
    def test_round_trip_with_string_secret(self):
        secret = "unit-test-secret-string-abc123"
        expiration = int(time.time()) + 60

        token = create_encoded_jwt("alice", "admin", expiration, secret)

        decoded = jwt.decode(token, OctKey.import_key(secret))
        self.assertEqual(decoded.claims["sub"], "alice")
        self.assertEqual(decoded.claims["role"], "admin")
        self.assertEqual(decoded.claims["exp"], expiration)


if __name__ == "__main__":
    unittest.main()
