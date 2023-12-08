'use strict';
// function to fetch data from API
async function getData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Invalid server input!');
  const data = await response.json();
  return data;
}

const leaderBoardInfo= getData("http://127.0.0.1:5000/leaderboard");
console.log(leaderBoardInfo);
for (name of leaderBoardInfo) {
    let li =document.createElement('li');
    li.innerHTML = name;
    const ul = document.querySelector("#target");
    ul.appendChild(li);
}