"""Shared helpers for applying a freshly parsed config to the running app."""

from fastapi import FastAPI

from frigate.config import FrigateConfig


def swap_runtime_config(app: FastAPI, config: FrigateConfig) -> None:
    """Point every long-lived collaborator at a newly parsed config object.

    Both /api/config/set and camera deletion re-parse yaml into a fresh
    FrigateConfig and must rebind the same set of references, or the API and
    the dispatcher drift onto different objects (the API reports one camera
    state while the dispatcher acts on another). Runtime toggle overrides are
    re-layered last: the swap rebuilt every camera from yaml, so without this a
    camera the user turned off would silently come back on.
    """
    app.frigate_config = config
    app.genai_manager.update_config(config)

    if app.profile_manager is not None:
        app.profile_manager.update_config(config)

    if app.stats_emitter is not None:
        app.stats_emitter.config = config

    if app.dispatcher is not None:
        app.dispatcher.config = config

        for comm in app.dispatcher.comms:
            comm.config = config

        # workers still hold the live toggle values, so correct only the
        # config object here rather than re-broadcasting every override
        app.dispatcher.reapply_runtime_state_to_config()
