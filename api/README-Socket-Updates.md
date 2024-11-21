# Websocket Updates

### Connect

```typescript
let socket = null;

function connect() {
    // check if already connected
    if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("Already connected to the socket!");
        return;
    }

    // connect to socket (endpoint is ws://{backend_base_url}/update-socket)
    socket = new WebSocket('ws://localhost:8080/update-socket');

    // listen to socket events
    socket.addEventListener('open', function (event) {
        console.log('Connected to the socket!');
    });

    socket.addEventListener('close', function (event) {
        console.log('Disconnected from the socket!');
    });

    socket.addEventListener('error', function (event) {
        console.error('Socket error occurred: ', event);
    });

    socket.addEventListener('message', function (event) {
        // this is the important listener. here you receive your updates

        // deserialize the event
        // format:
        //  groupId: string,
        //  eventType: MATCHES | PLAYERS | SEASONS | GROUPS | RULES | RULE_MOVES | ASSETS | PROFILES
        //  scope: string
        //  body: a dto matching the eventType (MatchDto, PlayerDto, ...)
        const socketEvent = JSON.parse(event.data);

        // do smth with the event...
    });
}
```

### Disconnect

```typescript
function disconnect() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
        console.log('Closing socket connection...');
    }
}
```

### Sending:

```typescript
function sendMessage(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
    }
}
```

### Subscribing

Not every connected client receives every event.
After a client connects he needs to subscribe to all groups he wants to receive events for:

```typescript
sendMessage({
    groupIds: [
        // provide as many group ids as you want
        'e49eabac-d96e-414e-953a-a5894e9585db',
        '4563420d-628e-4528-96a0-2f74b4cd4436',
        // duplicates are ignored
        '4563420d-628e-4528-96a0-2f74b4cd4436',
        ...
        // the group ids are validated to be in a correct uuid format so you can (in theory) send any string you want
        'test123'
    ]
})
```

### Events

A list of all event types with their corresponding dto and all available scopes:

#### Group (body: GroupDtp)

* **groupUpdate:** When a group is update

#### Matches (body: MatchDto)

* **matchCreate:** When a match is created
* **matchUpdate:** When a match is updated
* **matchDelete:** When a match is delete

#### Players (body: PlayerDto)

* **playerCreate:** When a player is created
* **playerDelete:** When a player is deleted

#### Rules (body: RuleDto[])

* **rulesWrite:** When the rule set of a group is overwritten

#### RuleMoves (body: RuleMoveDto)

* **ruleMovesCreate:** When a rule move is created
* **ruleMovesUpdate:** When a rule move is update
* **ruleMovesDelete:** When a rule move is delete

#### Seasons (body: SeasonStartDto | SeasonDto)

* **seasonStart:** When a new season is started
* **seasonUpdate:** When a season is updated

#### Assets (body: AssetMetadataDto | ProfileDto)

* **groupWallpaperSet:** When a groups wallpaper is updated
* **profileAvatarSet:** When a profiles avatar is updated
*
#### Profiles (body: ProfileDto)

* **profileCreate:** When a profile is created
* **profileUpdate:** When a profile is updated

### TODO

* Secure socket
* Limit message size
* Check if allowed origin wildcard is needed
