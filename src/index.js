'use strict'
const Alexa = require('alexa-sdk')
const request = require('request')

const db = require('./database_helper')
const config = require('./config.json')
const chesshelper = require('./chesshelper')

const APP_ID = config['APP_ID']

const handlers = {
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'))
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMT')
        this.emit(':ask', this.attributes.speechOutput, this.attributes.repromptSpeech)
    },
    'ControlLightsIntent': function() {
      let userId = this.event.session.user.userId
      let lightStatus = this.event.request.intent.slots.LightStatus.value
      db.find(userId)
        .then(user => {
          console.log('user:', user)
          user = user === undefined ? {userid: userId} : user
          user.lightStatus = lightStatus
          console.log('user after:', user)
          db.insert(user)
            .then(data => {
              // Notify server of status update
              request.get('http://99.198.59.71:3000/api/light_was_updated')
                .on('data', data => {
                  this.emit(':tell', 'Successfully turned lights ' + lightStatus)
                })
                .on('error', err => {
                  this.emit(':tell', 'Successfully turned lights ' + lightStatus)
                })
            })
            .catch(err => {
              console.log('err:', err)
              this.emit(':tell', 'There was a problem saving your data')
            })
        })
        .catch(err => {
          console.log(err)
          this.emit(':tell', 'There was an error retrieving the users data')
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
            console.log('data:', data)
            if (data['error']) {
              this.emit(':tellWithCard', 'Sorry, but that move is invalid', cardTitle, cardText)
            } else {
              this.emit(':tellWithCard', speechText, cardTitle, cardText)
            }
          })
          .catch(err => {
            this.emit(':tellWithCard', 'There was an error with that move', 'my cust title', cardText)
          })


      // db.find(userId)
      //   .then(user => {
      //     console.log('user:', user)
      //     user = user === undefined ? {userid: userId, text: 'this is my custom text'} : user
      //     console.log('user after:', user)
      //     db.insert(user)
      //       .then(data => {
      //         this.emit(':tellWithCard', 'Successfully saved the users data', 'my cust title', cardText)
      //       })
      //       .catch(err => {
      //         this.emit(':tell', 'There was a problem saving your data')
      //       })
      //   })
      //   .catch(err => {
      //     console.log(err)
      //     this.emit(':tell', 'There was an error retrieving the users data')
      //   })
    },
    'NewGameIntent': function() {
      let userId = this.event.session.user.userId
      chesshelper.newGame(userId)
          .then(data => {
            this.emit(':tell', 'Successfully started a new game')
          })
          .catch(err => {
            this.emit(':tell', 'There was an error starting a new game')
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
};

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
};

exports.handler = (event, context) => {
    const alexa = Alexa.handler(event, context)
    alexa.APP_ID = APP_ID
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings
    alexa.registerHandlers(handlers)
    alexa.execute()
};

function titleCase(str) {
  let words = str.split(' ')
  for (let i = 0; i < words.length; ++i) {
    let word = words[i].toLowerCase()
    word = word[0].toUpperCase() + word.slice(1)
    words[i] = word
  }
  return words.join(' ')
}
