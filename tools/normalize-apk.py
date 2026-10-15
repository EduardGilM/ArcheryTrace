"""Normaliza las rutas ZIP de aapt2 en Windows antes de firmar el APK."""
import sys
import zipfile
from pathlib import Path

source = Path(sys.argv[1])
temporary = source.with_suffix('.normalized.apk')
with zipfile.ZipFile(source) as archive, zipfile.ZipFile(temporary, 'w') as normalized:
    for entry in archive.infolist():
        data = archive.read(entry.filename)
        entry.filename = entry.filename.replace('\\', '/')
        normalized.writestr(entry, data)
temporary.replace(source)
