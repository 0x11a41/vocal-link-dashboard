{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    ty
    ruff
    vscode-css-languageserver
    superhtml
    vscode-json-languageserver
    typescript-language-server
    typescript

    # Python deps
    python3Packages.uvicorn
    python3Packages.fastapi
    python3Packages.websockets
    python3Packages.livereload
    python3Packages.httpx
    python3Packages.zeroconf
    python3Packages.pydantic
    python3Packages.qrcode
    python3Packages.faster-whisper
    python3Packages.pillow
    python3Packages.pydub
    python3Packages.pywebview
    python3Packages.psutil
    python3Packages.noisereduce
    python3Packages.numpy
    python3Packages.torch
    python3Packages.python-multipart
  ];

  shellHook = ''
    echo "Entered dev-shell."
  '';
}
