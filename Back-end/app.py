import string
import mysql.connector
from geopy.distance import geodesic as GD
import random
import json
from flask import Flask, request, jsonify
from flask_cors import CORS


# Connect to database
connection = mysql.connector.connect(
    host='127.0.0.1',
    port=3306,
    database='flight_game',
    user='root',
    password='dianapass'
)

cus = connection.cursor()

app = Flask(__name__)
cors = CORS(app)
CORS(app, resources={r"/*": {"origins": "http://localhost:63342"}})
app.config['CORS_HEADERS'] = 'Content-Type'

# Variable
fuel_initial = 30_000
fuel_usage = 0

# List of country in EU
EuropeCountries = []
sql = "SELECT name FROM country where continent = 'EU'"
cus.execute(sql)
row = cus.fetchall()
for cou in row:
    (country,) = cou
    EuropeCountries.append(country)


# Object 1: Airport
class Airport:
    def __init__(self, ident, active=False, data=None):  # Init airport with own ident, active if current position, data
        self.ident = ident
        self.active = active
        if data is None:  # add airport's data when creating new airport
            # find airport from DB
            sql = "SELECT ident, airport.name, latitude_deg, longitude_deg, country.name FROM Airport, country WHERE airport.iso_country = country.iso_country AND ident='" + ident + "'"
            print(sql)
            cus.execute(sql)
            res = cus.fetchall()
            if len(res) == 1:
                # game found
                self.ident = res[0][0]
                self.name = res[0][1]
                self.latitude = float(res[0][2])
                self.longitude = float(res[0][3])
                self.country = res[0][4]
        else:
            # if airport already created then assign values
            self.name = data['name']
            self.latitude = float(data['latitude'])
            self.longitude = float(data['longitude'])
            self.country = data['country']

    def find_EU_airports(self):  # Find 4 random airports each eu country
        list = []
        for country in EuropeCountries:
            sql = "SELECT ident, airport.name, latitude_deg, longitude_deg, country.name FROM Airport, country"
            sql += " WHERE airport.iso_country = country.iso_country AND country.name ='" + country + "' ORDER BY RAND( )  LIMIT 4"
            cus.execute(sql)
            res = cus.fetchall()
            for r in res:
                if r[0] != self.ident:
                    data = {'name': r[1], 'latitude': r[2], 'longitude': r[3], 'country': r[4]}
                    eu_apt = Airport(r[0], False, data)
                    eu_apt.distance = self.distanceTo(eu_apt)
                    list.append(eu_apt)
                    eu_apt.fuel_consumption = self.fuel_consumption(eu_apt.distance)
        return list

    def distanceTo(self, target):  # use lat, long of current airport and destination airport to calculate distance

        coords_1 = (self.latitude, self.longitude)
        coords_2 = (target.latitude, target.longitude)
        dist = GD(coords_1, coords_2)
        disArr = (str(dist)).split()
        dis = float(disArr[0])
        distance = int(dis)
        return distance

    def fuel_consumption(self, distance):  # calculate fuel consumption base on distance fuel usage 12lit/km
        consumption = distance * 12
        return consumption


# Object 2: Game
class Game:
    def __init__(self, id, loc, consumption, player=None):  # init a game with gameID,location,fuel consumption and player
        self.status = {}
        self.location = []

        if id == 0:
            # new game
            # Create new game id
            letters = string.ascii_lowercase + string.ascii_uppercase + string.digits
            # create game status
            self.status = {
                "id": ''.join(random.choice(letters) for i in range(20)),
                "name": player,
                "fuel": {
                    "consumed": fuel_usage,
                    "budget": fuel_initial
                },
                "previous_location": "",  # init without previous location
            }
            self.location.append(Airport(loc, True))  # add current location to list of visited location
            self.player = player
            # Insert new game into DB
            sql1 = "INSERT INTO Game VALUES ('" + self.status["id"] + "', " + str(self.status["fuel"]["consumed"])
            sql1 += ", " + str(self.status["fuel"]["budget"]) + ", '" + loc + "', '" + self.status["name"] + "')"
            cus.execute(sql1)

        else:
            # update consumption and budget
            sql2 = "UPDATE Game SET co2_consumed = co2_consumed + " + consumption + ", co2_budget = co2_budget - " + consumption + " WHERE id='" + id + "'"
            cus.execute(sql2)

            # find game from DB
            sql3 = "SELECT id, co2_consumed, co2_budget, location, screen_name FROM Game WHERE id='" + id + "'"
            cus.execute(sql3)
            res = cus.fetchall()
            # game found
            self.status = {
                "id": res[0][0],
                "name": res[0][4],
                "fuel": {
                    "consumed": res[0][1],
                    "budget": res[0][2]
                },
                "previous_location": res[0][3]
            }
            # old location in DB currently not used
            apt = Airport(loc, True)  # activate current airport
            self.location.append(apt)  # add visited airport to location lists
            self.set_location(apt)  # move to current location

    def set_location(self, location):  # move to current location
        # self.location = location
        sql = "UPDATE Game SET location='" + location.ident + "' WHERE id='" + self.status["id"] + "'"
        cus.execute(sql)


# Function to fly to choose destination
def fly(id, dest, consumption=0, player=None):
    if id == 0:  # create new game
        game = Game(0, dest, consumption, player)
    else:  # set up new location
        game = Game(id, dest, consumption)
    eu_airports = game.location[0].find_EU_airports()  # list new random 4 airports in EU
    for a in eu_airports:
        game.location.append(a)
    json_data = json.dumps(game, default=lambda o: o.__dict__, indent=4)
    return json_data


# Function to update game when player receive bonus
def fetch_updated_game_data(game_id):
    try:
        query = f"SELECT id, co2_consumed, co2_budget, location, screen_name FROM Game WHERE id = '{game_id}'"
        cus.execute(query)
        res = cus.fetchone()  # fetch saved data of the game
        # update data
        updated_game_status = {
            "id": res[0],
            "name": res[4],
            "fuel": {
                "consumed": res[1],
                "budget": res[2]
            },
            "previous_location": res[3]
        }

        return updated_game_status

    except mysql.connector.Error as err:
        print(f"Error fetching game data: {err}")
        return None


# Update game data when fly to new destination
# http://127.0.0.1:5000/flyto?game=?????&dest=????&consumption=????
@app.route('/flyto')
def flyto():
    args = request.args
    id = args.get("game")
    dest = args.get("dest")
    consumption = args.get("consumption")
    json_data = fly(id, dest, consumption)
    return json_data


# Start new game
# http://127.0.0.1:5000/newgame?player=???&loc=???
@app.route('/newgame')
def newgame():
    args = request.args
    player = args.get("player")
    dest = args.get("loc")
    json_data = fly(0, dest, 0, player)
    return json_data


# Update fuel budget if player got the trivia right
# http://127.0.0.1:5000/updatefuel?player=???&bonus=???
@app.route('/updatefuel')
def update_fuel():
    game_id = request.args.get("game")
    bonus = request.args.get("bonus")
    # update game data in database
    sql = "UPDATE Game SET co2_budget = co2_budget + " + bonus + " WHERE id='" + game_id + "'"
    cus.execute(sql)
    connection.commit()
    # update game status will be sent to javascript
    updated_game_data = fetch_updated_game_data(game_id)
    return jsonify({'status': updated_game_data})


if __name__ == '__main__':
    app.run(use_reloader=True, host='127.0.0.1', port=5000)