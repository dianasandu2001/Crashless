fetch('http://127.0.0.1:5000/leaderboard')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }
                return response.json();
            })
            .then(data => {
                // Log the received data
                console.log(data);

                // Extract data from the response
                const top_names = data.names || [];
                const top_fuel = data.fuels || [];
                const ranks = Array.from({ length: top_names.length }, (_, i) => i + 1);

                // Access the table body
                const tableBody = document.getElementById('leaderboardBody');

                // Populate the table with the fetched data
                ranks.forEach((rank, index) => {
                    const row = tableBody.insertRow(index);
                    const cell0 = row.insertCell(0);
                    const cell1 = row.insertCell(1);
                    const cell2 = row.insertCell(2);

                    cell0.innerHTML = rank;
                    cell1.innerHTML = top_names[index];
                    cell2.innerHTML = top_fuel[index];
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });