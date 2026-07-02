# Publishing `brier` to PyPI

The package name `brier` is currently free on PyPI. Pure standard library, no
runtime dependencies.

## One-time setup

```bash
python3 -m pip install --upgrade build twine
```

Create a PyPI account and an API token at https://pypi.org/manage/account/token/.

## Build + publish

```bash
cd packages/brier-sdk-py
rm -rf dist
python3 -m build          # creates dist/brier-0.1.0.tar.gz + .whl
python3 -m twine check dist/*    # validates metadata + README rendering
python3 -m twine upload dist/*   # paste the API token when prompted
```

That's it. For a new version, bump `version` in `pyproject.toml`, rebuild, upload.

## Verify after publishing

```bash
pip install brier
python3 -c "from brier import BrierClient; print('ok')"
```

## Tip: test on TestPyPI first

```bash
python3 -m twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ brier
```
