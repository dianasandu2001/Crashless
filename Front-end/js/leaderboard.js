// function to fetch data from API
async function getData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Invalid server input!');
  const data = await response;
  return data;
}
async function fetchLeaderboardData() {
  try {
    const response = await getData("http://127.0.0.1:5000/leaderboard");
    return response; // Assuming `getData` returns the array of objects
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return []; // Return an empty array in case of an error
  }
}

async function displayLeaderboard() {
  const leaderboardInfo = await fetchLeaderboardData();
  console.log(leaderboardInfo); // This will log the array retrieved from the API

  // Loop through the array of objects and add list items to the target element
  for (const item of leaderboardInfo) {
    let li = document.createElement('li');
    li.innerHTML = item.name; // Assuming 'name' is the property in each dictionary item
    const ul = document.querySelector("#target");
    ul.appendChild(li);
  }
}

// Call the function to display the leaderboard
displayLeaderboard();