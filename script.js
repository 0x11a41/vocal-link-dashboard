let ws = new WebSocket("ws://localhost:8000/ws/control");

function log(text){
	document.getElementById("log").innerHTML += "<br>" + text;
}

socket.onopen = () => {
	log("Connected to server");
};

socket.onmessage = (event) => {
	log("Server: " + event.data);
};
	
function start(){
	let msg = {
		action: "START_RECORDING"
	};
	socket.send(JSON.stringify(msg));
}

function stop(){
	let msg = {
		action: "STOP_RECORDING"
	};
	socket.send(JSON.stringify(msg));
}

function isAlive() {
	fetch('http://127.0.0.1:8000/ping')
    .then(response => response.json())
    .then(data => {
    	document.getElementById("log").innerText += "\n" + data.status;
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
