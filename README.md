# Alexa Chess Companion skill
This skill is meant to be paired with the view <a href="https://github.com/clogan202/firetv-chess">app</a>. Must use phonetics like alpha 1 instead a1.

# Example utterances
- "Alexa ask Chess Companion to move from alpha 2 to alpha 4"
- "Alexa ask Chess Companion to move from foxtrot 2 to foxtrot 3"

# How To Setup
- Create a new alexa app on the amazon developers dashboard
- Add the slots, intents, and utterances from ./speech_assets to the correct spots
- Fill out the rest of the app appropriately
- Create a new lambda function (Node.js 4.3) and name the handler to index.handler
- upload the ./bin/dist.zip to lambda function
- set environment variables:
  - chess view app: host, port
  - alexa user: userId
- Point the Alexa app to the lambda function
