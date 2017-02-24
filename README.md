# simple-peer-server
Basic server to test WebRTC connections of [SimplePeers](http://github.com/feross/simple-peer) across different services and network conditions

# Usage

    # In one terminal
    node src/server.js

    # In a second terminal (peer)
    node bin/peer localhost:5000

    # In a third terminal (initiator peer)
    node bin/peer localhost:5000 true
