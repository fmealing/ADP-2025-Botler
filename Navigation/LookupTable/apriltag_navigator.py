import cv2
import numpy as np
from pupil_apriltags import Detector


class AprilTagNavigator:
    def __init__(
        self,
        target_table: int,
        camera_index=0,
        image_width=1280,
        image_height=720,
        center_tol=30
    ):
        self.camera_index = camera_index
        self.image_width = image_width
        self.image_height = image_height
        self.center_tol = center_tol

        self.target_tags = set(range((target_table - 1) * 4, target_table * 4))
        self.img_cx = image_width // 2

        # Camera calibration
        self.FX = 1411.93
        self.FY = 1411.29
        self.CX = 614.377483
        self.CY = 536.555134

        self.K = np.array([
            [self.FX, 0, self.CX],
            [0, self.FY, self.CY],
            [0,  0,  1]
        ])

        self.dist = np.array([0.06860953, 0.01557485, 0.00265338, -0.00024421, 0.22515038])
        self.TAG_SIZE = 0.09

        self.cap = cv2.VideoCapture(self.camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.image_width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.image_height)

        self.detector = Detector(
            families="tag36h11",
            nthreads=2,
            quad_decimate=1.0,
            refine_edges=1
        )

    def _estimate_distance_camera_to_tag(self, det):
        corners = det.corners
        pixel_width = np.linalg.norm(corners[0] - corners[1])

        if pixel_width <= 0:
            return None

        distance = (self.FX * self.TAG_SIZE) / pixel_width
        return distance


    def _find_target_tag(self, detections):
        for det in detections:
            if det.tag_id in self.target_tags:
                return det
        return None

    def step(self):
        """
        Returns:
            command (str): LEFT / RIGHT / FORWARD 
            aligned (bool): True when camera is facing table
            distance (float | None): meters from camera to tag
            frame (np.array): Debug frame
        """
        ret, frame = self.cap.read()
        if not ret:
            return "LEFT", False, None

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.undistort(gray, self.K, self.dist)

        detections = self.detector.detect(
            gray,
            estimate_tag_pose=False,
            camera_params=(self.FX, self.FY, self.CX, self.CY),
            tag_size=self.TAG_SIZE
        )

        target = self._find_target_tag(detections)

        if target is None:
            return "LEFT", False, None, frame

        
        distance = self._estimate_distance_camera_to_tag(target)

        tag_x, tag_y = map(int, target.center)
        error = tag_x - self.img_cx

        cv2.circle(frame, (tag_x, tag_y), 6, (0, 255, 0), -1)

        if abs(error) < self.center_tol:
            return "FORWARD", True, distance, frame
        elif error > 0:
            return "RIGHT", False, distance, frame
        else:
            return "LEFT", False, distance, frame

    def shutdown(self):
        self.cap.release()
