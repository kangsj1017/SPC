#!/usr/bin/env python3
"""Create a simple SPC Individuals control chart summary from numeric data."""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
from typing import Iterable, List

D2_FOR_N2 = 1.128


@dataclass(frozen=True)
class ControlLimits:
    mean: float
    sigma: float
    ucl: float
    lcl: float


@dataclass(frozen=True)
class ChartResult:
    values: List[float]
    limits: ControlLimits
    out_of_control_indices: List[int]


def parse_data(raw: str) -> List[float]:
    values = []
    for token in raw.split(","):
        token = token.strip()
        if not token:
            continue
        values.append(float(token))
    if len(values) < 2:
        raise ValueError("At least two numeric observations are required.")
    return values


def moving_ranges(values: Iterable[float]) -> List[float]:
    v = list(values)
    return [abs(v[i] - v[i - 1]) for i in range(1, len(v))]


def compute_limits(values: List[float]) -> ControlLimits:
    mean = sum(values) / len(values)
    mr = moving_ranges(values)
    mr_bar = sum(mr) / len(mr)
    sigma = mr_bar / D2_FOR_N2
    ucl = mean + 3.0 * sigma
    lcl = mean - 3.0 * sigma
    return ControlLimits(mean=mean, sigma=sigma, ucl=ucl, lcl=lcl)


def build_chart(values: List[float]) -> ChartResult:
    limits = compute_limits(values)
    out = [
        i
        for i, x in enumerate(values)
        if x > limits.ucl or x < limits.lcl
    ]
    return ChartResult(values=values, limits=limits, out_of_control_indices=out)


def write_csv(path: str, result: ChartResult) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["index", "value", "CL", "UCL", "LCL", "out_of_control"])
        for i, x in enumerate(result.values):
            writer.writerow(
                [
                    i,
                    f"{x:.6f}",
                    f"{result.limits.mean:.6f}",
                    f"{result.limits.ucl:.6f}",
                    f"{result.limits.lcl:.6f}",
                    "yes" if i in result.out_of_control_indices else "no",
                ]
            )


def print_summary(result: ChartResult) -> None:
    print("SPC Individuals Control Chart Summary")
    print("-" * 37)
    print(f"Count: {len(result.values)}")
    print(f"Mean (CL): {result.limits.mean:.4f}")
    print(f"Sigma (estimated): {result.limits.sigma:.4f}")
    print(f"UCL: {result.limits.ucl:.4f}")
    print(f"LCL: {result.limits.lcl:.4f}")

    if result.out_of_control_indices:
        points = ", ".join(str(i) for i in result.out_of_control_indices)
        print(f"Out-of-control points (0-based indices): {points}")
    else:
        print("Out-of-control points: none")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--data",
        type=str,
        default="10.1,9.9,10.0,10.2,10.1,9.8,10.0,10.3,9.9,10.1",
        help="Comma-separated numeric observations",
    )
    parser.add_argument("--csv", type=str, default="", help="Optional CSV output path")
    args = parser.parse_args()

    values = parse_data(args.data)
    result = build_chart(values)
    print_summary(result)

    if args.csv:
        write_csv(args.csv, result)
        print(f"CSV written: {args.csv}")


if __name__ == "__main__":
    main()
