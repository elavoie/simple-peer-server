var http = require('http')
var ws = require('ws')
var express = require('express')
var app = express()
var path = require('path')
app.use(express.static(path.join(__dirname, '../public')))

function Server (port) {
  port = port || process.env.PORT || 5000

  var self = this
  this.httpServer = http.createServer(app)
  this.httpServer.listen(port)
  console.log('http server listening on %d', port)
  this.initiator = null
  this.initiatorQueue = []
  this.peer = null
  this.peerQueue = []

  this.server = new ws.Server({server: this.httpServer})
    .on('connection/initiator', function (ws) {
      ws.on('message', function (data) {
        if (!self.peer) {
          self.peerQueue.push(data)
        } else {
          console.log('sending to peer: ' + data)
          self.peer.send(data)
        }
      })
      self.initiator = ws

      var queue = self.initiatorQueue.slice()
      self.initiatorQueue = []
      for (var i = 0; i < queue.length; ++i) {
        console.log('delayed sending to initiator: ' + queue[i])
        self.initiator.send(queue[i])
      }
    })
    .on('connection/peer', function (ws) {
      ws.on('message', function (data) {
        if (!self.initiator) {
          self.initiatorQueue.push(data)
        } else {
          console.log('sending to initiator: ' + data)
          self.initiator.send(data)
        }
      })

      self.peer = ws
      var queue = self.peerQueue.slice()
      self.peerQueue = []
      for (var i = 0; i < queue.length; ++i) {
        console.log('delayed sending to peer: ' + queue[i])
        self.peer.send(queue[i])
      }
    })

  return this
}

var s = new Server()
