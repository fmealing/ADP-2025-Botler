import os
import time
import cv2
import json
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D  # noqa: F401
from collections import deque
from pupil_apriltags import Detector

# --- CONFIGURATION ---
TAG_SIZE = 0.05          # m
LIVE_MODE = True        # True = live webcam, False = video file

# Motion filtering / smoothing
MAX_SPEED = 0.6         # m/s (physical max of your rig)
STAB_FRAMES = 10        # frames needed to stabilise
STAB_STD_THRESH = 0.02  # m, max std dev across xyz during stabilisation
EMA_ALPHA = 0.2         # 0..1, higher = more smoothing

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- LOAD MAP DEFINITION ---
map_path = os.path.join(BASE_DIR, "maps", "125-lab.json")
with open(map_path, "r") as f:
    tag_map = json.load(f)["tags"]
world_positions = {t["id"]: np.array(t["position"], dtype=float) for t in tag_map}

# --- CAMERA INTRINSICS (from calibration) ---
fx, fy = 3074.20762, 3067.80082
cx, cy = 1512.0512, 2008.5982
camera_params = [fx, fy, cx, cy]

# --- DISTORTION COEFFICIENTS ---
dist_coeffs = np.array([0.212998004, -1.22270810, -0.00290084, -0.00057276, 1.92609281], dtype=float)

# --- APRILTAG DETECTOR ---
detector = Detector(
    families="tag36h11",
    nthreads=4,
    quad_decimate=1.0,
    quad_sigma=0.0,
    refine_edges=True,
    decode_sharpening=0.25,
    debug=False,
)

# --- VIDEO / CAMERA ---
if LIVE_MODE:
    cap = cv2.VideoCapture(0)  # usually 0 for MacBook camera
else:
    video_path = os.path.join(BASE_DIR, "test-videos", "video_3.MOV")
    cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("❌ Cannot open video/camera.")
    raise SystemExit

# --- PLOTTING SETUP ---
plt.ion()
fig = plt.figure(figsize=(8, 6))
ax = fig.add_subplot(111, projection='3d')
ax.set_title("Live Camera Path")
ax.set_xlabel("X (m)")
ax.set_ylabel("Y (m)")
ax.set_zlabel("Z (m)")
ax.grid(True)

tag_positions = np.array(list(world_positions.values()), dtype=float)
if len(tag_positions) > 0:
    ax.scatter(tag_positions[:, 0], tag_positions[:, 1], tag_positions[:, 2],
               color='gray', s=40, marker='^', label='AprilTags')
    ax.legend()

# --- RUNTIME STATE ---
camera_path = []                       # accepted (filtered + smoothed) positions
stabilisation_buffer = deque(maxlen=STAB_FRAMES)
tracking_started = False

last_valid_pos = None                  # last accepted (pre-EMA) position
last_valid_time = None                 # timestamp of last accepted position
ema_pos = None                         # EMA'd position (what we plot)

# For timing
t0 = time.time()

# Precompute camera matrix once
mtx = np.array([[fx, 0, cx],
                [0, fy, cy],
                [0,  0,  1]], dtype=float)

# --- MAIN LOOP ---
while True:
    ret, frame = cap.read()
    if not ret:
        break

    now = time.time()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # --- UNDISTORT (once we know frame shape) ---
    h, w = gray.shape[:2]
    newcameramtx, _ = cv2.getOptimalNewCameraMatrix(mtx, dist_coeffs, (w, h), 1, (w, h))
    gray_ud = cv2.undistort(gray, mtx, dist_coeffs, None, newcameramtx)

    # --- DETECT APRILTAGS ---
    detections = detector.detect(
        gray_ud,
        estimate_tag_pose=True,
        camera_params=camera_params,
        tag_size=TAG_SIZE
    )

    # Compute world-space camera position estimates per visible tag
    cam_positions_this_frame = []
    for d in detections:
        tag_id = d.tag_id
        if tag_id not in world_positions:
            continue

        R_cam_tag = np.array(d.pose_R, dtype=float)
        t_cam_tag = np.array(d.pose_t, dtype=float).reshape(3)

        # Camera pose wrt tag -> invert to tag->camera frame
        R_tag_cam = R_cam_tag.T
        t_tag_cam = -R_cam_tag.T @ t_cam_tag

        # Tag world pose (assumed identity rotation here; extend if you have tag orientations)
        t_world_tag = world_positions[tag_id]
        # R_world_tag = I
        t_world_cam = t_tag_cam + t_world_tag

        cam_positions_this_frame.append(t_world_cam)

        # Draw detection
        corners = d.corners.reshape((-1, 1, 2)).astype(int)
        cv2.polylines(frame, [corners], True, (0, 255, 0), 2)
        cv2.putText(frame, f"ID {tag_id}", tuple(corners[0][0]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2, cv2.LINE_AA)

    # --- FRAME POSITION (mean over tags) ---
    if cam_positions_this_frame:
        pos_world = np.mean(cam_positions_this_frame, axis=0)

        # 1) Stabilisation phase: wait until variance is small
        if not tracking_started:
            stabilisation_buffer.append(pos_world)
            if len(stabilisation_buffer) == STAB_FRAMES:
                std_dev = np.std(np.stack(stabilisation_buffer, axis=0), axis=0)
                if float(np.max(std_dev)) < STAB_STD_THRESH:
                    tracking_started = True
                    print("✅ Tracking stabilised and started.")
            # Show message while stabilising
            cv2.putText(frame, "Stabilising...", (30, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 165, 255), 2, cv2.LINE_AA)
        else:
            # 2) Velocity gating: reject impossible jumps
            accept = True
            if last_valid_pos is not None and last_valid_time is not None:
                dt = max(now - last_valid_time, 1e-6)
                speed = np.linalg.norm(pos_world - last_valid_pos) / dt
                if speed > MAX_SPEED:
                    accept = False
                    cv2.putText(frame, "Outlier rejected", (30, 80),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2, cv2.LINE_AA)

            if accept:
                # Update reference (pre-EMA)
                last_valid_pos = pos_world
                last_valid_time = now

                # 3) EMA smoothing on accepted positions
                if ema_pos is None:
                    ema_pos = pos_world.copy()
                else:
                    ema_pos = EMA_ALPHA * pos_world + (1.0 - EMA_ALPHA) * ema_pos

                camera_path.append(ema_pos.copy())

                # HUD text
                x, y, z = ema_pos
                coords_text = f"X={x:.2f}  Y={y:.2f}  Z={z:.2f}"
                cv2.putText(frame, coords_text, (30, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 255), 2, cv2.LINE_AA)

                # --- LIVE 3D PLOT UPDATE ---
                if len(camera_path) > 1:
                    path = np.array(camera_path, dtype=float)
                    ax.cla()
                    ax.set_title("Live Camera Path")
                    ax.set_xlabel("X (m)")
                    ax.set_ylabel("Y (m)")
                    ax.set_zlabel("Z (m)")
                    ax.grid(True)

                    if len(tag_positions) > 0:
                        ax.scatter(tag_positions[:, 0], tag_positions[:, 1], tag_positions[:, 2],
                                   s=40, marker='^', label='AprilTags')

                    ax.plot(path[:, 0], path[:, 1], path[:, 2], marker='o', markersize=3, label='Path')
                    ax.scatter(path[-1, 0], path[-1, 1], path[-1, 2], s=50, label='Current')
                    ax.legend()

                    # Keep roughly equal aspect
                    max_range = (path.max(axis=0) - path.min(axis=0)).max() / 2.0
                    mid = path.mean(axis=0)
                    ax.set_xlim(mid[0] - max_range, mid[0] + max_range)
                    ax.set_ylim(mid[1] - max_range, mid[1] + max_range)
                    ax.set_zlim(mid[2] - max_range, mid[2] + max_range)

                    plt.draw()
                    plt.pause(0.001)

    # --- Display frame ---
    cv2.imshow("AprilTag Live Detection", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
plt.ioff()
plt.show()
