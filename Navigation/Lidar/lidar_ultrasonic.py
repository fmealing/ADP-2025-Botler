# Obstacle Avoidance (Lidar + Ultrasonic)

import numpy as np
import serial
import struct
import threading
import time
import lgpio as GPIO
import sys

# PIN CONFIGURATION
# Motor Pins (Servo PWM controlled by lgpio.tx_servo)
ENR = 12  # Right motor GPIO pin
ENL = 13  # Left motor GPIO pin
CHIP = 0  # GPIO chip number for RPi 5

# Ultrasonic Sensor Pins (BCM numbering)
TRIG_PIN = 23 # BCM GPIO 23 (Transmit/Trigger)
ECHO_PIN = 24 # BCM GPIO 24 (Receive/Echo)

# LIDAR PARAMETERS
SERIAL_PORT = "/dev/ttyAMA0"
LIDAR_BAUDRATE = 230400
PACKET_LENGTH = 47
MEASUREMENT_LENGTH = 12
MESSAGE_FORMAT = "<xBHH" + "HB" * MEASUREMENT_LENGTH + "HHB"

# MOTION & AVOIDANCE PARAMETERS (in mm)
# Servo neutral and directions (Pulse Widths in microseconds)
STOP = 1525
FORWARD_RIGHT = 500
FORWARD_LEFT = 2500
BACK_RIGHT = 2500
BACK_LEFT = 500

# Lidar Calibration Constant
LIDAR_CALIBRATION_OFFSET_MM = 0

# OBSTACLE AVOIDANCE THRESHOLDS (in mm)
EMERGENCY_STOP_MM = 250
AVOID_THRESHOLD_MM = 700
TURN_DURATION = 0.6

# Global shared variables for sensor data
front_min_distance_lidar_mm = 9999
ultrasonic_distance_mm = 9999
running = True
last_action = None
h = -1 # GPIO chip handle initialized to -1 (invalid)

# GPIO INITIALIZATION
try:
    h = GPIO.gpiochip_open(CHIP) 
    
    # Claim Motor Pins as output (for lgpio.tx_servo)
    GPIO.gpio_claim_output(h, ENR)
    GPIO.gpio_claim_output(h, ENL)
    
    # Claim Ultrasonic Pins
    GPIO.gpio_claim_output(h, TRIG_PIN) # TRIG is OUTPUT
    GPIO.gpio_claim_input(h, ECHO_PIN)  # ECHO is INPUT

    # Ensure TRIG starts LOW
    GPIO.gpio_write(h, TRIG_PIN, 0)
    
    print(f"GPIO Chip {CHIP} opened and pins claimed successfully.")
except GPIO.error as e:
    print(f"[FATAL] Failed to open GPIO chip {CHIP}: {e}. Exiting.")
    sys.exit(1)


# MOTOR CONTROL FUNCTIONS
def set_servo(enr_pulse, enl_pulse):
    """Send a single servo position safely (refreshes PWM/Servo pulse)."""
    try:
        # 50Hz frequency, 0 start pulse, 50 stop pulse (standard servo control)
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
    # Stop the continuous servo pulses explicitly
    try:
        if h >= 0:
            GPIO.tx_servo(h, ENR, 0, 0, 0, 0)
            GPIO.tx_servo(h, ENL, 0, 0, 0, 0)
            GPIO.gpiochip_close(h)
            print("GPIO closed cleanly.")
    except Exception as e:
        print(f"Error during GPIO cleanup: {e}")

# LIDAR PARSING AND THREAD
def parse_lidar_data(data):
    """Parse one LIDAR data packet."""
    try:
        # Unpack the fixed packet structure (54 bytes - 2 for start bytes + CRC)
        length, speed, start_angle, *pos_data, stop_angle, timestamp, crc = struct.unpack(MESSAGE_FORMAT, data)
    except struct.error:
        # Handle incomplete packet size errors
        return []

    # Convert angle data from raw units (1/100th degree)
    start_angle = float(start_angle) / 100.0
    stop_angle = float(stop_angle) / 100.0
    
    # Handle wrap-around (359 -> 0)
    if stop_angle < start_angle:
        stop_angle += 360.0
    
    # Calculate angular step size
    step = (stop_angle - start_angle) / (MEASUREMENT_LENGTH - 1)
    
    angles = [start_angle + step * i for i in range(MEASUREMENT_LENGTH)]
    distances = pos_data[0::2]  # Distances are at even indices in pos_data

    # Apply calibration offset during parsing
    distances_corrected = [d + LIDAR_CALIBRATION_OFFSET_MM for d in distances]

    return list(zip(angles, distances_corrected))

def lidar_thread():
    """Continuously read LIDAR and update global front_min_distance_lidar_mm."""
    global front_min_distance_lidar_mm
    
    try:
        # Try to open serial port
        lidar = serial.Serial(SERIAL_PORT, LIDAR_BAUDRATE, timeout=0.1)
    except Exception as e:
        print(f"[FATAL] Error opening LIDAR serial: {e}. Exiting thread.")
        global running
        running = False
        return

    while running:
        try:
            # Look for the start bytes (0x54 0x2C)
            if lidar.read() != b'\x54':
                continue
            if lidar.read() != b'\x2C':
                continue

            # Read the rest of the packet
            data = lidar.read(PACKET_LENGTH - 2)
            
            if len(data) != PACKET_LENGTH - 2:
                continue

            # Prepend start bytes for struct.unpack
            full_data = b'\x54\x2C' + data
            
            measurements = parse_lidar_data(full_data)
            
            # Filter for the front sector (e.g., +/- 30 degrees: 0 to 30 or 330 to 360)
            front_points = [d for (a, d) in measurements if (a <= 30 or a >= 330) and d > 0]
            
            if front_points:
                # np.min ensures we are using the closest object in the front sector
                front_min_distance_lidar_mm = np.min(front_points)
            else:
                front_min_distance_lidar_mm = 9999 

            time.sleep(0.01) # Short delay for other threads
            
        except Exception as e:
            # Handle reading errors without crashing the main loop
            print(f"[WARN] LIDAR thread read error: {e}")
            time.sleep(0.25) 

# ULTRASONIC SENSOR THREAD (lgpio Implementation)
def read_ultrasonic_distance():
    """Measures distance using the TRIG/ECHO pins (returns distance in mm)."""
    
    # Send a short 10µs pulse to TRIG
    GPIO.gpio_write(h, TRIG_PIN, 1)
    time.sleep(0.00001)
    GPIO.gpio_write(h, TRIG_PIN, 0)

    # Use lgpio.wait_for_edge to measure pulse duration
    # Setting timeout to 0.05s (50ms) to prevent thread from hanging indefinitely
    start_time = GPIO.wait_for_edge(h, ECHO_PIN, GPIO.RISING_EDGE, 0.05) 
    if start_time < 0: # Timeout or error
        return 99999 
    
    end_time = GPIO.wait_for_edge(h, ECHO_PIN, GPIO.FALLING_EDGE, 0.05)
    if end_time < 0:
        return 99999

    # Calculate duration (in seconds)
    duration = end_time - start_time
    
    # Speed of sound in air is ~343 m/s = 343000 mm/s
    # Distance (mm) = (Duration * Speed) / 2 (since sound travels there and back)
    distance_mm = (duration * 343000) / 2.0
    
    # Note to self check range of HC-RS04
    if distance_mm > 4000:
        return 9999 
    
    return distance_mm 

def ultrasonic_thread():
    """Continuously read ultrasonic sensor and update global ultrasonic_distance_mm."""
    global ultrasonic_distance_mm
    
    while running:
        try:
            # Read ultrasonic data and update global variable
            ultrasonic_distance_mm = read_ultrasonic_distance()
            time.sleep(0.1) # Frequency of ultrasonic reads (10 Hz)
            
        except Exception as e:
            print(f"[WARN] Ultrasonic thread error: {e}")
            time.sleep(0.5) 


# MAIN CONTROL LOOP (FUSION)
avoidance_state = False 
avoidance_end_time = 0 

# Start threads for both sensors
threading.Thread(target=lidar_thread, daemon=True).start()
threading.Thread(target=ultrasonic_thread, daemon=True).start()

try:
    # Wait for sensor threads to stabilize
    print("Waiting 1 second for sensor threads to stabilize...")
    time.sleep(1)
    
    while running:
        # --- SENSOR FUSION ---
        lidar_dist = front_min_distance_lidar_mm 
        ultra_dist = ultrasonic_distance_mm 

        # FUSE: Take the minimum distance (closest obstacle) from both sensors
        min_distance_fused = np.min([lidar_dist, ultra_dist])
        
        # Log fusion result and current planned action
        print(f"LIDAR: {lidar_dist:.1f}mm | ULTRA: {ultra_dist:.1f}mm | FUSED MIN: {min_distance_fused:.1f}mm")

        # --- State 1: Running Avoidance Maneuver (Turning) ---
        if avoidance_state:
            if time.time() < avoidance_end_time:
                set_motion("turn_right")
            else:
                # Maneuver complete, check if path is clear before cruising
                avoidance_state = False
                print("--- Avoidance maneuver complete. Checking path. ---")

        # --- State 2: Cruising or Triggering Avoidance ---
        else: 
            if min_distance_fused < EMERGENCY_STOP_MM:
                # EMERGENCY: Too close. Stop and start turn immediately.
                print("!!! EMERGENCY STOP: Initiating turn !!!")
                set_motion("stop") # Brake/Stop first
                time.sleep(0.1)
                
                avoidance_state = True
                avoidance_end_time = time.time() + TURN_DURATION
                set_motion("turn_right")
                
            elif min_distance_fused < AVOID_THRESHOLD_MM:
                # OBSTACLE AHEAD: Start turn maneuver.
                print("Obstacle detected. Initiating turn right maneuver.")
                avoidance_state = True
                avoidance_end_time = time.time() + TURN_DURATION
                set_motion("turn_right")
                
            else:
                # PATH CLEAR: Drive forward.
                set_motion("forward")

        # Control loop frequency (2Hz)
        time.sleep(0.5) 

except KeyboardInterrupt:
    pass
except Exception as e:
    print(f"An unexpected error occurred: {e}")
finally:
    stop_and_cleanup()
    sys.exit(0)