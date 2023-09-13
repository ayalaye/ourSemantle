
const express = require('express')
const cors = require('cors');
const { spawn } = require('child_process');
const schedule = require('node-schedule');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
// import fetch from 'node-fetch';

//
let tempWord, previousWord, dailyWord, numPuzzle, numOfWinners, scoresArray1, scoresArray990, scoresArray999
previousWord = ""
dailyWord = ""
tempWord = ""
numOfWinners = 0
numPuzzle = 0
scoresArray1 = 0
scoresArray990 = 0
scoresArray999 = 0
const app = express()

// infoSharedGames includes information about shared games: 
// number of shared guesses, the number of the guess where the win happened (the first)
let infoSharedGames = new Map();

app.use(express.static('client'))
app.use(express.json())
app.use(cors())
const server = http.createServer(app);
const io = socketIo(server);

const arraySize = 1000;
let scoresArray = [];// An array in which the 1000 highest scores will be entered


// The function that adds a score to the array and sorts the array
function addAndSortScore(score) {
  if (scoresArray.length === arraySize - 1) { // The array is full
    if (score > scoresArray[0] && !scoresArray.includes(score)) { // the member is one of the top 1000, without duplicates
      // When inserting, another member must be removed
      scoresArray.push(score);
      scoresArray.sort((a, b) => b - a); // sort descending order
      scoresArray.pop();// Removing the lowest score
    }
  }
  else {// The array is not full
    if (!scoresArray.includes(score)) { // The array does not contain duplicates
      // When inserting,  do not need to remove another member
      scoresArray.push(score);
      scoresArray.sort((a, b) => b - a); // sort descending order
    }

  }
  scoresArray999 = scoresArray[0]
  if (scoresArray999 === undefined || scoresArray999 === null) {
    scoresArray999 = 0
  }
  scoresArray990 = scoresArray[9]
  if (scoresArray990 === undefined || scoresArray990 === null) {
    scoresArray990 = 0
  }
  scoresArray1 = scoresArray[998]
  if (scoresArray1 === undefined || scoresArray1 === null) {
    scoresArray1 = 0
  }
  return scoresArray.indexOf(score)

}



io.on('connection', (socket) => {
  console.log('A user connected');

  // Event when a player creates a shared game
  socket.on('createGame', (data) => {
    let gameId = uuidv4(); // generate a unique game ID
    socket.join(gameId);
    infoSharedGames.set(gameId, { numOfGuesses: 0, winningGuess: -1 }) // At first there is no winning guess
    socket.emit('gameStarted', { gameId: gameId });

  });

  // Event when a player joins a game
  socket.on('joinGame', (data) => {
    let gameId = data.gameId;
    // Check that the GAMEID is in the array, i.e. a valid ID, otherwise return EMIT gameStarted of an error instead
    if (infoSharedGames.has(gameId)) {
      socket.join(gameId);
      socket.emit('gameStarted', { gameId: gameId });
    }
    else {
      socket.emit('gameStartedError', { message: 'The code is not valid!' });
    }

  });

  // Event when a player leave a game
  socket.on('leaveGame', (data) => {
    let gameId = data.gameId;
    socket.leave(gameId);
    socket.emit('leftGame', { message: 'You leaved the game!' });

  });


  // Event when a player give up
  socket.on('giveUp', (data) => {
    let gameId = data.gameId;
    if (data.gameId == "-1") {
      socket.emit('gaveUp', { dailyWord: dailyWord });
    }
    else { // shared game
      infoSharedGames.get(data.gameId).winningGuess = 0 // 0 indicates on giveUp 
      playerName = data.playerName
      io.to(gameId).emit('gaveUp', { dailyWord: dailyWord, playerName: playerName });
    }

  });

  // Event when a player open the game screen
  socket.on('start', (data) => {
    socket.emit('gameOpened', {
      previousWord: previousWord,
      numPuzzle: numPuzzle,
      scoresArray999: scoresArray999,
      scoresArray990: scoresArray990,
      scoresArray1: scoresArray1
    });
  });

  // Event when a player open the game screen
  socket.on('checkWord', (data) => {

    let responseObj
    let guess = data.word;
    let gameId = data.gameId;
    let indexSimilarity
    const command = 'similarity.py';
    const args = [guess, dailyWord];
    const pythonProcess = spawn('python', [command, ...args]);

    console.log("server guess: " + guess + "!")
    console.log("server dailyWord: " + dailyWord + "!")

    let scriptOutput = "";

    pythonProcess.stdout.on('data', (data) => {
      scriptOutput += data;
    });
    let errorOccurred = false;

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python script error: ${data}`);
      errorOccurred = true;


    });

    pythonProcess.on('close', (code) => {
      let numOfGuesses = -1 // not shared game
      let winningGuess = -1 // not shared game
      let similarity

      if (gameId != "-1") { // for shared game
        if (infoSharedGames.has(gameId)) { // the game exists, you can use the 'numOfGuesses' property
          numOfGuesses = infoSharedGames.get(gameId).numOfGuesses;
          winningGuess = infoSharedGames.get(gameId).winningGuess
        } else {
          console.error(`Game with gameId '${gameId}' does not exist.`);
        }

      }
      console.log(`Python script exited with code ${code}`);
      similarity = parseFloat(scriptOutput.trim());

      if (similarity === 100 && guess !== dailyWord) { // There are words that are semantically very close, for which the distance function returns a 100% match. 99.99 is given for them.
        similarity = 99.99
      }
      if (similarity === 100) {
        if (data.gameId != "-1") { //shared game
          if (infoSharedGames.get(data.gameId).winningGuess == -1) { // first winnig in the shared game
            infoSharedGames.get(data.gameId).winningGuess = infoSharedGames.get(data.gameId).numOfGuesses + 1
            winningGuess = infoSharedGames.get(data.gameId).winningGuess
            numOfWinners++
            console.log(infoSharedGames.get(data.gameId).winningGuess)
          }
        }
        else if (data.gaveUp == false) { // not shared game and didn't give up 
          numOfWinners++
        }


      }
      if (similarity !== 100) { // The score system does not save a score of 100
        indexSimilarity = addAndSortScore(similarity)
      }


      if (errorOccurred) {
        // Handle error response
        responseObj = {
          similarity: -1000,
          previousWord: previousWord,
          numOfWinners: numOfWinners,
          numPuzzle: numPuzzle,
          indexSimilarity: -1,
          scoresArray999: scoresArray999,
          scoresArray990: scoresArray990,
          scoresArray1: scoresArray1,
          playerName: data.playerName,
          guess: guess,
          numOfGuesses: numOfGuesses,
          winningGuess: winningGuess
        };

        if (data.gameId == "-1") {

          socket.emit('checked', responseObj);
        }
        else {

          io.to(gameId).emit('checked', responseObj);
        }


      } else {
        // Handle successful response
        if (data.gameId != "-1") { //shared game
          infoSharedGames.get(data.gameId).numOfGuesses += 1
          numOfGuesses = infoSharedGames.get(data.gameId).numOfGuesses
        }
        // Create an object to send multiple pieces of information
        responseObj = {
          similarity: similarity,
          previousWord: previousWord,
          numOfWinners: numOfWinners,
          numPuzzle: numPuzzle,
          indexSimilarity: indexSimilarity,
          scoresArray999: scoresArray999,
          scoresArray990: scoresArray990,
          scoresArray1: scoresArray1,
          playerName: data.playerName,
          guess: guess,
          numOfGuesses: numOfGuesses,
          winningGuess: winningGuess
        };

        if (data.gameId == "-1") {
          socket.emit('checked', responseObj);
        }
        else {
          io.to(gameId).emit('checked', responseObj);
        }
      }

    });

  });



  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

});


// Function to get a random word from the Random Word API
async function getRandomWord() {
  const url = 'https://random-word-api.herokuapp.com/word';
  try {
    const response = await fetch(url);
    const data = await response.json();
    const randomWord = data[0]; // The random word is inside an array
    return randomWord;
  } catch (error) {
    console.error('Error fetching random word:', error);
    return null;
  }

}


async function drawNewWord() {

  const randomWord = await getRandomWord();
  if (randomWord) {
    tempWord = randomWord;
    console.log("New daily word:", tempWord);
  }
  const command2 = 'similarity.py';
  const args2 = ["home", tempWord]; // to check if tempWord is known
  const pythonProcess2 = spawn('python', [command2, ...args2]);

  let scriptOutput2 = "";

  pythonProcess2.stdout.on('data', (data) => {
    scriptOutput2 += data;
  });

  pythonProcess2.stderr.on('data', (data) => {
    drawNewWord()
  });

  pythonProcess2.on('close', (code) => {
  });

  dailyWord = tempWord
}

function startNewGame() {
  infoSharedGames.clear() // Deletes the shared games and information about them, at the end of each day
  numOfWinners = 0
  scoresArray1 = 0
  scoresArray990 = 0
  scoresArray999 = 0
  scoresArray = []
  previousWord = dailyWord
  numPuzzle++
  dailyWord = "color"
  // drawNewWord();
}

// startNewGame();

// setInterval(startNewGame, DRAW_INTERVAL_MS);

port = 3000
my_port = process.env.PORT || port

server.listen(my_port, () => {
  console.log(`Server is running on port ${port}`);
});

// Create a task to execute at 01:00 (01:00 AM) every day
const job = schedule.scheduleJob('35 8 * * *', function () {
  startNewGame()
});
const currentTime = new Date();
const currentHour = currentTime.getHours();
const currentMinute = currentTime.getMinutes();

console.log(`השעה הנוכחית היא: ${currentHour}:${currentMinute}`);
