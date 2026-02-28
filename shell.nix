{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # Qt runtime (replacement for qt6.full)
    qt6.qtbase
    qt6.qtwebengine

    # Python Qt bindings
    python3Packages.pyqt6
    python3Packages.pyqt6-webengine

    # Dev tools
    ty
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
  ];

  shellHook = ''
    export QTWEBENGINE_DISABLE_SANDBOX=1
    echo "Entered dev-shell (Qt WebEngine ready)"
  '';
}
