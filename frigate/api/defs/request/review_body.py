from pydantic import BaseModel, conlist, constr


class ReviewModifyMultipleBody(BaseModel):
    # List of string with at least one element and each element with at least one char
    ids: conlist(constr(min_length=1), min_length=1)
    # Whether to mark items as reviewed (True) or unreviewed (False)
    reviewed: bool = True
