from pydantic import BaseModel, conlist, constr


class ReviewSetMultipleReviewedBody(BaseModel):
    # List of string with at least one element and each element with at least one char
    ids: conlist(constr(min_length=1), min_length=1)


class ReviewDeleteMultipleReviewsBody(BaseModel):
    # List of string with at least one element and each element with at least one char
    ids: conlist(constr(min_length=1), min_length=1)
