from pydantic import BaseModel


class GenericResponse(BaseModel):
    success: bool
    message: str
