
import os
import cv2
import json
import numpy as np
import matplotlib.pyplot as plt
from pupil_apriltags import Detector

# --- CONFIGURATION ---
TAG_SIZE = 0.1  # Tag size in meters

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --- LOAD MAP DEFINITION ---
map_path = os.path.join(BASE_DIR, "maps", "room-2.json")
with open(map_path, "r") as f:
    tag_map = json.load(f)["tags"]
world_positions = {t["id"]: np.array(t["position"]) for t in tag_map}

# --- CAMERA INTRINSICS ---
fx, fy = 600, 600
cx, cy = 320, 240
camera_params = [fx, fy, cx, cy]

# --- INITIALIZE APRILTAG DETECTOR ---
detector = Detector(
    families="tag36h11",
    nthreads=4,
    quad_decimate=1.0,
    quad_sigma=0.0,
    refine_edges=True,
    decode_sharpening=0.25,
    debug=False,
)

# --- LOAD VIDEO ---
video_path = os.path.join(BASE_DIR, "test-videos", "video_3.MOV")
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print(f"❌ Cannot open video file: {video_path}")
    exit()

fps = cap.get(cv2.CAP_PROP_FPS)
if fps == 0:
    fps = 30
frame_delay = int(1000 / fps)
print(f"🎥 Video FPS: {fps:.2f}")

# --- STORAGE FOR CAMERA POSITIONS ---
camera_path = []

# --- MAIN LOOP ---
while True:
    ret, frame = cap.read()
    if not ret:
        print("Finished processing video.")
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detections = detector.detect(
        gray, estimate_tag_pose=True,
        camera_params=camera_params, tag_size=TAG_SIZE
    )

    camera_positions = []
    for d in detections:
        tag_id = d.tag_id
        if tag_id not in world_positions:
            continue

        R_cam_tag = np.array(d.pose_R)
        t_cam_tag = np.array(d.pose_t).reshape(3)

        # Invert transform (camera relative to tag)
        R_tag_cam = R_cam_tag.T
        t_tag_cam = -R_cam_tag.T @ t_cam_tag

        # Tag world pose
        t_world_tag = world_positions[tag_id]
        R_world_tag = np.eye(3)

        # Camera pose in world frame
        R_world_cam = R_world_tag @ R_tag_cam
        t_world_cam = R_world_tag @ t_tag_cam + t_world_tag
        camera_positions.append(t_world_cam)

        # Draw tag
        corners = d.corners.reshape((-1, 1, 2)).astype(int)
        cv2.polylines(frame, [corners], True, (0, 255, 0), 2)
        cv2.putText(frame, f"ID {tag_id}", tuple(corners[0][0]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 0), 2, cv2.LINE_AA)

    # --- AVERAGE POSITION PER FRAME ---
    if camera_positions:
        camera_pos_world = np.mean(camera_positions, axis=0)
        camera_path.append(camera_pos_world)  # store for later
        x, y, z = camera_pos_world

        coords_text = f"Camera: X={x:.2f}m  Y={y:.2f}m  Z={z:.2f}m"
        frame_height = frame.shape[0]
        font_scale = np.clip(frame_height / 1000, 0.6, 1.0)
        thickness = int(max(2, font_scale * 2))

        (text_w, text_h), _ = cv2.getTextSize(coords_text, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        x_pos, y_pos = int(0.03 * frame.shape[1]), int(0.08 * frame.shape[0])
        cv2.rectangle(frame, (x_pos - 10, y_pos - text_h - 10),
                      (x_pos + text_w + 10, y_pos + 10), (0, 0, 0), -1)
        cv2.putText(frame, coords_text, (x_pos, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 255, 255), thickness, cv2.LINE_AA)

    cv2.imshow("AprilTag Detection (Video)", frame)
    if cv2.waitKey(frame_delay) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# --- SAVE & PLOT PATH ---
if camera_path:
    camera_path = np.array(camera_path)
    np.savetxt(os.path.join(BASE_DIR, "camera_path.csv"), camera_path, delimiter=",",
               header="x,y,z", comments='')
    print(f"✅ Saved camera path to camera_path.csv with {len(camera_path)} entries.")

    # --- 3D PLOT ---
    fig = plt.figure(figsize=(8, 6))
    ax = fig.add_subplot(111, projection='3d')

    # Plot 3D line
    ax.plot(camera_path[:, 0], camera_path[:, 1], camera_path[:, 2],
            color='blue', marker='o', markersize=3, label="Camera path")

    # Highlight start & end
    ax.scatter(camera_path[0, 0], camera_path[0, 1], camera_path[0, 2],
               color='green', s=50, label='Start')
    ax.scatter(camera_path[-1, 0], camera_path[-1, 1], camera_path[-1, 2],
               color='red', s=50, label='End')

    # Labels & title
    ax.set_title("Camera Path in 3D Space")
    ax.set_xlabel("X (m)")
    ax.set_ylabel("Y (m)")
    ax.set_zlabel("Z (m)")
    ax.legend()
    ax.grid(True)

    # Equal aspect ratio for all axes
    max_range = (camera_path.max(axis=0) - camera_path.min(axis=0)).max() / 2.0
    mid = camera_path.mean(axis=0)
    ax.set_xlim(mid[0] - max_range, mid[0] + max_range)
    ax.set_ylim(mid[1] - max_range, mid[1] + max_range)
    ax.set_zlim(mid[2] - max_range, mid[2] + max_range)

    plt.tight_layout()
    plt.show()

else:
    print("⚠️ No camera positions detected; nothing to plot.")
