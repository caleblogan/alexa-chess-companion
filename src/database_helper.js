'use strict'
const config = require('./config')
let credentials = {
    accessKeyId: config['accessKeyId'],
    secretAccessKey: config['secretAccessKey'],
    region: 'us-east-1'
}
console.log('Connecting to db')
const dynasty = require('dynasty')(credentials);

let users = dynasty.table('alexaChessCompanionData')
console.log('Got users users table')

module.exports = users
