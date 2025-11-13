import cv2
from pupil_apriltags import Detector

# --- CONFIGURATION ---
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Cannot access webcam.")
    exit()

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

print("Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Convert to grayscale for AprilTag detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    detections = detector.detect(gray)

    # Draw results
    for det in detections:
        tag_id = det.tag_id
        corners = det.corners.reshape((-1, 1, 2)).astype(int)
        cv2.polylines(frame, [corners], True, (0, 255, 0), 2)
        cv2.putText(frame, f"ID: {tag_id}", tuple(corners[0][0]),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        print(f"Detected Tag ID: {tag_id}")

    cv2.imshow("AprilTag Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
