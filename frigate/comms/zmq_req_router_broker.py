"""ZMQ REQ/ROUTER front-end to DEALER/REP back-end broker.

This module provides a small proxy that:
- Binds a ROUTER socket on a fixed local endpoint for REQ clients
- Connects a DEALER socket to the user-configured backend endpoint (REP servers)

Pattern: REQ -> ROUTER === proxy === DEALER -> REP

The goal is to allow multiple REQ clients and/or multiple backend workers
to share a single configured connection, enabling multiple models/runners
behind the same broker while keeping local clients stable via constants.
"""

from __future__ import annotations

import threading

import zmq

REQ_ROUTER_ENDPOINT = "ipc:///tmp/cache/zmq_detector_router"


class _RouterDealerRunner(threading.Thread):
    def __init__(self, context: zmq.Context[zmq.Socket], backend_endpoint: str) -> None:
        super().__init__(name="zmq_router_dealer_broker", daemon=True)
        self.context = context
        self.backend_endpoint = backend_endpoint

    def run(self) -> None:
        frontend = self.context.socket(zmq.ROUTER)
        frontend.bind(REQ_ROUTER_ENDPOINT)

        backend = self.context.socket(zmq.DEALER)
        backend.bind(self.backend_endpoint)

        try:
            zmq.proxy(frontend, backend)
        except zmq.ZMQError:
            # Unblocked when context is destroyed in the controller
            pass


class ZmqReqRouterBroker:
    """Starts a ROUTER/DEALER proxy bridging local REQ clients to backend REP.

    - ROUTER binds to REQ_ROUTER_ENDPOINT (constant, local)
    - DEALER connects to the provided backend_endpoint (user-configured)
    """

    def __init__(self, backend_endpoint: str) -> None:
        self.backend_endpoint = backend_endpoint
        self.context = zmq.Context()
        self.runner = _RouterDealerRunner(self.context, backend_endpoint)
        self.runner.start()

    def stop(self) -> None:
        # Destroying the context signals the proxy to stop
        try:
            self.context.destroy()
        finally:
            self.runner.join()
