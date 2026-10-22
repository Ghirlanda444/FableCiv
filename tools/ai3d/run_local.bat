@echo off
rem Makes every unit with the Hunyuan3D-2 app running on this PC (see tools\ai3d\LOCAL.md). Start the app first.
cd /d "%~dp0\..\.."
pip install -q gradio_client
python tools\ai3d\generate.py all ai3d_out --url http://127.0.0.1:8080
pause
