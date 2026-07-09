from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ChartConfig(BaseModel):
    """
    Chart configuration returned by the backend.

    The frontend uses this configuration to render a chart
    using Recharts.
    """

    model_config = ConfigDict(extra="forbid")

    type: Literal["bar", "line", "pie", "scatter"]

    title: str

    # Used for bar / line / scatter
    xKey: str | None = None
    yKey: str | None = None

    # Used for pie charts
    nameKey: str | None = None
    valueKey: str | None = None

    data: list[dict[str, Any]] = Field(default_factory=list)