from typing import Any

from pydantic import BaseModel, ConfigDict


class FrigateBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", protected_namespaces=())

    def get_nested_object(self, path: str) -> Any:
        parts = path.split("/")
        obj = self
        for part in parts:
            if part == "config":
                continue

            if isinstance(obj, BaseModel):
                try:
                    obj = getattr(obj, part)
                except AttributeError:
                    return None
            elif isinstance(obj, dict):
                try:
                    obj = obj[part]
                except KeyError:
                    return None
            else:
                return None

        return obj
