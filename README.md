# SPC Control Chart

This repository now includes a simple Python utility for creating an **SPC Individuals (I) control chart** from numeric observations.

## What it calculates

Given a sequence of measurements, the script computes:

- Center line (CL): process mean
- Upper control limit (UCL): `mean + 3 * sigma`
- Lower control limit (LCL): `mean - 3 * sigma`

For an Individuals chart, `sigma` is estimated from moving ranges:

- `MR[i] = |x[i] - x[i-1]|`
- `MRbar = average(MR)`
- `sigma = MRbar / 1.128`

## Usage

```bash
python3 spc_control_chart.py --data "10.1,9.9,10.0,10.2,10.1,9.8,10.0"
```

Optional output to CSV:

```bash
python3 spc_control_chart.py --data "10.1,9.9,10.0,10.2,10.1,9.8,10.0" --csv report.csv
```

If you omit `--data`, a built-in sample dataset is used.

## Example output

```
SPC Individuals Control Chart Summary
-------------------------------------
Count: 7
Mean (CL): 10.0143
Sigma (estimated): 0.1773
UCL: 10.5462
LCL: 9.4823
Out-of-control points: none
```
