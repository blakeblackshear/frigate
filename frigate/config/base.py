from pydantic import BaseModel, ConfigDict


class FrigateBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", protected_namespaces=())
