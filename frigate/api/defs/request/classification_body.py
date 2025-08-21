from pydantic import BaseModel


class RenameFaceBody(BaseModel):
    new_name: str


class AudioTranscriptionBody(BaseModel):
    event_id: str
