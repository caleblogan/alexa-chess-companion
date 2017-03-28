'use strict'
const natural = require('natural')
const request = require('request')

const board_positions_dict = require('./board_positions')

let config
try {
  config = require('../../alexa_chess_companion_config.json')
} catch(e) {
  console.log('Cant find config file. using env variables')
  config = process.env
}

const HOST = config['host']
const PORT = config['port']

module.exports = {
  /**
   * Executes a chess move.
   * @param  {[type]} from the starting position
   * @param  {[type]} to   the end position
   * @return [type]
   */
  move: function(from, to, userId) {
    return new Promise((resolve, reject) => {
      request.get(`${HOST}:${PORT}/api/move?from=${from}&to=${to}&userId=${userId}`)
          .on('data', data => {
            resolve(data)
          })
          .on('error', err => {
            reject(data)
          })
    })
  },
  /**
   * Creates a new game if userId is valid
   * Returns a promise
   * @param  {[string]} userId [description]
   * @return [Promise]          [description]
   */
  newGame: function(userId, players, color) {
    let url = `${HOST}:${PORT}/api/new_game?userId=${userId}`
    if (players) {
      url += '&players=' + players
    }
    if (color) {
      url += '&color=' + color
    }
    return new Promise((resolve, reject) => {
      request.get(url)
          .on('data', data => {
            resolve(data)
          })
          .on('error', err => {
            reject(data)
          })
    })
  },
  /**
   * Resets the games fen keeping the state of color and players
   * @param  {[type]} userId [description]
   * @return [type]          [description]
   */
  resetGame: function(userId) {
    let url = `${HOST}:${PORT}/api/reset?userId=${userId}`
    return new Promise((resolve, reject) => {
      request.get(url)
          .on('data', data => {
            resolve(data)
          })
          .on('error', err => {
            reject(data)
          })
    })
  },
  /**
   * Converts a speechPosition like alpha 1 to a1
   * Returns empty string if speechPosition is undefined
   * Does a lot of hacky shit to get the best match to users speech
   * @param  {string} speechPosition [description]
   * @return  [string]                 chessboard position eg. a1, b2, b8
   */
  convertToPosition: function(speechPosition) {
    if (!speechPosition) {
      return ''
    }
    speechPosition = speechPosition.replace('from', '')
    speechPosition = speechPosition.replace('for', '4')
    speechPosition = speechPosition.replace('to', '2')

    // 2 gets mixed up with the to in the utterances
    // and then gets omitted from the slot PositionA
    if (speechPosition.search(/[1-8]/) === -1) {
      speechPosition += ' 2'
    }
    console.log('speechPosition:', speechPosition)
    let boardPosition = fuzzymatch(board_positions_dict, speechPosition)
    return boardPosition
  },
  /**
   * Takes in a required moveA and possibly moveB and returns a speech
   * response in the form of [color], [form]-[to]
   * @param  {[type]} moveA [description]
   * @param  {[type]} moveB [description]
   * @return [type]         [description]
   */
  buildSpeechMoveResponse: function(moveA, moveB) {
    let speechResponse = ''
    speechResponse += moveA.color === 'w' ? 'white, ' : 'black, '
    speechResponse += '<break time="300ms"/>'
    speechResponse += moveA.from + ' to ' + moveA.to
    if (moveB) {
      speechResponse += '\n <break time="400ms"/>'
      speechResponse += moveB.color === 'w' ? 'white, ' : 'black, '
      speechResponse += '<break time="300ms"/>'
      speechResponse += moveB.from + ' to ' + moveB.to
    }
    return speechResponse
  }
}

function fuzzymatch(lookuptable, searchword) {
  let metaphone = natural.Metaphone
  let dm = natural.DoubleMetaphone

  let itemNames = Object.keys(lookuptable)
  let soundAlike = []
  for (let i = 0; i < itemNames.length; ++i) {
    let item = itemNames[i]
    // let alike = metaphone.compare(metaphone.item, searchword)
    let alike = metaphone.process(item, 1) === metaphone.process(searchword, 1)
    if (alike) {
      soundAlike.push(item)
    }
  }

  // If we dont find any words that sound alike look for edit distance on
  // all items.
  if (!soundAlike.length) {
    soundAlike = itemNames
  }
  let minItem = soundAlike[0]
  let minDistance = natural.LevenshteinDistance(minItem, searchword)
  for (let i = 1; i < soundAlike.length; ++i) {
    let dist = natural.LevenshteinDistance(soundAlike[i], searchword)
    if (dist < minDistance) {
      minItem = soundAlike[i]
      minDistance = dist
    } else if (dist == minDistance) {
      let minDPLev = natural.LevenshteinDistance(metaphone.process(minItem), metaphone.process(searchword))
      let itemDPLev = natural.LevenshteinDistance(metaphone.process(soundAlike[i]), metaphone.process(searchword))
      if (itemDPLev < minDPLev) {
        minItem = soundAlike[i]
        minDistance = dist
      }
    }
  }
  return lookuptable[minItem]
}
