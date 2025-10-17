# TODO: Calibrate the camera


import cv2
import json
import numpy as np
from pupil_apriltags import Detector

# --- CONFIGURATION ---
TAG_SIZE = 0.05  # Tag size in meters (adjust to your printed size)

# Load your map definition
with open("map_definition.json", "r") as f:
    tag_map = json.load(f)["tags"]
world_positions = {t["id"]: np.array(t["position"]) for t in tag_map}

# Camera intrinsics (approximate — should be calibrated ideally)
fx, fy = 600, 600
cx, cy = 320, 240
camera_params = [fx, fy, cx, cy]

# Initialize AprilTag detector
detector = Detector(
    families="tag36h11",
    nthreads=4,
    quad_decimate=1.0,
    quad_sigma=0.0,
    refine_edges=True,
    decode_sharpening=0.25,
    debug=False,
)

cap = cv2.VideoCapture(1)
if not cap.isOpened():
    print("Cannot access webcam.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detections = detector.detect(gray, estimate_tag_pose=True,
                                 camera_params=camera_params, tag_size=TAG_SIZE)

    camera_positions = []

    for d in detections:
        tag_id = d.tag_id
        if tag_id not in world_positions:
            continue

        # Pose of tag relative to camera
        R_cam_tag = np.array(d.pose_R)
        t_cam_tag = np.array(d.pose_t).reshape(3)

        # Compute camera pose relative to tag (invert transform)
        R_tag_cam = R_cam_tag.T
        t_tag_cam = -R_cam_tag.T @ t_cam_tag

        # Tag's world position
        t_world_tag = world_positions[tag_id]
        R_world_tag = np.eye(3)  # assuming tags are flat on same plane

        # Combine transforms: camera in world frame
        R_world_cam = R_world_tag @ R_tag_cam
        t_world_cam = R_world_tag @ t_tag_cam + t_world_tag
        camera_positions.append(t_world_cam)

        # Draw tag outline + ID
        corners = d.corners.reshape((-1, 1, 2)).astype(int)
        cv2.polylines(frame, [corners], True, (0, 255, 0), 2)
        cv2.putText(frame, f"ID {tag_id}", tuple(corners[0][0]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)

    # Average all visible tags to estimate camera world position
    if camera_positions:
        camera_pos_world = np.mean(camera_positions, axis=0)
        print(f"Camera Position (x, y, z) in world frame: {camera_pos_world}")

    cv2.imshow("AprilTag World Localization", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
