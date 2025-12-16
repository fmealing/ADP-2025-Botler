import numpy as np
import serial
import struct
import threading
import time
import lgpio as GPIO
import sys 

# ------------------------------------------------------------
# LIDAR PARAMETERS
# ------------------------------------------------------------
SERIAL_PORT = "/dev/ttyAMA0"
PACKET_LENGTH = 47
MEASUREMENT_LENGTH = 12
MESSAGE_FORMAT = "<xBHH" + "HB" * MEASUREMENT_LENGTH + "HHB"

# ------------------------------------------------------------
# MOTOR PARAMETERS
# ------------------------------------------------------------
ENR = 12  # Right motor GPIO pin
ENL = 13  # Left motor GPIO pin
CHIP = 0  # GPIO chip number

# Servo neutral and directions (Pulse Widths in microseconds)
STOP = 1525
FORWARD_RIGHT = 500  
FORWARD_LEFT = 2500 
BACK_RIGHT = 2500
BACK_LEFT = 500

# OBSTACLE AVOIDANCE THRESHOLDS (in mm)
EMERGENCY_STOP_MM = 250 
AVOID_THRESHOLD_MM = 700 # Changed from 450 back to 700 to match original intent
TURN_DURATION = 0.6 


# GPIO INITIALIZATION
try:
    h = GPIO.gpiochip_open(CHIP) 
    GPIO.gpio_claim_output(h, ENR)
    GPIO.gpio_claim_output(h, ENL)
    print(f"GPIO Chip {CHIP} opened successfully.")
except GPIO.error as e:
    print(f"[FATAL] Failed to open GPIO chip {CHIP}: {e}. Exiting.")
    sys.exit(1)


last_action = None

def set_servo(enr_pulse, enl_pulse):
    """Send a single servo position safely (refreshes PWM)."""
    try:
        # Note: GPIO.tx_servo continuously outputs the pulse until commanded otherwise.
        GPIO.tx_servo(h, ENR, enr_pulse, 50, 0, 50)
        GPIO.tx_servo(h, ENL, enl_pulse, 50, 0, 50)
        time.sleep(0.02)
    except GPIO.error as e:
        print(f"[WARN] Servo TX failed: {e}") 

def set_motion(action):
    """Sets the robot's motion state."""
    global last_action
    
    
    if action != last_action:
        print(f"→ Motion: {action}")
        last_action = action

    if action == "stop":
        set_servo(STOP, STOP)
    elif action == "forward":
        set_servo(FORWARD_RIGHT, FORWARD_LEFT)
    elif action == "backward":
        set_servo(BACK_RIGHT, BACK_LEFT)
    elif action == "turn_left":
        set_servo(FORWARD_RIGHT, STOP) 
    elif action == "turn_right":
        set_servo(STOP, FORWARD_LEFT)

def stop_and_cleanup():
    """Stops motors and closes GPIO connection cleanly."""
    global running
    print("Exiting and cleaning up...")
    running = False
    set_servo(STOP, STOP) 
    try:
        if h >= 0:
            GPIO.gpiochip_close(h)
            print("GPIO closed cleanly.")
    except Exception as e:
        print(f"Error during GPIO cleanup: {e}")


# LIDAR PARSING AND THREAD
def parse_lidar_data(data):
    """Parse one LIDAR data packet."""
    length, speed, start_angle, *pos_data, stop_angle, timestamp, crc = struct.unpack(MESSAGE_FORMAT, data)
    start_angle = float(start_angle) / 100.0
    stop_angle = float(stop_angle) / 100.0
    if stop_angle < start_angle:
        stop_angle += 360.0
    step = (stop_angle - start_angle) / (MEASUREMENT_LENGTH - 1)
    angles = [start_angle + step * i for i in range(MEASUREMENT_LENGTH)]
    distances = pos_data[0::2]  # mm
    return list(zip(angles, distances))

front_min_distance = 9999
running = True

def lidar_thread():
    """Continuously read LIDAR and update global front_min_distance."""
    global front_min_distance
    try:
        lidar = serial.Serial(SERIAL_PORT, 230400, timeout=0.1) 
    except Exception as e:
        print(f"[FATAL] Error opening LIDAR serial: {e}. Exiting thread.")
        global running
        running = False
        return

    while running:
        try:
            if lidar.read() != b'\x54':
                continue
            if lidar.read() != b'\x2C':
                continue

            data = b'\x54\x2C' + lidar.read(PACKET_LENGTH - 2)
            if len(data) != PACKET_LENGTH:
                continue

            measurements = parse_lidar_data(data)
            
            # Filter for the front sector (e.g., +/- 30 degrees)
            front_points = [d for (a, d) in measurements if (a <= 60 or a >= 300) and d > 0]
            
            if front_points:
                front_min_distance = np.min(front_points)
            else:
                front_min_distance = 9999 

            time.sleep(0.01) 
        except Exception as e:
            print(f"[WARN] LIDAR read error: {e}")
            time.sleep(0.25) 



# MAIN CONTROL LOOP (Fixed)

# NEW STATE VARIABLES (to manage the turn maneuver duration)
avoidance_state = False 
avoidance_end_time = 0 

# Start the separate thread for reading the LiDAR
threading.Thread(target=lidar_thread, daemon=True).start()

try:
    while running:
        dist = front_min_distance
        
        # Log distance and current planned action
        print(f"Distance: {dist:.1f} mm, Action: {last_action}, State: {'AVOIDING' if avoidance_state else 'CRUISING'}")

        # --- State 1: Running Avoidance Maneuver ---
        if avoidance_state:
            if time.time() < avoidance_end_time:
                # Continue turning until the timer expires
                set_motion("turn_right")
            else:
                # Timer expired, return to cruising
                avoidance_state = False
                print("--- Avoidance maneuver complete. Resuming cruise. ---")

        # --- State 2: Cruising or Triggering Avoidance ---
        else: 
            if dist < EMERGENCY_STOP_MM:
                # EMERGENCY: Too close (e.g., < 25 cm). Stop immediately, then start turn.
                print("!!! EMERGENCY STOP: Initiating turn !!!")
                # Immediately transition to the turning state
                avoidance_state = True
                avoidance_end_time = time.time() + TURN_DURATION
                set_motion("turn_right") 
                if dist > AVOID_THRESHOLD_MM:

                    print("!!! Obstacle avoided, move forward !!!")
                    set_motion("forward")
                
            elif dist < AVOID_THRESHOLD_MM:
                # OBSTACLE AHEAD: Start turn maneuver.
                print("Obstacle detected. Initiating turn right maneuver.")
                avoidance_state = True
                avoidance_end_time = time.time() + TURN_DURATION
                set_motion("turn_right")
                if dist > AVOID_THRESHOLD_MM:
                    print("!!! Obstacle avoided, move forward !!!")
                    set_motion("forward")
            else:
                # PATH CLEAR: Drive forward.
                set_motion("forward")

        # Control loop frequency (2Hz)
        time.sleep(1.0) 

except KeyboardInterrupt:
    pass
except Exception as e:
    print(f"An unexpected error occurred: {e}")
finally:
    stop_and_cleanup()
    sys.exit(0)