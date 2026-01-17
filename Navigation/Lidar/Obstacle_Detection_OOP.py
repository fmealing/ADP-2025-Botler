# obstacle_detector.py
import numpy as np
import serial
import struct
import threading
import time
import lgpio as GPIO


class LidarSensor:
    SERIAL_PORT = "/dev/ttyAMA0"
    BAUDRATE = 230400
    PACKET_LENGTH = 47
    MEASUREMENT_LENGTH = 12
    MESSAGE_FORMAT = "<xBHH" + "HB" * MEASUREMENT_LENGTH + "HHB"
    MAX_RANGE_MM = 12000

    def __init__(self, calibration_offset_mm=0, front_angle_range=30):
        self.calibration_offset = calibration_offset_mm
        self.front_angle_range = front_angle_range

        self.front_min_distance_mm = 9999.0
        self.left_avg_distance_mm = 9999.0
        self.right_avg_distance_mm = 9999.0

        self.running = False
        self.thread = None
        self.serial_port = None

    def _parse_packet(self, data: bytes):
        try:
            length, speed, start_angle, *pos_data, stop_angle, timestamp, crc = \
                struct.unpack(self.MESSAGE_FORMAT, data)
        except struct.error:
            return []

        start_angle = float(start_angle) / 100.0
        stop_angle = float(stop_angle) / 100.0
        if stop_angle < start_angle:
            stop_angle += 360.0

        step = (stop_angle - start_angle) / (self.MEASUREMENT_LENGTH - 1)
        angles = [start_angle + step * i for i in range(self.MEASUREMENT_LENGTH)]
        distances = pos_data[0::2]
        distances_corrected = [d + self.calibration_offset for d in distances]
        return list(zip(angles, distances_corrected))

    def _read_loop(self):
        try:
            self.serial_port = serial.Serial(self.SERIAL_PORT, self.BAUDRATE, timeout=0.1)
        except Exception as e:
            print(f"[FATAL] LIDAR serial open failed: {e}")
            self.running = False
            return

        while self.running:
            try:
                if self.serial_port.read() != b"\x54":
                    continue
                if self.serial_port.read() != b"\x2C":
                    continue

                data = self.serial_port.read(self.PACKET_LENGTH - 2)
                if len(data) != self.PACKET_LENGTH - 2:
                    continue

                full_data = b"\x54\x2C" + data
                measurements = self._parse_packet(full_data)

                front_points = [
                    d for (a, d) in measurements
                    if (a <= self.front_angle_range or a >= 360 - self.front_angle_range)
                    and 0 < d < self.MAX_RANGE_MM
                ]
                left_points = [
                    d for (a, d) in measurements
                    if 45 <= a <= 135 and 0 < d < self.MAX_RANGE_MM
                ]
                right_points = [
                    d for (a, d) in measurements
                    if 225 <= a <= 315 and 0 < d < self.MAX_RANGE_MM
                ]

                self.front_min_distance_mm = float(np.min(front_points)) if front_points else 9999.0
                self.left_avg_distance_mm = float(np.mean(left_points)) if left_points else 9999.0
                self.right_avg_distance_mm = float(np.mean(right_points)) if right_points else 9999.0

                time.sleep(0.01)

            except Exception as e:
                print(f"[WARN] LIDAR read error: {e}")
                time.sleep(0.25)

        try:
            if self.serial_port:
                self.serial_port.close()
        except Exception:
            pass

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)

    def get_distance(self) -> float:
        return float(self.front_min_distance_mm)

    def get_side_distances(self):
        return float(self.left_avg_distance_mm), float(self.right_avg_distance_mm)

    def get_clearer_direction(self) -> str:
        return "left" if self.left_avg_distance_mm > self.right_avg_distance_mm else "right"


class UltrasonicSensor:
    SPEED_OF_SOUND_MM_PER_SEC = 343000
    MAX_DISTANCE_MM = 4000

    def __init__(self, gpio_handle, trig_pin=23, echo_pin=24):
        self.h = gpio_handle
        self.trig_pin = trig_pin
        self.echo_pin = echo_pin

        self.distance_mm = 9999.0
        self.running = False
        self.thread = None

        GPIO.gpio_claim_output(self.h, self.trig_pin)
        GPIO.gpio_claim_input(self.h, self.echo_pin)
        GPIO.gpio_write(self.h, self.trig_pin, 0)

    def _measure_distance(self) -> float:
        try:
            GPIO.gpio_write(self.h, self.trig_pin, 1)
            time.sleep(0.00001)
            GPIO.gpio_write(self.h, self.trig_pin, 0)

            start_time = GPIO.wait_for_edge(self.h, self.echo_pin, GPIO.RISING_EDGE, 0.05)
            if start_time < 0:
                return 99999.0

            end_time = GPIO.wait_for_edge(self.h, self.echo_pin, GPIO.FALLING_EDGE, 0.05)
            if end_time < 0:
                return 99999.0

            duration = end_time - start_time
            distance_mm = (duration * self.SPEED_OF_SOUND_MM_PER_SEC) / 2.0

            if distance_mm > self.MAX_DISTANCE_MM:
                return 9999.0

            return float(distance_mm)
        except Exception:
            return 99999.0

    def _read_loop(self):
        while self.running:
            self.distance_mm = self._measure_distance()
            time.sleep(0.1)

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._read_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)

    def get_distance(self) -> float:
        return float(self.distance_mm)


class ObstacleDetector:

    def __init__(
        self,
        gpio_handle,
        avoid_threshold_mm=700,
        emergency_stop_mm=250,
        turn_duration_s=0.6,
        clear_required_s=0.4,
        control_hz=8.0,
    ):
        self.h = gpio_handle

        self.avoid_threshold_mm = float(avoid_threshold_mm)
        self.emergency_stop_mm = float(emergency_stop_mm)
        self.turn_duration_s = float(turn_duration_s)
        self.clear_required_s = float(clear_required_s)
        self.control_dt = 1.0 / float(control_hz)

        self.lidar = LidarSensor()
        self.ultrasonic = UltrasonicSensor(self.h)

        # Avoidance internal state
        self._avoidance_active = False
        self._avoidance_end_time = 0.0
        self._turn_direction = None
        self._clear_start = None

    def start(self):
        self.lidar.start()
        self.ultrasonic.start()
        time.sleep(1.0)

    def stop(self):
        self.lidar.stop()
        self.ultrasonic.stop()

    def _fused_min_distance(self) -> float:
        lidar_d = self.lidar.get_distance()
        ultra_d = self.ultrasonic.get_distance()
        return float(np.min([lidar_d, ultra_d]))

    def obstacle_present(self) -> bool:
        return self._fused_min_distance() < self.avoid_threshold_mm

    def avoidance_complete(self) -> bool:
        # must be clear continuously for clear_required_s
        if self.obstacle_present():
            self._clear_start = None
            return False
        if self._clear_start is None:
            self._clear_start = time.time()
            return False
        return (time.time() - self._clear_start) >= self.clear_required_s

    def step(self) -> str:
        min_dist = self._fused_min_distance()

        # continue a timed turn maneuver if active
        if self._avoidance_active:
            if time.time() < self._avoidance_end_time:
                time.sleep(self.control_dt)
                return "LEFT" if self._turn_direction == "left" else "RIGHT"
            else:
                self._avoidance_active = False
                self._turn_direction = None
                time.sleep(self.control_dt)
                return "FORWARD"

        # trigger avoidance
        if min_dist < self.emergency_stop_mm:
            self._turn_direction = self.lidar.get_clearer_direction()
            self._avoidance_active = True
            self._avoidance_end_time = time.time() + self.turn_duration_s
            time.sleep(self.control_dt)
            return "STOP"

        if min_dist < self.avoid_threshold_mm:
            self._turn_direction = self.lidar.get_clearer_direction()
            self._avoidance_active = True
            self._avoidance_end_time = time.time() + self.turn_duration_s
            time.sleep(self.control_dt)
            return "LEFT" if self._turn_direction == "left" else "RIGHT"

        time.sleep(self.control_dt)
        return "FORWARD"