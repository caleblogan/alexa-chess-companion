'use strict'
let config
try {
  config = require('../../alexa_chess_companion_config.json')
} catch(e) {
  console.log('Cant find config file. using env variables')
  config = process.env
}

const HOST = config['host']
const PORT = config['port']
