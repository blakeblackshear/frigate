"""ZeroMQ MDP Client / Worker Errors"""

# Copyright (c) 2018 Shoppimon LTD
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


class Error(RuntimeError):
    """Parent exception for all zmq_mdp errors"""

    pass


class ProtocolError(Error):
    """MDP 0.2 Protocol Mismatch"""

    pass


class Disconnected(Error):
    """We are no longer connected"""

    pass


class StateError(Error):
    """System is in an unexpected state"""

    pass


class Timeout(Error, TimeoutError):
    """Operation timed out"""

    pass
