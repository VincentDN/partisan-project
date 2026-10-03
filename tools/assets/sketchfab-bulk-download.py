#!/usr/bin/env python3
"""Bulk-download the chosen Sketchfab models on your own computer and drop them into inbound/sketchfab/.

Run it from your local clone of the repository (Python 3.8+, no extra packages):

    python3 tools/assets/sketchfab-bulk-download.py                 # all 39 sources
    python3 tools/assets/sketchfab-bulk-download.py g3 m16 spear    # just these ids
    python3 tools/assets/sketchfab-bulk-download.py --list          # show what it would fetch

Token: set SKETCHFAB_TOKEN in your environment, or the script asks for it (input is hidden). Find it on
sketchfab.com > Settings > Password & API. The token is only sent to api.sketchfab.com and is never written to disk.

Afterwards commit and push the new folder so the next agent session can import it:

    git add inbound/sketchfab && git commit -m "Sketchfab sources" && git push

Already-downloaded models are skipped, so you can stop and re-run at any time.
"""
import argparse
import getpass
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
SOURCES = HERE / "sketchfab-sources.json"
API = "https://api.sketchfab.com/v3/models/{uid}/download"
UA = "partisan-project-asset-fetch/1.0"


def read_secret(prompt, getwch=None):
    """Read a secret and show one * per character (a plain hidden prompt looks frozen, especially on Windows).
    Paste works (right-click or Ctrl+Shift+V). Enter finishes, Backspace deletes. `getwch` is injectable for tests."""
    if getwch is None:
        try:
            import msvcrt  # Windows
            getwch = msvcrt.getwch
        except ImportError:
            return getpass.getpass(prompt + "(hidden, paste then press Enter): ")
    print(prompt + "(paste it, then press Enter; you will see * as it arrives): ", end="", flush=True)
    chars = []
    while True:
        ch = getwch()
        if ch in ("\r", "\n"):
            print()
            return "".join(chars)
        if ch == "\x03":
            raise KeyboardInterrupt
        if ch in ("\x08", "\x7f"):
            if chars:
                chars.pop()
                print("\b \b", end="", flush=True)
        elif ch in ("\x00", "\xe0"):
            getwch()  # swallow the second half of a function or arrow key
        elif ch >= " ":
            chars.append(ch)
            print("*", end="", flush=True)


def request(url, token=None, retries=3):
    headers = {"User-Agent": UA}
    if token:  # only ever for api.sketchfab.com
        headers["Authorization"] = f"Token {token}"
    for attempt in range(retries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=300)
        except urllib.error.HTTPError as e:
            if e.code in (401, 403):
                raise SystemExit(f"Sketchfab refused the token ({e.code}). Check it on sketchfab.com > Settings > Password & API.")
            if e.code == 429 or e.code >= 500:  # rate limit or a hiccup: back off and retry
                time.sleep(5 * (attempt + 1))
                continue
            raise
        except urllib.error.URLError:
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"gave up after {retries} tries: {url.split('?')[0]}")


def download(url, dest):
    tmp = dest.with_suffix(dest.suffix + ".part")
    with request(url) as r, open(tmp, "wb") as f:  # signed URL: no token
        total = int(r.headers.get("Content-Length") or 0)
        done = 0
        while chunk := r.read(1 << 20):
            f.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r      {done / 1e6:6.1f} / {total / 1e6:.1f} MB", end="", flush=True)
    print()
    tmp.replace(dest)


def fetch(source, token, out_root):
    out = out_root / source["id"]
    if (out / "scene.glb").exists() or (out / "scene.gltf").exists():
        return "skip"
    with request(API.format(uid=source["uid"]), token) as r:
        info = json.load(r)
    out.mkdir(parents=True, exist_ok=True)
    if info.get("glb", {}).get("url"):
        download(info["glb"]["url"], out / "scene.glb")
    elif info.get("gltf", {}).get("url"):
        archive = out / "download.zip"
        download(info["gltf"]["url"], archive)
        with zipfile.ZipFile(archive) as z:
            z.extractall(out)
        archive.unlink()
        # some archives nest everything one folder down: lift it up so scene.gltf sits in out/
        if not (out / "scene.gltf").exists():
            found = next(out.rglob("scene.gltf"), None) or next(out.rglob("*.gltf"), None)
            if found:
                for item in found.parent.iterdir():
                    shutil.move(str(item), out / item.name)
                if found.name != "scene.gltf" and (out / found.name).exists():
                    (out / found.name).rename(out / "scene.gltf")
    else:
        shutil.rmtree(out, ignore_errors=True)
        return "no glTF offered (the model may no longer be downloadable)"
    (out / "source.json").write_text(json.dumps(source, indent=1) + "\n")
    return "ok"


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("ids", nargs="*", help="source ids from sketchfab-sources.json (default: all)")
    p.add_argument("--list", action="store_true", help="list the sources and exit")
    p.add_argument("--no-pause", action="store_true", help="do not wait for Enter at the end (Windows)")
    p.add_argument("--out", default=str(REPO / "inbound" / "sketchfab"), help="where to put them (default: inbound/sketchfab)")
    a = p.parse_args()
    sources = json.loads(SOURCES.read_text())["sources"]
    if a.ids:
        unknown = set(a.ids) - {s["id"] for s in sources}
        if unknown:
            raise SystemExit(f"unknown ids: {', '.join(sorted(unknown))} (see --list)")
        sources = [s for s in sources if s["id"] in a.ids]
    if a.list:
        for s in sources:
            print(f"{s['id']:24} {s['author']:18} {s['name']}")
        return
    token = os.environ.get("SKETCHFAB_TOKEN") or read_secret("Sketchfab API token ").strip()
    if not token:
        raise SystemExit("No token given.")
    out_root = Path(a.out)
    out_root.mkdir(parents=True, exist_ok=True)
    failed = []
    for i, s in enumerate(sources, 1):
        print(f"[{i}/{len(sources)}] {s['id']}  ({s['name']})")
        try:
            result = fetch(s, token, out_root)
        except SystemExit:
            raise
        except Exception as e:  # keep going; report at the end
            result = f"failed: {e}"
        print(f"      {result}")
        if result not in ("ok", "skip"):
            failed.append((s["id"], result))
        time.sleep(1)  # be gentle with the API
    print(f"\nDone: {len(sources) - len(failed)}/{len(sources)} in {out_root}")
    for sid, why in failed:
        print(f"  {sid}: {why}")
    if not failed:
        print('Next: git add inbound/sketchfab && git commit -m "Sketchfab sources" && git push')
    sys.exit(1 if failed else 0)


def pause_before_closing():
    """A double-clicked script's window vanishes when it ends; on Windows wait so the result can be read."""
    if os.name == "nt" and sys.stdin and sys.stdin.isatty() and "--no-pause" not in sys.argv:
        try:
            input("\nPress Enter to close this window.")
        except (EOFError, KeyboardInterrupt):
            pass


if __name__ == "__main__":
    try:
        main()
    except SystemExit as e:
        if e.code not in (None, 0) and isinstance(e.code, str):
            print(e.code)  # show the message before the window closes
        pause_before_closing()
        raise SystemExit(0 if e.code in (None, 0) else 1)
    except KeyboardInterrupt:
        print("\nCancelled.")
        pause_before_closing()
        raise SystemExit(1)
    pause_before_closing()
