"""
TODOs:
- Turn LiDAR code into a version that returns "LEFT", "RIGHT", "FORWARD", or "STOP"
- In this file define the states 
    - S1: rotate left 
    - S2: centre tag horizontally 
    - S3: Move forward 
    - S4: Avoid obstacles
    - S5: Stop

- Define state transitions
    - S1→S2: AprilTag corresponding to table is identified
    - S2→S3: Once AprilTag is centred horizontally 
    - S1, S2, S3 → S4: If LiDAR detects obstacle in front of  threshold
    - S4 → S1: After obstacle sequence is completed
    - S3 → S5: After robot is in front of table
- Implement interrupt for the LiDAR obstacle detectiohn
"""

import cv2
import timer
import lgpio as GPIO
from apriltag_navigator import AprilTagNavigator
from Obstacle_Detection_OOP import ObstacleDetector
from Motor_driver import MotorDriver
from enum import Enum, auto

class NavState(Enum):
    S1_ROTATE_LEFT = auto()       # search
    S2_CENTER_TAG = auto()        # align
    S3_MOVE_FORWARD = auto()      # approach
    S4_AVOID_OBSTACLES = auto()   # avoidance override
    S5_STOP = auto()              # finished


class NavigationController:
    def __init__(self, gpio_chip=0, target_table=1):
        # Hardware init
        self.h = GPIO.gpiochip_open(gpio_chip)

        # Single owner of motor GPIO → ESP
        self.motor = MotorDriver(self.h, right_pin=12, left_pin=13, verbose=True)

        # Your AprilTag navigator (OOP)
        self.nav = AprilTagNavigator(target_table=target_table)

        # Obstacle detector as object (OOP)
        self.obstacles = ObstacleDetector(
            gpio_handle=self.h,
            avoid_threshold_mm=700,
            emergency_stop_mm=250,
            turn_duration_s=0.6,
            clear_required_s=0.4,
            control_hz=8.0,
        )
        self.obstacles.start()

        # State machine
        self.state = NavState.S1_ROTATE_LEFT

    def shutdown(self):
        try:
            self.motor.apply("STOP")
        except Exception:
            pass
        try:
            self.obstacles.stop()
        except Exception:
            pass
        try:
            self.nav.shutdown()
        except Exception:
            pass
        try:
            GPIO.gpiochip_close(self.h)
        except Exception:
            pass
        cv2.destroyAllWindows()

    def _interrupt_obstacle(self):
        # S1/S2/S3 -> S4 when obstacle present
        if self.state in (NavState.S1_ROTATE_LEFT, NavState.S2_CENTER_TAG, NavState.S3_MOVE_FORWARD):
            if self.obstacles.obstacle_present():
                self.state = NavState.S4_AVOID_OBSTACLES

    def run(self):
        try:
            while True:
                # 1) interrupt check
                self._interrupt_obstacle()

                frame = None
                cmd = "STOP"
                aligned = False
                distance = None

                # 2) state machine
                if self.state == NavState.S1_ROTATE_LEFT:
                    # Search: rotate left until tag is detected
                    at_cmd, aligned, distance, frame = self.nav.step()

                    # We force LEFT here to satisfy “rotate to search”
                    cmd = "LEFT"
                    self.motor.apply(cmd)

                    # transition: S1->S2 when tag identified (distance not None)
                    if distance is not None:
                        self.state = NavState.S2_CENTER_TAG

                elif self.state == NavState.S2_CENTER_TAG:
                    # Align using AprilTagNavigator command
                    cmd, aligned, distance, frame = self.nav.step()
                    self.motor.apply(cmd)

                    # transition: S2->S3 when aligned
                    if aligned:
                        self.state = NavState.S3_MOVE_FORWARD

                elif self.state == NavState.S3_MOVE_FORWARD:
                    cmd, aligned, distance, frame = self.nav.step()
                    self.motor.apply(cmd)

                    # transition: S3->S5 when navigator says STOP (distance < 0.5 in your code)
                    if cmd == "STOP":
                        self.state = NavState.S5_STOP

                elif self.state == NavState.S4_AVOID_OBSTACLES:
                    # Avoidance overrides everything
                    cmd = self.obstacles.step()
                    self.motor.apply(cmd)

                    # exit avoidance once clear long enough
                    if self.obstacles.avoidance_complete():
                        self.state = NavState.S1_ROTATE_LEFT

                    # optional: keep camera view alive for debugging
                    try:
                        _, _, _, frame = self.nav.step()
                    except Exception:
                        frame = None

                elif self.state == NavState.S5_STOP:
                    cmd = "STOP"
                    self.motor.apply(cmd)
                    # keep camera view alive
                    try:
                        _, _, distance, frame = self.nav.step()
                    except Exception:
                        frame = None

                # 3) UI overlay
                if frame is not None:
                    cv2.putText(frame, f"STATE: {self.state.name}", (20, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2)
                    cv2.putText(frame, f"CMD: {cmd}", (20, 80),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
                    if distance is not None:
                        cv2.putText(frame, f"DIST: {distance:.2f}m", (20, 130),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
                    cv2.imshow("Navigation", frame)

                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

                time.sleep(0.01)

        except KeyboardInterrupt:
            pass
        finally:
            self.shutdown()

if __name__ == "__main__":
    NavigationController(gpio_chip=0, target_table=1).run()