> **vocal-link-dashboard ~ A controller for vocal-link-recorder**

[Read notes →](docs/NOTES.md)

## Prerequisites

Before running the project, install:

- **python 3.13**
- **pip**
- **git**
- **tsc** (required only for developer mode)
- **Qt WebEngine** (on **Linux distributions** only)


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

#### Developer Mode

```bash
python app.py --debug
```


## Creating test clients

```bash
python puppets.py 3 # for creating 3 test clients
```

### License

This project is licensed under the **MIT License**.

You are free to use, modify, distribute, and sublicense this software, provided that the original copyright and license notice are included.
