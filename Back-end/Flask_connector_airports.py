import json
from flask import Flask, Response
app = Flask(__name__)
import mysql.connector

connection = mysql.connector.connect(
    host='localhost',
    port=3306,
    database='flight_game',
    user='root',
    password='dianapass',
    autocommit=True
)
@app.route('/airport/<id>')
def airport(id):
    try:
        cursor = connection.cursor()
        statement = "select gps_code from airport where id = '" + id + "'"
        cursor.execute(statement)
        result = cursor.fetchall()


    except ValueError:
        response = {
            "message": "Invalid number as addend",
            "status": 400
        }
        json_response = json.dumps(response)
        http_response = Response(response=json_response, status=400, mimetype="application/json")
        return http_response

@app.errorhandler(404)
def page_not_found(error_code):
    response = {
        "message": "Invalid endpoint",
        "status": 404
    }
    json_response = json.dumps(response)
    http_response = Response(response=json_response, status=404, mimetype="application/json")
    return http_response

if __name__ == '__main__':
    app.run(use_reloader=True, host='127.0.0.1', port=5000)