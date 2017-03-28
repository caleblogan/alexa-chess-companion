'use strict'
const Alexa = require('alexa-sdk')
const request = require('request')

// const db = require('./database_helper')
const config = require('./config.json')
const chesshelper = require('./chesshelper')

const APP_ID = config['APP_ID']

const states = {
  NEW_GAME_CHOOSE_PLAYERS: '_NEW_GAME_CHOOSE_PLAYERS',
  NEW_GAME_CHOOSE_COLOR: '_NEW_GAME_CHOOSE_COLOR',
}

const newSessionHandlers = {
  'LaunchRequest': function () {
      this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'))
      this.attributes.repromptSpeech = this.t('WELCOME_REPROMT')
      this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
  },
  'NewGameIntent': function() {
    this.handler.state = states.NEW_GAME_CHOOSE_PLAYERS
    this.emitWithState('ChooseOptionIntent')
  },
  'ResetGameIntent': function() {
    let userId = this.event.session.user.userId
    chesshelper.resetGame(userId)
        .then(data => {
          data = JSON.parse(data.toString('utf-8'))
          this.emit(':tell', data.message)
        })
        .catch(data => {
          this.emit(':tell', 'There was an error resetting the game')
        })
  },
  'ChessMoveIntent': function() {
    let userId = this.event.session.user.userId
    let positionSlotA = this.event.request.intent.slots.PositionA
    let positionSlotB = this.event.request.intent.slots.PositionB
    let positionSlotAVal = positionSlotA ? positionSlotA.value : undefined
    let positionSlotBVal = positionSlotB ? positionSlotB.value : undefined
    console.log('positionSlotA:', positionSlotA)
    console.log('positionSlotB:', positionSlotB)

    let from = chesshelper.convertToPosition(positionSlotAVal)
    let to = chesshelper.convertToPosition(positionSlotBVal)
    // As long as from is a valid move then this is ok
    if (!from) {
      this.emit(':tell', 'I\'m sorry. I did not understand that move.')
    }

    let cardTitle = 'My Card Title'
    let cardText = ''
    if (positionSlotA) {
      cardText += positionSlotA.value
    }
    if (positionSlotB) {
      cardText += ' ------ ' + positionSlotB.value
    }

    cardText += '\nparsed: ' + from + '-' + to

    let speechText = 'Successfully moved from ' + from + ' to ' + to

    // this.emit(':tellWithCard', speechText, cardTitle, cardText)
    chesshelper.move(from, to, userId)
        .then(data => {
          data = JSON.parse(data.toString('utf-8'))
          if (data['error']) {
            this.emit(':tellWithCard', 'Sorry, but that move is invalid', cardTitle, cardText)
          } else {
            speechText = chesshelper.buildMoveSpeechResponse(data['move'], data['aiMove'])
            this.emit(':tellWithCard', speechText, cardTitle, cardText)
          }
        })
        .catch(err => {
          this.emit(':tellWithCard', 'There was an error with that move', 'my cust title', cardText)
        })
  },
  'AMAZON.HelpIntent': function () {
      this.attributes.speechOutput = this.t('HELP_MESSAGE')
      this.attributes.repromptSpeech = this.t('HELP_REPROMT')
      this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
  },
  'AMAZON.StopIntent': function () {
      this.emit('SessionEndedRequest')
  },
  'AMAZON.CancelIntent': function () {
      this.emit('SessionEndedRequest')
  },
  'SessionEndedRequest': function () {
      this.emit(':tell', this.t('STOP_MESSAGE'))
  },
  'Unhandled': function () {
    this.emit('AMAZON.HelpIntent')
  }
}

const newGameChoosePlayersHandlers =
  Alexa.CreateStateHandler(states.NEW_GAME_CHOOSE_PLAYERS, {
  'ChooseOptionIntent': function() {
    if (!this.event.request.intent.slots) {
      this.emit(':ask', 'How many players?', 'How many players?')
    }

    let playersSlot = this.event.request.intent.slots.Option
    if (playersSlot && playersSlot.value) {
      let players = playersSlot.value
      players = players === '2' ? players : '1'
      console.log('Players:', players)
      if (players === '1') {
        this.handler.state = states.NEW_GAME_CHOOSE_COLOR
        this.attributes.players = players
        this.emitWithState('LaunchRequest')
      } else {
        let userId = this.event.session.user.userId
        chesshelper.newGame(userId, players)
          .then(data => {
            this.emit(':tell', 'Successfully started a new game')
          })
          .catch(err => {
            this.emit(':tell', 'There was an error starting a new game')
          })
      }
    } else {
      this.emit(':ask', 'How many players?', 'How many players?')
    }
  },
  'AMAZON.HelpIntent': function () {
    this.attributes.speechOutput = this.t('HELP_MESSAGE')
    this.attributes.repromptSpeech = this.t('HELP_REPROMT')
    this.emit(':ask', 'help me', 'help me')
  },
  'AMAZON.StopIntent': function () {
      this.emit('SessionEndedRequest')
  },
  'AMAZON.CancelIntent': function () {
      this.emit('SessionEndedRequest')
  },
  'SessionEndedRequest': function () {
      this.emit(':tell', this.t('STOP_MESSAGE'))
  },
  'Unhandled': function () {
    this.emit('AMAZON.HelpIntent')
  }
})

const newGameChooseColorHandlers =
  Alexa.CreateStateHandler(states.NEW_GAME_CHOOSE_COLOR, {
  'LaunchRequest': function() {
    this.emit(':ask', 'What color?', 'What color?')
  },
  'ChooseOptionIntent': function() {
    if (!this.event.request.intent.slots) {
      this.emit(':ask', 'What color?', 'What color?')
    }

    let colorSlot = this.event.request.intent.slots.Option
    if (colorSlot && colorSlot.value) {
      let color = colorSlot.value
      console.log('Color:', color)
      color = color === 'black' ? color : 'white'
      let userId = this.event.session.user.userId
      let players = this.attributes.players
      chesshelper.newGame(userId, players, color)
        .then(data => {
          this.emit(':tell', 'Successfully started a new game')
        })
        .catch(err => {
          this.emit(':tell', 'There was an error starting a new game')
        })
    } else {
      this.emit(':ask', 'What color?', 'What color?')
    }
  },
  'AMAZON.HelpIntent': function() {
    this.emit(':ask', 'Please choose a color or say cancel to exit.', 'What color would you like to be?')
  },
  'AMAZON.StopIntent': function () {
      this.emit('SessionEndedRequest')
  },
  'AMAZON.CancelIntent': function () {
      this.emit('SessionEndedRequest')
  },
  'SessionEndedRequest': function () {
      this.emit(':tell', this.t('STOP_MESSAGE'))
  },
  'Unhandled': function () {
    this.emitWithState('AMAZON.HelpIntent')
  }
})

const languageStrings = {
  'en-GB': {
      translation: {},
  },
  'en-US': {
      translation: {
          SKILL_NAME: 'Chess Companion',
          WELCOME_MESSAGE: "Welcome to %s. You can ask a question like, what\'s the price of coal... Now, what can I help you with.",
          WELCOME_REPROMT: 'For instructions on what you can say, please say help me.',
          DISPLAY_CARD_TITLE: '%s - Price for %s.',
          HELP_MESSAGE: "You can ask questions such as, what\'s the price of iron ore, or, you can say exit...Now, what can I help you with?",
          HELP_REPROMT: "You can say things like, what\'s the price of gold bars, or you can say exit...Now, what can I help you with?",
          STOP_MESSAGE: 'Goodbye!',
      },
  },
  'de-DE': {
      translation: {},
  },
}

exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context)
  alexa.APP_ID = APP_ID
  // To enable string internationalization (i18n) features, set a resources object.
  alexa.resources = languageStrings
  alexa.registerHandlers(newSessionHandlers,
                        newGameChoosePlayersHandlers,
                        newGameChooseColorHandlers)
  alexa.execute()
}

function titleCase(str) {
  let words = str.split(' ')
  for (let i = 0; i < words.length; ++i) {
    let word = words[i].toLowerCase()
    word = word[0].toUpperCase() + word.slice(1)
    words[i] = word
  }
  return words.join(' ')
}
