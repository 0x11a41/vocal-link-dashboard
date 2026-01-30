from pydantic import BaseModel, Field, IPvAnyAddress
from enum import Enum
from typing import Optional


class Status(str, Enum):
    IDLE = "idle"
    RECORDING = "recording"
    UPLOADING = "uploading"
    ERROR = "error"


class RecorderInfo(BaseModel):
    id: str
    name: str = Field(min_length=1, max_length=50)
    ip: IPvAnyAddress
    status: Status = Status.IDLE
    battery_level: Optional[int] = None


class ServerInfo(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    ip: IPvAnyAddress 
    clients: int = Field(ge=0, default=0)
    

class SyncResponse(BaseModel):
    type: str = "SYNC"
    t1: int  # Client Origin
    t2: int  # Server Receive
    t3: int  # Server Transmit
