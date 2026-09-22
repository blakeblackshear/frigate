"""Detection section: models, the detectors they run on, and inference speed."""

import os

from frigate.analytics.collectors.common import rate
from frigate.analytics.context import ReportContext
from frigate.analytics.schema import DetectionModel, DetectionSection, ModelSource
from frigate.config.config import DEFAULT_MODEL
from frigate.const import MODEL_CACHE_DIR
from frigate.detectors.detector_config import SceneEnum
from frigate.detectors.detector_types import DetectorTypeEnum
from frigate.detectors.device import runner_names

# the paths FrigateConfig fills in for a model that sets none
BUNDLED_MODEL_PATHS = frozenset(
    {"/cpu_model.tflite", "/edgetpu_model.tflite", str(DEFAULT_MODEL["path"])}
)


def model_source(path: str | None) -> ModelSource:
    """Default, Frigate+ (a cached model next to its info file), or custom.

    Parsing rewrites plus://<id> to the model cache, so the prefix is gone by now.
    """
    if path is None or path in BUNDLED_MODEL_PATHS:
        return ModelSource.default

    if path.startswith(f"{MODEL_CACHE_DIR}/") and os.path.isfile(f"{path}.json"):
        return ModelSource.plus

    return ModelSource.custom


def collect(ctx: ReportContext) -> DetectionSection:
    config = ctx.config
    detectors = ctx.stats.get("detectors", {})
    model_specs = [(model, config.devices_for_model(model)) for model in config.models]

    # FrigateApp.start_detectors names the processes in this same order
    names = iter(runner_names([spec for _, specs in model_specs for spec in specs]))
    models: dict[SceneEnum, DetectionModel] = {}

    for model, specs in model_specs:
        speeds: list[float] = []

        for _ in specs:
            speed = detectors.get(next(names), {}).get("inference_speed")

            if isinstance(speed, int | float) and speed > 0:
                speeds.append(float(speed))

        models[model.scene] = DetectionModel(
            detector=DetectorTypeEnum(specs[0].detector),
            devices=len(specs),
            model_type=model.model_type,
            input=f"{model.width}x{model.height}",
            source=model_source(model.path),
            inference_ms=rate(sum(speeds) / len(speeds)) if speeds else None,
        )

    return DetectionSection(
        models=models,
        detection_fps=rate(ctx.stats.get("detection_fps")),
        skipped_fps=rate(ctx.stats.get("skipped_fps")),
    )
