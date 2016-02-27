'use strict';

let net = require('net'), bufferpack = require('bufferpack');


const SocketObjectProtocol = Object.defineProperties(function SocketObjectProtocol(opts) {
  this.options = opts;
  this.chunked = new Buffer('', 'ascii');
  this._receiveCBs = [];
}, {
  BUFFER_LENGTH: { configurable: true, value: 4 },
  PACK_FORMAT: { configurable: true, value: 'L>' } // big endian signed 32 bit
});

Object.defineProperties(SocketObjectProtocol.prototype, {

  complete: { value: function(res) {
    this._receiveCBs.forEach(function(f) { f.call(f, this); }, JSON.parse(res.toString('ascii')));
  } },

  getSize: { value: function(data) {
    return bufferpack.unpack(SocketObjectProtocol.PACK_FORMAT, data)[0];
  } },

  chunk: { value: function(data) {
    this.chunked = Buffer.concat([this.chunked, data]);
    let buffer_size = SocketObjectProtocol.BUFFER_LENGTH;
    let size;

    while(this.chunked.length >= buffer_size) {
      if(this.chunked.length >= buffer_size + (size = this.getSize(this.chunked.slice(0, buffer_size)))) {
        this.complete(this.chunked.slice(buffer_size, buffer_size + size));
        this.chunked = this.chunked.slice(buffer_size + size, -1);
      } else {
        break;
      }
    }
  } },

  sendObject: { value: function(obj) {
    obj = JSON.stringify(obj);
    let buffer = bufferpack.pack(SocketObjectProtocol.PACK_FORMAT, [obj.length]).toString('ascii');
    this.client.write(buffer + obj);
  } },

  onReceive: { value: function(cb) {
    if( typeof cb == 'function') this._receiveCBs.push(cb);
  } },

  init: { value: function() {
    this.client = net.connect(this.options, function() {
      this.client.on('data', this.chunk.bind(this));
      this.client.on('error', console.log.bind(console));
    }.bind(this));
  } }
});

module.exports = SocketObjectProtocol;
