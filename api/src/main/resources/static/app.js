let socket = null;

function openSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket is already open.");
        return;
    }

    socket = new WebSocket('ws://localhost:8080/update-socket');

    socket.addEventListener('open', function (event) {
        console.log('Connected to the WebSocket server.');

        setConnected(true);
    });

    socket.addEventListener('close', function (event) {
        console.log('Disconnected from the WebSocket server.');

        setConnected(false);
    });

    socket.addEventListener('message', function (event) {
        const serverMessage = JSON.parse(event.data);
        console.log('Received message from server:', serverMessage);

        if (serverMessage.type === 'response') {
            console.log('Server responded:', serverMessage.message);
        }
    });

    socket.addEventListener('error', function (event) {
        console.error('WebSocket error:', event);
    });
}

function closeSocket() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
        console.log('Closing WebSocket connection...');
    } else {
        console.log('WebSocket is not open.');
    }
}

function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({groupIds: ['group1', 'group2']}));
        console.log('Sent message:', message);
    } else {
        console.log('WebSocket is not open, cannot send message.');
    }
}

function setConnected(connected) {
    $("#connect").prop("disabled", connected);
    $("#disconnect").prop("disabled", !connected);
    if (connected) {
        $("#conversation").show();
    }
    else {
        $("#conversation").hide();
    }
    $("#greetings").html("");
}

$(function () {
    $("form").on('submit', (e) => e.preventDefault());
    $("#connect").click(() => openSocket());
    $("#disconnect").click(() => closeSocket());
    $("#sendd").click(() => sendMessage("test123123"));
});