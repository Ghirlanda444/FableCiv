# Making the 3D units on your own PC (Hunyuan3D-2)

The free online demo allows about 2 minutes of GPU time a day, which covers only shapes for a few units. On your PC
there is no quota, so it can make all 225 unit pictures (92 base and unique units, plus the culture versions) with
textures. Plan for about 1–3 minutes per unit, so roughly 4–10 hours for the whole set. It can run overnight.

## What you need
- Windows with an **NVIDIA** graphics card. 6 GB VRAM is the minimum, and 12 GB or more is comfortable.
- 24 GB RAM or more (less VRAM means more RAM is used).
- About 40 GB of free disk space for the models.
- Driver 576.57 or newer.

## 1. Install the Hunyuan3D-2 app (one time, about 30 minutes)
1. From https://github.com/YanWenKun/Hunyuan3D-2-WinPortable/releases download **both** split files (`.001` and `.002`) of the
   CUDA 12.9 package. If your card is older than the RTX 20 series, take the CUDA 12.6 package instead.
2. Put both files in one folder and extract the `.001` file with 7-Zip to a short path such as `C:\AI\HY3D2`.
3. **Textures** need two free Microsoft/NVIDIA tools. Without them you only get grey shapes.
   - CUDA Toolkit 12.9.1 (https://developer.nvidia.com/cuda-downloads): in the installer, select "Libraries and Compilers".
   - Visual Studio Build Tools 2022 (https://visualstudio.microsoft.com/downloads/): select the "Desktop development with C++"
     workload.
4. Run `UPDATE.bat`, then `RUN.bat`. In the launcher choose **Hunyuan3D 2.0** and tick **Enable Texture Generation**.
   - The first start downloads the models and compiles the texture code, so it takes a while.
   - It is ready when it says it is running on port 8080.
5. Test it by opening http://localhost:8080, dropping in `web/assets/units/warrior.png`, and generating with texture.

## 2. Make every unit (one command)
You need Python 3.10+ (https://www.python.org/downloads/) and a copy of this repository. With the app still running, open
a terminal in the repository folder and run:

    pip install gradio_client
    python tools/ai3d/generate.py all ai3d_out --url http://127.0.0.1:8080

Or double-click `tools/ai3d/run_local.bat`.

- Models land in `ai3d_out/` as `hunyuan_<unit>.glb`.
- Culture versions are named `hunyuan_<culture>_<unit>.glb`.
- If it stops, run the same command again: finished units are skipped.
- To try a few units first: `python tools/ai3d/generate.py warrior,spearman,european/knight ai3d_out --url http://127.0.0.1:8080`.

## 3. Send them back
Zip `ai3d_out` and attach it to a new release on GitHub (Releases → Draft a new release → tag `ai3d-local` →
attach the zip → tick "Set as a pre-release" → Publish). The zip is too large to commit. Then tell Claude it's there.
Claude will convert them into game units:
- shrink to a game-sized polygon count
- add team-colour areas and the ink outline
- check them on the map

## Licence note (important before release)
The Tencent Hunyuan Community License does **not** cover the EU, UK or South Korea. If you are based in or sell into the EU, check
with Tencent or a lawyer before shipping Hunyuan-made models commercially. TRELLIS (Microsoft, MIT licence) has no such
limit. `generate.py --only trellis --url <a local TRELLIS app>` uses the same workflow if we need the safe route.
