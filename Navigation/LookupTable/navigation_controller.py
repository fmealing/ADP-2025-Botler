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
from apriltag_navigator import AprilTagNavigator

MODE_APRILTAG = 0
MODE_LIDAR = 1

class NavigationController:
    def __init__(self):
        self.mode = MODE_APRILTAG

        self.apriltag_nav = AprilTagNavigator(
            target_table=1 # TODO: MAke this dynamic
        )

    def run(self):
        while True:
            if self.mode == MODE_APRILTAG:
                command, aligned, distance, frame = self.apriltag_nav.step()

            if frame is not None:
                # Mode label
                cv2.putText(
                    frame,
                    "MODE: APRILTAG",
                    (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (255, 255, 0),
                    2
                )

                # Command label 
                cv2.putText(
                    frame,
                    f"CMD: {command}",
                    (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1.2,
                    (0, 255, 0) if command == "FORWARD" else (0, 165, 255),
                    3
                )

                if distance is not None:
                    cv2.putText(
                    frame,
                    f"DIST: {(distance):.2f} m", 
                    (20, 130),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9,
                    (255, 255, 255),
                    2
                )


                cv2.imshow("Navigation", frame)


                # Mode switch condition
                # if aligned:
                #     print("AprilTag aligned → switching to LiDAR")
                #     self.mode = MODE_LIDAR

            elif self.mode == MODE_LIDAR:
                print("[LIDAR] Navigating to table...")
                # When LiDAR reaches table:
                # self.mode = MODE_APRILTAG

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        self.shutdown()

    def shutdown(self):
        self.apriltag_nav.shutdown()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    NavigationController().run()