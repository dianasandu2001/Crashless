'use strict';

/* show map using Leaflet library. (L comes from the Leaflet library) */
const map = L.map('map', { tap: false });
L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
}).addTo(map);
map.setView([54, 15], 3); //set initial view zoom to 3 with lat,long at central europe

// global variables
const apiUrl = 'http://127.0.0.1:5000/';
const startLoc = 'EFHK'; //starting point helsinki airport
const airportMarkers = L.featureGroup().addTo(map);
let countryVisited = ["Finland"]; //add Finland to list so if player go to another airport it not counts as new country
let countryCount = 0;
let answeredCorrectly = false; // Track if the current question was answered correctly

// icons
const blueIcon = L.divIcon({ className: 'blue-icon' }); // blue icon for inactive airports
const greenIcon = L.divIcon({ className: 'green-icon' }); // green icon for current airport

// form for player name
document.querySelector('#player-form').addEventListener('submit', function (evt) {
  evt.preventDefault(); // player must enter name and choose mode
  const playerName = document.querySelector('#player-input').value;
  document.querySelector('#player-modal').classList.add('hide'); // hide form after
  //document.querySelector('#player-name').innerHTML = `Player: ${playerName}`;
  const playerMode = document.querySelector('#mode').value; //player chosen game mode
  document.querySelector('#player-mode').innerHTML = `Mode: ${playerMode}`; //show chosen mode on status
  gameSetup(`${apiUrl}newgame?player=${playerName}&loc=${startLoc}`); //game start
});

// function to fetch data from API
async function getData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Invalid server input!');
  const data = await response.json();
  return data;
}

// function to update game status
function updateStatus(status) {
  document.querySelector('#player-name').innerHTML = `Player: ${status.name}`;
  document.querySelector('#consumed').innerHTML = status.fuel.consumed;
  document.querySelector('#budget').innerHTML = status.fuel.budget;
  document.querySelector('#country-visited').innerHTML = countryCount;
}

// function to show current location
function showLocation(airport) {
  document.querySelector('#airport-name').innerHTML = `${airport.name}`;
  document.querySelector('#country-name').innerHTML = `${airport.country}`;
}

// function to check if game is over
function checkGameOver(budget) {
  if (budget <= 0) {
    alert("Game Over. Your airplane CRASHHHHHHHHHHHHHHHHHH.....");
    return false;
  }
  return true;
}

// function to fetch trivia question by country from json file
function askAndDisplayTrivia(countryName) {
  const trueUrl = 'Trivia-true.json';
  const falseUrl = 'Trivia-false.json';

  const fetchTrue = getData(trueUrl);
  const fetchFalse = getData(falseUrl);

  return Promise.all([fetchTrue, fetchFalse])
      .then(([trueData, falseData]) => {
        let questions = {};
        let isTrueAnswer = 'false';
        // randomize to fetch question from true of false
        if (Math.random() < 0.5) { //fetch from true
          if (countryName in trueData) {
            questions = trueData[countryName];
            isTrueAnswer = 'true';
          }
        } else { //fetch from false
          if (countryName in falseData) {
            questions = falseData[countryName];
          }
        }

        if (Object.keys(questions).length === 0) { //if country name not in json file
          console.error('Country not found in data');
          return null;
        }

        const questionKeys = Object.keys(questions); //list of question
        const randomQuestionKey = questionKeys[Math.floor(Math.random() * questionKeys.length)]; //random question index
        const randomQuestion = questions[randomQuestionKey];
        const answer = isTrueAnswer ? 'true' : 'false';
        return { question: randomQuestion, answer: answer }; //retrieved question and answer
      })
      .then(question => { //display question to popup dialog
        if (question) {
          // Reset answeredCorrectly flag before displaying the new question
          answeredCorrectly = false;
          const dialog = document.getElementById('questionDialog');
          const questionDiv = document.getElementById('question');
          questionDiv.textContent = question.question;
          const trueButton = document.getElementById('trueButton');
          const falseButton = document.getElementById('falseButton');
          // Function to handle true button click
          function handleTrueButtonClick() {
            checkAnswer('true', question.answer);
            dialog.close();
          }

          // Function to handle false button click
          function handleFalseButtonClick() {
            checkAnswer('false', question.answer);
            dialog.close();
          }
          // Remove previous event listeners before adding new ones
          trueButton.removeEventListener('click', handleTrueButtonClick);
          falseButton.removeEventListener('click', handleFalseButtonClick);
          trueButton.addEventListener('click', handleTrueButtonClick);
          falseButton.addEventListener('click', handleFalseButtonClick);

          dialog.showModal();
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
}

// function to check answer function and update to resultDiv
function checkAnswer(userAnswer, triviaAnswer) {
  if (!answeredCorrectly && userAnswer === triviaAnswer) {
    document.querySelector('#result-div').innerHTML = "You're right! Bonus fuel added to your fuel budget!";
    updateFuelBudget(); // Always update the budget when answered correctly
    answeredCorrectly = true; // Set the flag to true after updating
  } else if (userAnswer === triviaAnswer) {
    document.querySelector('#result-div').innerHTML = "You're right! Bonus fuel added to your fuel budget!";
  } else {
    document.querySelector('#result-div').innerHTML = 'Uh oh, wrong!!!!!';
  }
}

// function to update fuel budget after correct answer
function updateFuelBudget() {
  const gameId = document.querySelector('#game-id').value;
  let bonus = 0;
  const playerMode = document.querySelector('#mode').value;
  if (playerMode === "Easy") {
    bonus = 10000;
  } else if (playerMode === "Mid") {
    bonus = 6000;
  } else if (playerMode === "Hard") {
    bonus = 1000;
  }
  const url = `${apiUrl}updatefuel?game=${gameId}&bonus=${bonus}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update fuel budget');
      }
      return response.json();
    })
    .then(data => {
      // Update the game status on the UI with the new fuel budget
      updateStatus(data.status);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}


// function to check if 5 country have been reached
function checkGoal(countryCount) {
  if (countryCount >= 5) {
    alert("Winner! Winner! Chicken dinner!");
    return true;
  }
  return false;
}


// function to set up game
async function gameSetup(url) {
  try {
    airportMarkers.clearLayers();
    const gameData = await getData(url);
    console.log(gameData)
    updateStatus(gameData.status);
    document.querySelector('#game-id').value = gameData.status.id; //add game id to hidden input
    // check if fuel ran out
    if (!checkGameOver(gameData.status.fuel.budget)) return;
    if (checkGoal(countryCount)) return;

    // put marker and popup on airports
    for (let airport of gameData.location) {
      const marker = L.marker([airport.latitude, airport.longitude]).addTo(map);
      airportMarkers.addLayer(marker);
      if (airport.active) {
        map.flyTo([airport.latitude, airport.longitude], 5);
        showLocation(airport);
        marker.bindPopup(`You are here: <b>${airport.name}</b> in <b>${airport.country}</b>`);
        marker.openPopup();
        marker.setIcon(greenIcon);
        // Call askAndDisplayTrivia after reaching the airport
        askAndDisplayTrivia(airport.country);
      } else {
        marker.setIcon(blueIcon);
        const popupContent = document.createElement('div');
        const h4 = document.createElement('h4');
        h4.innerHTML = airport.name;
        popupContent.append(h4);
        const goButton = document.createElement('button');
        goButton.classList.add('button');
        goButton.innerHTML = 'Fly me to the moon';
        popupContent.append(goButton);
        const p = document.createElement('p');
        p.innerHTML = `Distance ${airport.distance}km`;
        popupContent.append(p);
        marker.bindPopup(popupContent);

        // add function to fly to choose airport
        goButton.addEventListener('click', function () {
          gameSetup(`${apiUrl}flyto?game=${gameData.status.id}&dest=${airport.ident}&consumption=${airport.fuel_consumption}`);
          if (!countryVisited.includes(airport.country)) {
            countryVisited.push(airport.country);
            countryCount += 1;
          }

        });
      }
    }
  } catch (error) {
    console.log(error);
  }
}