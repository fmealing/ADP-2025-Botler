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
                command, aligned, frame = self.apriltag_nav.step()

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