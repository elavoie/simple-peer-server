#!/usr/bin/env node
var SimplePeer = require('simple-peer')
var SimpleSocket = require('simple-websocket')
var probe = require('pull-probe')
var pull = require('pull-stream')
var toPull = require('stream-to-pull-stream') 
var wrtc = require('electron-webrtc')()

var host = process.argv[2]
console.log('host: ' + host)
var initiator = Boolean(process.argv[3])
console.log('initiator: ' + initiator)
var socket = new SimpleSocket('ws://' + host + (initiator ? '/initiator' : '/peer'))

console.log('socket: ' + socket)

var timeout = null
function ping () {
  if (p) {
    p.send('ping')
    timeout = setTimeout(ping, 1000)   
  }
}

var closed = false
function shutdown() {
  if (closed) return
  closed = true
  console.log('shutdown');
  clearTimeout(timeout)

  // wrtc needs to be closed before we destroy the peer,
  // otherwise we endup with all sorts of errors
  wrtc.close()
  if (p) {
    p.destroy()
    p = null
  }
  if (socket) { 
    socket.destroy()
    socket = null
  }
}

process.on('SIGINT', function() {
  shutdown()  
});

var p = null
socket.on('connect', function () {
  p = new SimplePeer({ 'initiator': initiator, wrtc: wrtc })

  p.on('signal', function (data) {
    console.log('signal: ' + JSON.stringify(data))
    socket.send(JSON.stringify(data))
  })

  p.on('connect', function () {
    console.log('connected')
    if (initiator) {
      // ping is the other option
      // ping()

      var s = toPull.duplex(p, function (err) {
        if (err) {
          console.log('duplex stream error: ' + err)
        }
      })

      // Continously send numbers
      pull(
        pull.count(),
        pull.map(String),
        probe('peer:before-send'),
        pull.asyncMap(function (x,cb) { setTimeout(function () { cb(null, x) }, 1000) }),
        s,
        pull.map(String),
        probe('peer:after-receive'),
        pull.through(function (x) { console.log(x.toString()) }),
        pull.drain() 
      )
    }
  })

  p.on('close', function () {
    console.log('closed')
    shutdown()
  })

  p.on('error', function (err) {
    console.log('error: ' + err)
    shutdown()
  })

  p.on('data', function (data) {
    console.log('data: ' + data)
    if (data.toString() === 'ping') {
      p.send('pong')
    } else if (!initiator) {
      var n = Number.parseInt(data)
      p.send(String(n*n))
    }
  })
})

socket.on('data', function (data) {
  if (p) p.signal(JSON.parse(data))
})

