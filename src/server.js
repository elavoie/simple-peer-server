var http = require('http')
var ws = require('ws')
var os = require('os')
var express = require('express')
var app = express()
var path = require('path')
app.use(express.static(path.join(__dirname, '../public')))

function getIPAddresses () {
  var ifaces = os.networkInterfaces()
  var addresses = []

  Object.keys(ifaces).forEach(function (ifname) {
    var alias = 0

    ifaces[ifname].forEach(function (iface) {
      if (iface.family !== 'IPv4' || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return
      }

      if (alias >= 1) {
        // this single interface has multiple ipv4 addresses
        addresses.push(iface.address)
      } else {
        // this interface has only one ipv4 adress
        addresses.push(iface.address)
      }
    })
  })
  return addresses
}

function Server (port) {
  port = port || process.env.PORT || 5000

  var self = this
  this.httpServer = http.createServer(app)
  this.httpServer.listen(port)
  getIPAddresses().forEach(function (addr) {
    console.log('Server listening on %s:%d', addr, port)
  })
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

Server.create = function () {
  return new Server()
}

Server.create()
