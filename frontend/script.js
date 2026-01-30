let ws = new WebSocket("ws://localhost:6210/ws/command");

const RECORDING = "Stop";
const STOPPED = "Start";
let state = STOPPED;

function setState(current) {
  const recordButton = document.getElementById("state");
  recordButton.innerText = current;
  if (current === RECORDING) {
    recordButton.style.backgroundColor = "salmon";
  } else if (current === STOPPED) {
    recordButton.style.backgroundColor = "lightgreen";
  }
  state = current
}

function handleRecording() {
  let msg;  
  if (state === STOPPED) {
    msg = { action: "START_RECORDING" };
    setState(RECORDING)
  } else {
    msg = { action: "STOP_RECORDING" };
    setState(STOPPED)
  }
  ws.send(JSON.stringify(msg))
  console.log(msg)
}

ws.onopen = () => {
	console.log("Connected to backend server");
};

ws.onmessage = (event) => {
	console.log("Client: " + event.data);
};
