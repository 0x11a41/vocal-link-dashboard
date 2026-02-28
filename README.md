> **vocal-link-dashboard ~ A controller for vocal-link-recorder**

[Read notes →](docs/NOTES.md)

## Prerequisites

Before running the project, install:

- python 3.13
- pip
- git
- tsc (optional, required only for debug mode only)
- Qt WebEngine (on Linux distributions only)
- **IMPORTANT:** TCP port - 6210 and UDP port - 5353 must be open.

## Setup

#### 1. Clone Repository

```bash
git clone https://github.com/0x11a41/vocal-link-dashboard
cd vocal-link-dashboard
```

#### 2. Create Environment

##### Windows

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

##### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Running the server

#### Desktop Mode (Default)

Starts backend + native window.

```bash
python app.py
```

#### Running in Debug Mode

```bash
python app.py --debug
```

## Creating test clients

Command to create 3 test clients:

```bash
python puppets.py 3
```

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) for details.
