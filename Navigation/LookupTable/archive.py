import cv2
import numpy as np
from pupil_apriltags import Detector

# -----------------------------
# CONFIGURATION
# ----------------------------
CAMERA_INDEX = 0
IMAGE_WIDTH = 1280
IMAGE_HEIGHT = 720

TARGET_TABLE = 1   # TODO: Make this dynamic

# -----------------------------
# CAMERA CALIBRATION (from checkerboard)
# -----------------------------
FX = 1411.93  
FY = 1411.29 
CX = 614.377483
CY = 536.555134

K = np.array([
    [FX, 0, CX],
    [0, FY, CY],
    [0,  0,  1]
])

dist = np.array([0.06860953, 0.01557485, 0.00265338, -0.00024421, 0.22515038])


TAG_SIZE = 0.09  # meters

# -----------------------------
# TABLE LAYOUT
# -----------------------------
layout = [
    [1, 2, 3, 4],   # Left side
    [5, 6, 7, 8],   # Right side 
]

TAG_OFFSET_TO_DIRECTION = {
    0: "FORWARD",
    1: "RIGHT",
    2: "BACKWARD",
    3: "LEFT"
}


# -----------------------------
# TABLE POSITION LOOKUP (1x3)
# -----------------------------
def table_index_to_table_id(table_index, layout):
    cols = len(layout[0])          # 3 for [1,5,8]
    if table_index < 0 or table_index >= cols:
        return None
    return layout[0][table_index]  # row is always 0 in 1x3


def build_table_positions(layout):
    positions = {}
    for col in range(len(layout)):          # 0..1
        for row in range(len(layout[col])): # 0..3
            positions[layout[col][row]] = (col, row)
    return positions

POSITIONS = build_table_positions(layout)


def desired_direction(current_table, target_table):
    curr_col, curr_row = POSITIONS[current_table]
    tgt_col, tgt_row = POSITIONS[target_table]

    if tgt_col > curr_col:
        return "RIGHT"
    if tgt_col < curr_col:
        return "LEFT"
    if tgt_row > curr_row:
        return "FORWARD"
    if tgt_row < curr_row:
        return "BACKWARD"
    return "FORWARD"


def april_tag_to_command(tag_id, target_table):
    current_table = tag_id_to_cube_id(tag_id)   # 1..9
    tag_offset = tag_id % 4                     # 0..3
    detected_direction = TAG_OFFSET_TO_DIRECTION.get(tag_offset)

    # Ignore cube IDs not in the navigation layout
    if current_table not in POSITIONS:
        return None

    if target_table not in POSITIONS:
        return None

    if detected_direction is None:
        return None

    desired = desired_direction(current_table, target_table)

    # If the tag you see is the face that points toward where you need to go:
    if detected_direction == desired:
        return desired

    # Otherwise rotate / search behaviour
    return "LEFT"


def select_most_central_detection(detections, image_width, image_height):
    if not detections:
        return None

    img_cx = image_width // 2
    img_cy = image_height // 2

    def squared_distance(det):
        cx, cy = det.center
        return (cx - img_cx) ** 2 + (cy - img_cy) ** 2

    return min(detections, key=squared_distance)


def tag_id_to_cube_id(tag_id: int) -> int:
    return (tag_id // 4) + 1



# -----------------------------
# CAMERA + APRILTAG PIPELINE
# -----------------------------
def main():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, IMAGE_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, IMAGE_HEIGHT)

    if not cap.isOpened():
        print("ERROR: Could not open camera")
        return

    # Pupil-apriltags detector
    detector = Detector(
        families="tag36h11",
        nthreads=2,
        quad_decimate=1.0,
        quad_sigma=0.0,
        refine_edges=1,
        decode_sharpening=0.25,
        debug=0
    )

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray_raw = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.undistort(gray_raw, K, dist)

        detections = detector.detect(
            gray,
            estimate_tag_pose=True,
            camera_params=(FX, FY, CX, CY),
            tag_size=TAG_SIZE
        )


        command = None

        selected_det = select_most_central_detection(
            detections,
            IMAGE_WIDTH,
            IMAGE_HEIGHT
        )

        if selected_det is not None:
            print("\n--- TAG DETECTED ---")
            print("Raw tag ID:", selected_det.tag_id)
            tag_id = selected_det.tag_id
            command = april_tag_to_command(tag_id, TARGET_TABLE)

            if command is None:
                command = "NO_CMD"

            distance_m = float(selected_det.pose_t[2][0])


            tag_cx, tag_cy = map(int, selected_det.center)
            cv2.circle(frame, (tag_cx, tag_cy), 6, (0, 255, 0), -1)

            cv2.putText(
                frame,
                f"ID:{tag_id} {command} {distance_m:.2f}m",
                (tag_cx - 40, tag_cy - 15),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2
            )
            print(f"Navigation command: {command}, Distance: {distance_m}")

        cv2.imshow("AprilTag Navigation", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    del detector



if __name__ == "__main__":
    main()
