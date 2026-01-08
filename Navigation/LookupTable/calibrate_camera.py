import cv2
import numpy as np
import glob

# -----------------------------
# CHECKERBOARD CONFIG
# -----------------------------
CHECKERBOARD = (9, 6)      # INNER corners (columns, rows)
SQUARE_SIZE = 0.025        # meters (25 mm)

# -----------------------------
# TERMINATION CRITERIA
# -----------------------------
criteria = (
    cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
    30,
    0.001
)

# -----------------------------
# PREPARE OBJECT POINTS
# -----------------------------
objp = np.zeros((CHECKERBOARD[0] * CHECKERBOARD[1], 3), np.float32)
objp[:, :2] = np.mgrid[0:CHECKERBOARD[0], 0:CHECKERBOARD[1]].T.reshape(-1, 2)
objp *= SQUARE_SIZE

objpoints = []  # 3D points in real world
imgpoints = []  # 2D points in image plane

# -----------------------------
# CAMERA CAPTURE
# -----------------------------
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Could not open camera")
    exit()

print("Press SPACE to capture a calibration image")
print("Press Q to finish and calibrate")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    found, corners = cv2.findChessboardCorners(
        gray,
        CHECKERBOARD,
        cv2.CALIB_CB_ADAPTIVE_THRESH
        + cv2.CALIB_CB_FAST_CHECK
        + cv2.CALIB_CB_NORMALIZE_IMAGE
    )

    display = frame.copy()

    if found:
        corners_refined = cv2.cornerSubPix(
            gray,
            corners,
            (11, 11),
            (-1, -1),
            criteria
        )

        cv2.drawChessboardCorners(
            display,
            CHECKERBOARD,
            corners_refined,
            found
        )

    cv2.imshow("Calibration", display)
    key = cv2.waitKey(1) & 0xFF

    if key == ord(' '):  # SPACE
        if found:
            objpoints.append(objp)
            imgpoints.append(corners_refined)
            print(f"Captured image {len(objpoints)}")
        else:
            print("Checkerboard not detected")

    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# -----------------------------
# CALIBRATION
# -----------------------------
print("\nCalibrating camera...")

ret, camera_matrix, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
    objpoints,
    imgpoints,
    gray.shape[::-1],
    None,
    None
)

print("\nCalibration successful")
print("Camera matrix:\n", camera_matrix)
print("Distortion coefficients:\n", dist_coeffs)

# -----------------------------
# SAVE RESULTS
# -----------------------------
np.savez(
    "camera_calibration.npz",
    camera_matrix=camera_matrix,
    dist_coeffs=dist_coeffs
)

print("\nSaved calibration to camera_calibration.npz")
