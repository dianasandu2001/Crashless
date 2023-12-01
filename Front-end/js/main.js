'use strict';
/* show map using Leaflet library. (L comes from the Leaflet library) */

const map = L.map('map', { tap: false });
L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
}).addTo(map);
map.setView([60, 24], 7);

// global variables
const apiUrl = 'http://127.0.0.1:5000/';
const startLoc = 'EFHK';
const airportMarkers = L.featureGroup().addTo(map);
let countryVisited = 0;

// icons
const blueIcon = L.divIcon({ className: 'blue-icon' });
const greenIcon = L.divIcon({ className: 'green-icon' });

// form for player name
document.querySelector('#player-form').addEventListener('submit', function (evt) {
  evt.preventDefault();
  const playerName = document.querySelector('#player-input').value;
  const playerMode = document.querySelector('#mode').value;
  document.querySelector('#player-modal').classList.add('hide');
  //document.querySelector('#player-name').innerHTML = `Player: ${playerName}`;
  document.querySelector('#player-mode').innerHTML = `Mode: ${playerMode}`;
  gameSetup(`${apiUrl}newgame?player=${playerName}&loc=${startLoc}`);
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
  document.querySelector('#country-visited').innerHTML = countryVisited;
}

// function to show current location and ask trivia
function showLocation(airport) {
  document.querySelector('#airport-name').innerHTML = `${airport.name}`;
  document.querySelector('#country-name').innerHTML = `${airport.country}`;
  askTrivia(airport.country);
}


// function to check if game is over
function checkGameOver(budget) {
  if (budget <= 0) {
    alert(`Game Over.`);
    return false;
  }
  return true;
}

// function to fetch trivia question by country

function askTrivia(countryName) {
  const trueUrl = 'Trivia-true.json';
  const falseUrl = 'Trivia-false.json';

  const fetchTrue = getData(trueUrl);
  const fetchFalse = getData(falseUrl);

  Promise.all([fetchTrue, fetchFalse])
    .then(([trueData, falseData]) => {
      let questions = {};
      let isTrueAnswer = false;

      if (Math.random() < 0.5) {
        if (countryName in trueData) {
          questions = trueData[countryName];
          isTrueAnswer = true;
        }
      } else {
        if (countryName in falseData) {
          questions = falseData[countryName];
        }
      }

      if (Object.keys(questions).length === 0) {
        console.error('Country not found in data');
        return;
      }

      const questionKeys = Object.keys(questions);
      const randomQuestionKey = questionKeys[Math.floor(Math.random() * questionKeys.length)];
      const randomQuestion = questions[randomQuestionKey];

      const answer = isTrueAnswer ? 'true' : 'false';

      const triviaQuestion = randomQuestion;
      const triviaAnswer = answer;

      document.querySelector('#question').innerHTML = triviaQuestion;
    });
}



// function to check if 5 country have been reached
function checkGoal(countryVisited) {
  if (countryVisited >= 5) {
    alert("Winner! Chicken dinner!");
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

    // check if fuel ran out
    if (!checkGameOver(gameData.status.fuel.budget)) return;
    if (checkGoal(countryVisited)) return;

    // put marker and popup on airports
    for (let airport of gameData.location) {
      const marker = L.marker([airport.latitude, airport.longitude]).addTo(map);
      airportMarkers.addLayer(marker);
      if (airport.active) {
        map.flyTo([airport.latitude, airport.longitude], 10);
        showLocation(airport);
        marker.bindPopup(`You are here: <b>${airport.name}</b> in <b>${airport.country}</b>`);
        marker.openPopup();
        marker.setIcon(greenIcon);
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
          countryVisited += 1;
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
}

