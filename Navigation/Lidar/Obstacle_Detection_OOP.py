#Obstacle Avoidance (Lidar + Ultrasonic) with ESP32 Control

import numpy as np
import serial
import struct
import threading
import time
import lgpio as GPIO
import sys


class MotorController:
    """Handles motor control via ESP32 GPIO pins."""
    
    def __init__(self, gpio_handle, right_pin=12, left_pin=13):
        """
        Initialize motor controller.
        
        Args:
            gpio_handle: lgpio chip handle
            right_pin: GPIO pin for right motor control
            left_pin: GPIO pin for left motor control
        """
        self.h = gpio_handle
        self.right_pin = right_pin
        self.left_pin = left_pin
        self.last_action = None
        
        # Claim motor control pins as output
        GPIO.gpio_claim_output(self.h, self.right_pin)
        GPIO.gpio_claim_output(self.h, self.left_pin)
        
        # Initialize to stopped state
        self.stop()
        print(f"Motor Controller initialized: Right=GPIO{self.right_pin}, Left=GPIO{self.left_pin}")
    
    def _set_pins(self, right_state, left_state):
        """Set motor control pins to HIGH (1) or LOW (0)."""
        try:
            GPIO.gpio_write(self.h, self.right_pin, right_state)
            GPIO.gpio_write(self.h, self.left_pin, left_state)
        except GPIO.error as e:
            print(f"[WARN] Motor GPIO write failed: {e}")
    
    def set_motion(self, action):
        """
        Set robot motion state.
        
        Args:
            action: One of 'stop', 'forward', 'turn_left', 'turn_right'
        """
        if action != self.last_action:
            print(f"→ Motion: {action}")
            self.last_action = action
        
        if action == "stop":
            self._set_pins(0, 0)
        elif action == "forward":
            self._set_pins(1, 1)
        elif action == "turn_left":
            self._set_pins(1, 0)
        elif action == "turn_right":
            self._set_pins(0, 1)
    
    def stop(self):
        """Stop all motors."""
        self._set_pins(0, 0)
    
    def forward(self):
        """Move forward."""
        self.set_motion("forward")
    
    def turn_left(self):
        """Turn left."""
        self.set_motion("turn_left")
    
    def turn_right(self):
        """Turn right."""
        self.set_motion("turn_right")


class LidarSensor:
    """Handles LIDAR sensor reading and processing."""
    
    # LIDAR Constants
    SERIAL_PORT = "/dev/ttyAMA0"
    BAUDRATE = 230400
    PACKET_LENGTH = 47
    MEASUREMENT_LENGTH = 12
    MESSAGE_FORMAT = "<xBHH" + "HB" * MEASUREMENT_LENGTH + "HHB"
    MAX_RANGE_MM = 12000  # 12 meter maximum range
    
    def __init__(self, calibration_offset_mm=0, front_angle_range=30):
        """
        Initialize LIDAR sensor.
        
        Args:
            calibration_offset_mm: Calibration offset in millimeters
            front_angle_range: Angle range for front detection (±degrees)
        """
        self.calibration_offset = calibration_offset_mm
        self.front_angle_range = front_angle_range
        self.front_min_distance_mm = 9999
        self.left_avg_distance_mm = 9999
        self.right_avg_distance_mm = 9999
        self.running = False
        self.thread = None
        self.serial_port = None
        
        print(f"LIDAR sensor initialized (front detection: ±{front_angle_range}°)")
    
    def _parse_packet(self, data):
        """Parse a single LIDAR data packet."""
        try:
            length, speed, start_angle, *pos_data, stop_angle, timestamp, crc = \
                struct.unpack(self.MESSAGE_FORMAT, data)
        except struct.error:
            return []
        
        # Convert angles from 1/100th degree to degrees
        start_angle = float(start_angle) / 100.0
        stop_angle = float(stop_angle) / 100.0
        
        # Handle wrap-around
        if stop_angle < start_angle:
            stop_angle += 360.0
        
        # Calculate angular step
        step = (stop_angle - start_angle) / (self.MEASUREMENT_LENGTH - 1)
        
        angles = [start_angle + step * i for i in range(self.MEASUREMENT_LENGTH)]
        distances = pos_data[0::2]  # Even indices
        
        # Apply calibration
        distances_corrected = [d + self.calibration_offset for d in distances]
        
        return list(zip(angles, distances_corrected))
    
    def _read_loop(self):
        """Continuous reading thread."""
        try:
            self.serial_port = serial.Serial(self.SERIAL_PORT, self.BAUDRATE, timeout=0.1)
        except Exception as e:
            print(f"[FATAL] Error opening LIDAR serial: {e}")
            self.running = False
            return
        
        while self.running:
            try:
                # Look for start bytes
                if self.serial_port.read() != b'\x54':
                    continue
                if self.serial_port.read() != b'\x2C':
                    continue
                
                # Read packet
                data = self.serial_port.read(self.PACKET_LENGTH - 2)
                if len(data) != self.PACKET_LENGTH - 2:
                    continue
                
                full_data = b'\x54\x2C' + data
                measurements = self._parse_packet(full_data)
                
                # Filter front sector with range validation
                front_points = [
                    d for (a, d) in measurements 
                    if (a <= self.front_angle_range or a >= 360 - self.front_angle_range) 
                    and 0 < d < self.MAX_RANGE_MM
                ]
                
                # Filter left sector (45° to 135°)
                left_points = [
                    d for (a, d) in measurements
                    if 45 <= a <= 135 and 0 < d < self.MAX_RANGE_MM
                ]
                
                # Filter right sector (225° to 315°)
                right_points = [
                    d for (a, d) in measurements
                    if 225 <= a <= 315 and 0 < d < self.MAX_RANGE_MM
                ]
                
                if front_points:
                    self.front_min_distance_mm = np.min(front_points)
                else:
                    self.front_min_distance_mm = 9999
                
                # Store average distances for left and right sectors
                self.left_avg_distance_mm = np.mean(left_points) if left_points else 9999
                self.right_avg_distance_mm = np.mean(right_points) if right_points else 9999
                
                time.sleep(0.01)
                
            except Exception as e:
                print(f"[WARN] LIDAR read error: {e}")
                time.sleep(0.25)
        
        if self.serial_port:
            self.serial_port.close()
    
    def start(self):
        """Start LIDAR reading thread."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        print("LIDAR thread started")
    
    def stop(self):
        """Stop LIDAR reading thread."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
    
    def get_distance(self):
        """Get current minimum front distance in mm."""
        return self.front_min_distance_mm
    
    def get_clearer_direction(self):
        """
        Determine which direction has more clearance.
        
        Returns:
            'left' if left side is clearer, 'right' if right side is clearer
        """
        if self.left_avg_distance_mm > self.right_avg_distance_mm:
            return 'left'
        else:
            return 'right'
    
    def get_side_distances(self):
        """Get left and right average distances."""
        return self.left_avg_distance_mm, self.right_avg_distance_mm


class UltrasonicSensor:
    """Handles ultrasonic sensor (HC-SR04) reading."""
    
    SPEED_OF_SOUND_MM_PER_SEC = 343000  # mm/s
    MAX_DISTANCE_MM = 4000
    
    def __init__(self, gpio_handle, trig_pin=23, echo_pin=24):
        """
        Initialize ultrasonic sensor.
        
        Args:
            gpio_handle: lgpio chip handle
            trig_pin: GPIO pin for trigger
            echo_pin: GPIO pin for echo
        """
        self.h = gpio_handle
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin
        self.distance_mm = 9999
        self.running = False
        self.thread = None
        
        # Claim pins
        GPIO.gpio_claim_output(self.h, self.trig_pin)
        GPIO.gpio_claim_input(self.h, self.echo_pin)
        GPIO.gpio_write(self.h, self.trig_pin, 0)
        
        print(f"Ultrasonic sensor initialized: TRIG=GPIO{trig_pin}, ECHO=GPIO{echo_pin}")
    
    def _measure_distance(self):
        """Perform a single distance measurement."""
        try:
            # Send trigger pulse
            GPIO.gpio_write(self.h, self.trig_pin, 1)
            time.sleep(0.00001)  # 10µs pulse
            GPIO.gpio_write(self.h, self.trig_pin, 0)
            
            # Wait for echo
            start_time = GPIO.wait_for_edge(self.h, self.echo_pin, GPIO.RISING_EDGE, 0.05)
            if start_time < 0:
                return 99999
            
            end_time = GPIO.wait_for_edge(self.h, self.echo_pin, GPIO.FALLING_EDGE, 0.05)
            if end_time < 0:
                return 99999
            
            # Calculate distance
            duration = end_time - start_time
            distance_mm = (duration * self.SPEED_OF_SOUND_MM_PER_SEC) / 2.0
            
            if distance_mm > self.MAX_DISTANCE_MM:
                return 9999
            
            return distance_mm
            
        except Exception as e:
            print(f"[WARN] Ultrasonic measurement error: {e}")
            return 99999
    
    def _read_loop(self):
        """Continuous reading thread."""
        while self.running:
            try:
                self.distance_mm = self._measure_distance()
                time.sleep(0.1)  # 10Hz
            except Exception as e:
                print(f"[WARN] Ultrasonic thread error: {e}")
                time.sleep(0.5)
    
    def start(self):
        """Start ultrasonic reading thread."""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()
        print("Ultrasonic thread started")
    
    def stop(self):
        """Stop ultrasonic reading thread."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
    
    def get_distance(self):
        """Get current distance in mm."""
        return self.distance_mm


class ObstacleAvoidance:
    """Main robot controller with obstacle avoidance."""
    
    def __init__(self, gpio_chip=0, 
                 emergency_stop_mm=250, 
                 avoid_threshold_mm=700,
                 turn_duration=0.6):
        """
        Initialize robot with sensors and motor control.
        
        Args:
            gpio_chip: GPIO chip number
            emergency_stop_mm: Emergency stop distance threshold
            avoid_threshold_mm: Obstacle avoidance threshold
            turn_duration: Duration of turn maneuver in seconds
        """
        self.emergency_stop_mm = emergency_stop_mm
        self.avoid_threshold_mm = avoid_threshold_mm
        self.turn_duration = turn_duration
        
        self.running = False
        self.avoidance_state = False
        self.avoidance_end_time = 0
        self.turn_direction = None  # Track which way we're turning
        
        # Initialize GPIO
        try:
            self.gpio_handle = GPIO.gpiochip_open(gpio_chip)
            print(f"GPIO Chip {gpio_chip} opened successfully")
        except GPIO.error as e:
            print(f"[FATAL] Failed to open GPIO chip {gpio_chip}: {e}")
            sys.exit(1)
        
        # Initialize components
        self.motor = MotorController(self.gpio_handle)
        self.lidar = LidarSensor()
        self.ultrasonic = UltrasonicSensor(self.gpio_handle)
        
        print("\n=== Robot Initialized ===")
        print(f"Emergency Stop: {emergency_stop_mm}mm")
        print(f"Avoid Threshold: {avoid_threshold_mm}mm")
        print(f"Turn Duration: {turn_duration}s\n")
    
    def start(self):
        """Start robot operation."""
        print("Starting robot systems...")
        
        # Start sensors
        self.lidar.start()
        self.ultrasonic.start()
        
        # Wait for sensors to stabilize
        print("Waiting for sensors to stabilize...")
        time.sleep(1)
        
        self.running = True
        print("Robot started! Press Ctrl+C to stop.\n")
    
    def stop(self):
        """Stop robot operation."""
        print("\nStopping robot...")
        self.running = False
        
        # Stop motors
        self.motor.stop()
        
        # Stop sensors
        self.lidar.stop()
        self.ultrasonic.stop()
        
        # Close GPIO
        try:
            GPIO.gpiochip_close(self.gpio_handle)
            print("GPIO closed cleanly")
        except Exception as e:
            print(f"Error closing GPIO: {e}")
        
        print("Robot stopped.")
    
    def get_fused_distance(self):
        """Get minimum distance from both sensors."""
        lidar_dist = self.lidar.get_distance()
        ultra_dist = self.ultrasonic.get_distance()
        min_dist = np.min([lidar_dist, ultra_dist])
        
        return lidar_dist, ultra_dist, min_dist
    
    def run(self):
        """Main control loop."""
        try:
            self.start()
            
            while self.running:
                # Get sensor readings
                lidar_dist, ultra_dist, min_dist = self.get_fused_distance()
                
                # Get side clearances from LIDAR
                left_dist, right_dist = self.lidar.get_side_distances()
                
                # Log readings
                print(f"LIDAR: F:{lidar_dist:5.0f}mm L:{left_dist:5.0f}mm R:{right_dist:5.0f}mm | ULTRA: {ultra_dist:5.0f}mm | MIN: {min_dist:5.0f}mm")
                
                # State 1: Running avoidance maneuver
                if self.avoidance_state:
                    if time.time() < self.avoidance_end_time:
                        # Continue turning in the chosen direction
                        if self.turn_direction == 'left':
                            self.motor.turn_left()
                        else:
                            self.motor.turn_right()
                    else:
                        self.avoidance_state = False
                        self.turn_direction = None
                        print("--- Avoidance complete ---")
                
                # State 2: Cruising or triggering avoidance
                else:
                    if min_dist < self.emergency_stop_mm:
                        print("!!! EMERGENCY STOP !!!")
                        self.motor.stop()
                        time.sleep(0.1)
                        
                        # Choose direction based on LIDAR scan
                        self.turn_direction = self.lidar.get_clearer_direction()
                        print(f"→ Turning {self.turn_direction} (L:{left_dist:.0f}mm R:{right_dist:.0f}mm)")
                        
                        self.avoidance_state = True
                        self.avoidance_end_time = time.time() + self.turn_duration
                        
                        if self.turn_direction == 'left':
                            self.motor.turn_left()
                        else:
                            self.motor.turn_right()
                        
                    elif min_dist < self.avoid_threshold_mm:
                        # Choose direction based on LIDAR scan
                        self.turn_direction = self.lidar.get_clearer_direction()
                        print(f"→ Obstacle detected. Turning {self.turn_direction} (L:{left_dist:.0f}mm R:{right_dist:.0f}mm)")
                        
                        self.avoidance_state = True
                        self.avoidance_end_time = time.time() + self.turn_duration
                        
                        if self.turn_direction == 'left':
                            self.motor.turn_left()
                        else:
                            self.motor.turn_right()
                        
                    else:
                        self.motor.forward()
                
                time.sleep(0.5)  # 2Hz control loop
                
        except KeyboardInterrupt:
            print("\n\nKeyboard interrupt detected")
        except Exception as e:
            print(f"\n\nUnexpected error: {e}")
        finally:
            self.stop()


# Main execution
if __name__ == "__main__":
    # Create robot instance
    robot = ObstacleAvoidance(
        gpio_chip=0,
        emergency_stop_mm=250,
        avoid_threshold_mm=700,
        turn_duration=0.6
    )
    
    # Run robot
    robot.run()
    
    sys.exit(0)