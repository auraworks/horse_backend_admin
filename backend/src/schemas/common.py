from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    """Base model: camelCase JSON keys, snake_case attributes."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ListResponse(BaseModel, Generic[T]):
    data: list[T] = Field(description="Page of rows")
    count: int = Field(description="Total rows matching the filters", examples=[42])
    page: int = Field(description="Current page (1-based)", examples=[1])
    limit: int = Field(description="Page size", examples=[20])
