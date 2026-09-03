# -*- mode: python ; coding: utf-8 -*-

import pathlib
import pyzbar

_pyzbar_dir = pathlib.Path(pyzbar.__file__).parent
_PROJECT_ROOT = pathlib.Path.cwd()

a = Analysis(
    ['main.py'],
    pathex=[str(_PROJECT_ROOT)],
    binaries=[
        (str(dll), 'pyzbar')
        for dll in sorted(_pyzbar_dir.glob('*.dll'))
    ],
    datas=[
        (str(_PROJECT_ROOT / 'config.yaml'), '.'),
        (str(_PROJECT_ROOT / 'assets'), 'assets'),
    ],
    hiddenimports=[
        'cv2',
        'pyzbar',
        'pyzbar.pyzbar',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'PySide6', 'PyQt6', 'PySide2', 'PyQt5', 'tkinter', 
        'IPython', 'notebook'
    ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='UPMS_App',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets/app_icon.ico'],
    version='version_info.txt',
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='UPMS_App',
)
