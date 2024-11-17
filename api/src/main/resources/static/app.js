//TODO remove
let stompClient = null;

function connect() {
    const socket = new SockJS('http://localhost:8080/update-socket');

    socket.onopen = function() {
        console.log('Connected to server!');

        setConnected(true);
    };

    socket.onmessage = function(event) {
        console.log('Received from server: ' + event.data);
    };

    socket.onerror = function(error) {
        console.log("Error occurred: " + error);
    };

    socket.onclose = function(event) {
        console.log("WebSocket connection closed!");

        setConnected(false);
    };

    stompClient = Stomp.over(socket);

    stompClient.connect({
            'groupIds': '5f1a1f36-bbff-4aa3-ba3f-143680df5ffb'
        },
        function (frame) {}
    );
}

function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
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
    $( "#connect" ).click(() => connect());
    $( "#disconnect" ).click(() => disconnect());
});