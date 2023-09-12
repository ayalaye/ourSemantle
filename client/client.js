
let start_txt, table_results, playerName, input_word, btn_guess, loader, unknown_or_restored_word_txt, gameId, gaveUp, gif_overlay

playerName = ""
gaveUp = false
const socket = io();

init = () => {
    let inputName, teamInWindow, teamInScreen, counter, winningGuessNum, win_txt, warming, win, dailyWord, createGameContent, leaveGame, overlay, openRullsBtn, rullsWindow, closeRulls, openTeamBtn, teamWindow, closeTeam
    winningGuessNum = 0 // The guess number I/we won
    counter = 0 //num guess
    win = false
    gameId = "-1"// not shared game
    start_txt = document.getElementById("start")
    win_txt = document.getElementById("winInformation")
    unknown_or_restored_word_txt = document.getElementById("unknownOrRestoredWord")
    loader = document.getElementById("loader")
    inputName = document.getElementById("inputName")
    loader.style.display = "none"
    table_results = document.getElementById("table_results")
    input_word = document.getElementById("input_word")
    btn_guess = document.getElementById("btn_guess")
    teamInWindow = document.getElementById("teamInWindow")
    teamInScreen = document.getElementById("teamInScreen")
    dailyWord = document.getElementById("dailyWord")
    gif_overlay = document.getElementById("gif-overlay")
    gif_overlay.style.display = "none"
    btn_guess.onclick = check
    overlay = document.getElementById('overlay');

    //Rulls button 
    openRullsBtn = document.getElementById('openRullsBtn');
    rullsWindow = document.getElementById('rullsWindow');
    closeRulls = document.getElementById('closeRulls');

    //Team button 
    openTeamBtn = document.getElementById('openTeamBtn');
    teamWindow = document.getElementById('teamWindow');
    closeTeam = document.getElementById('closeTeam');

    createGameContent = document.getElementById("createGameContent")
    leaveGame = document.getElementById('leaveGame')
    leaveGame.style.display = "none"

    // If the user clicks outside the modal window, it will close
    overlay.onclick = function () {
        rullsWindow.style.display = 'none';
        teamWindow.style.display = 'none';
        overlay.style.display = 'none';
    };

    //Rulls button 
    openRullsBtn.onclick = function () {
        rullsWindow.style.display = 'block';
        overlay.style.display = 'block';
    };
    closeRulls.onclick = function () {
        rullsWindow.style.display = 'none';
        overlay.style.display = 'none';
    };

    //Team button 
    openTeamBtn.onclick = function () {
        teamWindow.style.display = 'block';
        overlay.style.display = 'block';
    };
    closeTeam.onclick = function () {
        teamWindow.style.display = 'none';
        overlay.style.display = 'none';
    };

    //player want to create shared game
    document.getElementById('createGame').addEventListener('click', () => {
        socket.emit('createGame');
    });

    //player want join to shared game
    document.getElementById('joinGame').addEventListener('click', () => {
        gameId = document.getElementById('gameIdInput').value;
        socket.emit('joinGame', { gameId: gameId });
    });

    //player want to leave shared game
    leaveGame.addEventListener('click', () => {
        var userResponse = confirm("Are you sure you want to leave the game?");
        if (userResponse) {
            socket.emit('leaveGame', { gameId: gameId });
        }
    });

    //player want to give up
    document.getElementById("giveUp").addEventListener('click', () => {
        var userResponse = confirm("Are you sure you want to give up?");
        if (userResponse) {
            gaveUp = true
            socket.emit('giveUp', { gameId: gameId, playerName: playerName });
        }
    });

    
    //shared game started - (who make join/create)
    socket.on('gameStarted', (data) => {
        counter = 0
        winningGuessNum = 0
        while (table_results.rows.length > 1) {
            table_results.deleteRow(1);
        }
        gameId = data.gameId;
        playerName = inputName.value
        leaveGame.style.display = "block"
        createGameContent.style.display = "none"
        teamInWindow.innerText = `You’re in team ${gameId}`
        teamInScreen.innerText = `You are currently playing Semantle with a team`
    });

    //shared game not start - error with id game 
    socket.on('gameStartedError', (data) => {
        gameId = "-1"
        alert(data.message);
    });

    //after leave the shared game - restart the values
    socket.on('leftGame', (data) => {
        win = false
        playerName = ""
        gameId = "-1"
        counter = 0
        winningGuessNum = 0
        unknown_or_restored_word_txt.innerText = ""
        win_txt.innerText = ""
        dailyWord.innerText = ""
        while (table_results.rows.length > 1) {
            table_results.deleteRow(1);
        }
        teamInWindow.innerText = ""
        teamInScreen.innerText = ""
        createGameContent.style.display = "block"
        leaveGame.style.display = "none"
    });

    //give up - answer from server(what the daily word)
    socket.on('gaveUp', (data) => {
        dailyWord.innerText = `You gave up! The secret word is: ${data.dailyWord}. \nFeel free to keep entering words if you are curious about the similarity to other words.`
        if (gameId != "-1" && data.playerName !== "") { // shared game
            dailyWord.innerText = `You -${data.playerName}- gave up! The secret word is: ${data.dailyWord}. \nFeel free to keep entering words if you are curious about the similarity to other words.`
        }
    });


    //it happens after player click on "guess" button and give answer from server, add row to table 
    socket.on('checked', (response) => {
        let newRow, numerator, addGreenRec, cell1, cell2, cell3, cell4, cell5, cell6, rectangleCell, rectangleFill, answer
        answer = response
        loader.style.display = "none";
        btn_guess.removeAttribute("disabled");
        guess = answer.guess
        start_txt.innerText = `Yesterday's word was: ${answer.previousWord}. Today is puzzle number ${answer.numPuzzle}, \n The proximity score of the closest word (999/1000) to today's secret word is ${answer.scoresArray999}, \n the proximity score of the tenth closest word (990/1000) is ${answer.scoresArray990} \n and the proximity score of the thousandth closest word (1/1000) is ${answer.scoresArray1}.`
        if (answer.similarity === -1000) { // -1000 for unknown word
            unknown_or_restored_word_txt.innerText = `I don't know the word ${guess}.`
            return
        }
        unknown_or_restored_word_txt.innerText = ""
        sortTable()

        if (gameId == "-1") { // not shared game
            counter++
        }
        else { // shared game
            counter = answer.numOfGuesses // The server advances the general counter of the players in the game
            if (answer.winningGuess != -1 && answer.winningGuess != 0) { // there was a winning (0 minnimg the players gave up)
                winningGuessNum = answer.winningGuess
                win_txt.innerText = `You won! You found the solution in: ${winningGuessNum} guesses! \n Only ${answer.numOfWinners - 1} people solved Semantle today before you! \n You can keep trying to insert words and see their proximity.`
                if (counter === winningGuessNum) { // first winning happens now
                    victoryAnimation()
                }
            }
        }

        if (answer.similarity === 100) {
            warming = "found! 🤩"
            if (gameId == "-1" && win == false && gaveUp == false) {// not shared game, and first win
                win = true
                winningGuessNum = counter
                win_txt.innerText = `You won! You found the solution in: ${winningGuessNum} guesses! \n Only ${answer.numOfWinners - 1} people solved Semantle today before you! \n You can keep trying to insert words and see their proximity.`
                // first winning happens now
                victoryAnimation()
            }
        }
        else if (answer.indexSimilarity == -1) {
            warming = "(far) ☹️"
        }
        else {
            warming = 999 - answer.indexSimilarity // the array is opposite so we do minus
            if(warming < 600){
                warming = String(warming)
                warming += "/1000 🙂"
            }
            else{
                warming = String(warming)
                warming += "/1000 🔥"
            }
            
        }

        newRow = table_results.insertRow(1); // Create a new row
        newRow.style.color = "green"
        newRow.style.fontWeight = "bold"
        numerator = 999 - answer.indexSimilarity
        addGreenRec = false

        if (warming != "(far)" && warming != "found!" && numerator >= 1 && numerator <= 1000) {
            addGreenRec = true;
        }

        // Insert new cells into the new row
        cell1 = newRow.insertCell(0);
        cell2 = newRow.insertCell(1);
        cell3 = newRow.insertCell(2);
        cell4 = newRow.insertCell(3);
        cell5 = newRow.insertCell(4);
        cell6 = newRow.insertCell(5);

        if (addGreenRec) {
            rectangleCell = document.createElement("div");
            rectangleCell.className = "rectangle-cell";
            rectangleFill = document.createElement("div");
            rectangleFill.className = "rectangle-fill";
            rectangleFill.style.width = `${(numerator / 1000) * 100}%`;
            rectangleCell.appendChild(rectangleFill);
            cell5.appendChild(rectangleCell);
        }
        cell6.innerHTML = `(${answer.playerName})`;
        if (answer.playerName === undefined || answer.playerName === "") {
            if (gameId == "-1") {
                cell6.innerHTML = ""
            }
            else {
                cell6.innerHTML = "(Guest)"
            }
        }
        cell4.innerHTML = warming; // Set cell content
        cell3.innerHTML = answer.similarity;
        cell2.innerHTML = guess;
        cell1.innerHTML = counter;

    });

    start()
}

//show always start_txt on the screen game - when open the game
async function start(event) {
    socket.emit('start');
    socket.on('gameOpened', (data) => {
        start_txt.innerText = `Yesterday's word was: ${data.previousWord}. Today is puzzle number ${data.numPuzzle}, \n The proximity score of the closest word (999/1000) to today's secret word is ${data.scoresArray999}, \n the proximity score of the tenth closest word (990/1000) is ${data.scoresArray990} \n and the proximity score of the thousandth closest word (1/1000) is ${data.scoresArray1}.`
    });
}

//happen when click on "guess" button, sent to server data and tidy the current table 
async function check(event) {
    if (input_word.value == "") {
        return
    }
    for (let i = 2; i < table_results.rows.length; i++) { //make all the rows to be black apart from the first row  
        table_results.rows[i].style.color = "black"
        table_results.rows[i].style.fontWeight = "normal"
        unknown_or_restored_word_txt.innerText = ""
    }
    for (let i = 1; i < table_results.rows.length; i++) { // Checks if it's a guess already made
        if (table_results.rows[i].cells[1].innerText == input_word.value) {
            table_results.rows[1].style.color = "black"
            table_results.rows[1].style.fontWeight = "normal"
            table_results.rows[i].style.color = "green"
            table_results.rows[i].style.fontWeight = "bold"
            unknown_or_restored_word_txt.innerText = `You already made the guess ${input_word.value}.`
            return
        }
    }
    btn_guess.setAttribute("disabled", true);
    loader.style.display = "block"
    txt_word = input_word.value

    socket.emit('checkWord', { word: txt_word, gameId: gameId, gaveUp: gaveUp, playerName: playerName });

}


//sort the table according to the similarity
function sortTable() {
    const rows = Array.from(table_results.rows);
    rows.shift();
    rows.sort((a, b) => {
        const cellA = a.cells[2].textContent;
        const cellB = b.cells[2].textContent;
        const numberA = parseFloat(cellA); 
        const numberB = parseFloat(cellB); 
        return numberB - numberA; // Compare numbers in reverse order
    });
    // Clear the current table and re-append rows
    while (table_results.rows.length > 1) {
        table_results.deleteRow(1);
    }
    for (let i = 0; i < rows.length; i++) {
        rows[i].style.color = "black"
        rows[i].style.fontWeight = "normal"
        table_results.appendChild(rows[i]);
    }
}


//when player win in the first time will be animation 
async function victoryAnimation() {
    gif_overlay.style.display = "block"
    await delay(2000);
    gif_overlay.style.display = "none"
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
