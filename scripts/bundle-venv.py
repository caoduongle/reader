"""
Bundle and relocate Python virtual environment for Windows Electron packaging.

This script converts a standard Windows Python virtualenv (python -m venv)
into a self-contained, relocatable Python distribution by:
1. Replacing stub launchers in venv/Scripts/ with real Python binaries and runtime DLLs.
2. Copying base Python standard library modules into venv/Lib/.
3. Copying base Python C-extension DLLs into venv/DLLs/.
4. Removing pyvenv.cfg so Python falls back to landmark-based path resolution.
"""

import os
import shutil
import sys


def bundle_venv(target_venv: str = 'python-backend/venv') -> None:
    if sys.platform != 'win32':
        print(f"[bundle-venv] Non-Windows platform ({sys.platform}) detected. Skipping venv relocation.")
        return

    venv_dir = os.path.abspath(target_venv)
    if not os.path.isdir(venv_dir):
        raise FileNotFoundError(f"[bundle-venv] Target virtual environment not found at: {venv_dir}")

    base_prefix = sys.base_prefix
    print(f"[bundle-venv] Source base Python: {base_prefix}")
    print(f"[bundle-venv] Target virtualenv:  {venv_dir}")

    scripts_dir = os.path.join(venv_dir, 'Scripts')
    lib_dir = os.path.join(venv_dir, 'Lib')
    dlls_dir = os.path.join(venv_dir, 'DLLs')

    os.makedirs(scripts_dir, exist_ok=True)
    os.makedirs(lib_dir, exist_ok=True)
    os.makedirs(dlls_dir, exist_ok=True)

    # 1. Copy runtime binaries and VC runtime DLLs into Scripts/
    runtime_binaries = [
        'python.exe',
        'pythonw.exe',
        f'python{sys.version_info.major}{sys.version_info.minor}.dll',
        f'python{sys.version_info.major}.dll',
        'vcruntime140.dll',
        'vcruntime140_1.dll',
    ]

    copied_binaries = 0
    for binary_name in runtime_binaries:
        src = os.path.join(base_prefix, binary_name)
        if os.path.exists(src):
            dest = os.path.join(scripts_dir, binary_name)
            shutil.copy2(src, dest)
            copied_binaries += 1
            print(f"[bundle-venv] Copied binary/DLL: {binary_name} -> Scripts/")

    # Also check if DLLs exist in base DLLs folder or System32 for vcruntime
    for dll in ['vcruntime140.dll', 'vcruntime140_1.dll']:
        dest = os.path.join(scripts_dir, dll)
        if not os.path.exists(dest):
            # Try searching base_prefix/DLLs
            cand = os.path.join(base_prefix, 'DLLs', dll)
            if os.path.exists(cand):
                shutil.copy2(cand, dest)
                print(f"[bundle-venv] Copied {dll} from DLLs -> Scripts/")

    # 2. Copy base DLLs/ into venv/DLLs/
    base_dlls = os.path.join(base_prefix, 'DLLs')
    if os.path.isdir(base_dlls):
        print(f"[bundle-venv] Copying base extension DLLs from {base_dlls}...")
        for item in os.listdir(base_dlls):
            src_item = os.path.join(base_dlls, item)
            dest_item = os.path.join(dlls_dir, item)
            if os.path.isdir(src_item):
                shutil.copytree(src_item, dest_item, dirs_exist_ok=True)
            else:
                shutil.copy2(src_item, dest_item)

    # 3. Copy standard library modules into venv/Lib/ (excluding site-packages)
    base_lib = os.path.join(base_prefix, 'Lib')
    if os.path.isdir(base_lib):
        print(f"[bundle-venv] Copying base standard library from {base_lib}...")
        for item in os.listdir(base_lib):
            if item.lower() == 'site-packages':
                continue
            src_item = os.path.join(base_lib, item)
            dest_item = os.path.join(lib_dir, item)
            if os.path.isdir(src_item):
                shutil.copytree(src_item, dest_item, dirs_exist_ok=True)
            else:
                shutil.copy2(src_item, dest_item)

    # 4. Remove pyvenv.cfg so Python launcher does not attempt to redirect to CI runner paths
    cfg_file = os.path.join(venv_dir, 'pyvenv.cfg')
    if os.path.exists(cfg_file):
        os.remove(cfg_file)
        print("[bundle-venv] Removed pyvenv.cfg to activate portable landmark resolution.")

    print("[bundle-venv] SUCCESS: Python virtual environment is now completely self-contained and relocatable.")


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'python-backend/venv'
    bundle_venv(target)
