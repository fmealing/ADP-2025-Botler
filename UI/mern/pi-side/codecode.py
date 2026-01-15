from dotenv import load_dotenv
import requests
import time
import json
import os
from requests.exceptions import RequestException

load_dotenv()

BASE_URL = os.getenv("VITE_API_URL")
LOGIN_ENDPOINT = "/users/login"
ROBOT_ENDPOINT = "/robots"

USERNAME = os.getenv("ROBOTUSER")
PASSWORD = os.getenv("ROBOTPASS")
ROBOT_ID = os.getenv("ROBOT_ID")

TOKEN_FILE = os.path.join(os.getcwd(), "robot_jwt.token")
POLL_INTERVAL = 2


def login():
    response = requests.post(
        BASE_URL + LOGIN_ENDPOINT,
        json={"username": USERNAME, "password": PASSWORD},
        timeout=15,
    )

    if not response.ok:
        print("LOGIN FAILED")
        print("Status:", response.status_code)
        print("Body:", response.text[:500])

    response.raise_for_status()
    token = response.json()["token"]
    with open(TOKEN_FILE, "w") as f:
        f.write(token)
    return token


def load_token():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    return None


def fetch_robot_state(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}{ROBOT_ENDPOINT}/{ROBOT_ID}",
        headers=headers,
        timeout=5,
    )

    if response.status_code == 401:
        print("ROBOT 401")
        print("Body:", response.text[:500])
        raise PermissionError("Token expired or invalid")

    if not response.ok:
        print("ROBOT FETCH FAILED")
        print("Status:", response.status_code)
        print("Body:", response.text[:500])

    response.raise_for_status()
    return response.json()


def handle_action(robot):
    action = robot.get("action")
    battery = robot.get("batteryLevel")
    assign = robot.get("pendingAssignment")

    if action == "serving":
        print("Robot is serving an order")
    elif action == "taking order":
        print("Robot is taking an order")
    elif action == "charging":
        print("Robot is charging")
    elif action == "awaiting instruction":
        print("Robot is idle")
    else:
        print(f"Unknown action: {action}")

    print(f"Battery level: {battery}%")
    print(f"{assign}")


def main():
    token = load_token()

    if not token:
        token = login()

    while True:
        try:
            robot = fetch_robot_state(token)
            handle_action(robot)
        except PermissionError:
            token = login()
        except RequestException as e:
            print("Network error:", e)
        except Exception as e:
            print("Unexpected error:", e)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
