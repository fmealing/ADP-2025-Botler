import cv2
import numpy as np
from pupil_apriltags import Detector

# -----------------------------
# CONFIGURATION
# ----------------------------
CAMERA_INDEX = 1
IMAGE_WIDTH = 640
IMAGE_HEIGHT = 480

TARGET_TABLE = 5   # TODO: Make this dynamic

# -----------------------------
# TABLE LAYOUT
# -----------------------------
layout = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9]
]

TAG_OFFSET_TO_DIRECTION = {
    0: "FORWARD",
    1: "RIGHT",
    2: "BACKWARD",
    3: "LEFT"
}

# -----------------------------
# TABLE POSITION LOOKUP
# -----------------------------
def build_table_positions(layout):
    positions = {}
    for row in range(3):
        for col in range(3):
            positions[layout[row][col]] = (row, col)
    return positions

POSITIONS = build_table_positions(layout)

def table_index_to_table_id(table_index, layout):
    row = table_index // 3
    col = table_index % 3
    return layout[row][col]

def desired_direction(current_table, target_table):
    curr_row, curr_col = POSITIONS[current_table]
    tgt_row, tgt_col = POSITIONS[target_table]

    row_diff = tgt_row - curr_row
    col_diff = tgt_col - curr_col

    if abs(col_diff) > abs(row_diff):
        return "RIGHT" if col_diff > 0 else "LEFT"
    else:
        return "FORWARD" if row_diff > 0 else "BACKWARD"

def april_tag_to_command(detected_tag_id, target_table):
    table_index = detected_tag_id // 4
    tag_offset  = detected_tag_id % 4

    detected_direction = TAG_OFFSET_TO_DIRECTION[tag_offset]
    current_table = table_index_to_table_id(table_index, layout)

    desired = desired_direction(current_table, target_table)

    if detected_direction == desired:
        return detected_direction

    # Default search behaviour
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

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        detections = detector.detect(gray)

        command = None

        selected_det = select_most_central_detection(
            detections,
            IMAGE_WIDTH,
            IMAGE_HEIGHT
        )

        if selected_det is not None:
            tag_id = selected_det.tag_id
            command = april_tag_to_command(tag_id, TARGET_TABLE)

            cx, cy = map(int, selected_det.center)
            cv2.circle(frame, (cx, cy), 6, (0, 255, 0), -1)

            cv2.putText(
                frame,
                f"ID: {tag_id} -> {command}",
                (cx - 40, cy - 15),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2
            )

            print(f"Navigation command: {command}")

        cv2.imshow("AprilTag Navigation", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

        cap.release()
        cv2.destroyAllWindows()



if __name__ == "__main__":
    main()
