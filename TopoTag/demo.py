"""
topotag_visual_steps.py
-----------------------
Generates a step-by-step visualization of a TopoTag / AprilTag detection workflow.
Input:  ./test-images/IMG_6393.png
Output: ./topotag_steps/*.png

Steps:
0. Input image
1. Grayscale conversion
2. Adaptive threshold
3. Edge detection
4. Quadrilateral candidates
5. Corner ordering + homography
6. Warped tag tiles
7. Grid sampling visualization
8. Combined montage for slides
"""

import cv2
import numpy as np
from pathlib import Path

# ----------------------------
# CONFIG
# ----------------------------
IMG_PATH = "./test-images/IMG_6397.png"
OUT_DIR = Path("./topotag_steps")
OUT_DIR.mkdir(parents=True, exist_ok=True)


# ----------------------------
# HELPER FUNCTIONS
# ----------------------------
def save_fig(img_bgr, name):
    """Save image to OUT_DIR"""
    path = OUT_DIR / f"{name}.png"
    cv2.imwrite(str(path), img_bgr)
    print(f"[+] Saved {path}")
    return path


def draw_title_bar(img_bgr, title):
    """Add a semi-transparent title bar with text"""
    img = img_bgr.copy()
    h, w = img.shape[:2]
    bar_h = max(32, h // 18)
    overlay = img.copy()
    cv2.rectangle(overlay, (0, 0), (w, bar_h), (0, 0, 0), -1)
    img = cv2.addWeighted(overlay, 0.35, img, 0.65, 0)
    cv2.putText(img, title, (12, bar_h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    return img


def order_corners(pts):
    """Order 4 points (tl, tr, br, bl)"""
    pts = np.array(pts).reshape(-1, 2)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1).ravel()
    tl = pts[np.argmin(s)]
    br = pts[np.argmax(s)]
    tr = pts[np.argmin(diff)]
    bl = pts[np.argmax(diff)]
    return np.array([tl, tr, br, bl], dtype=np.float32)


# ----------------------------
# LOAD IMAGE
# ----------------------------
orig = cv2.imread(IMG_PATH)
if orig is None:
    raise FileNotFoundError(f"Could not read image at {IMG_PATH}")

# Resize (keep reasonable size)
scale = 1000.0 / orig.shape[1]
if scale < 1.5:
    vis = cv2.resize(orig, (int(orig.shape[1] * scale), int(orig.shape[0] * scale)))
else:
    vis = orig.copy()

step0 = draw_title_bar(vis, "Step 0: Input image")
save_fig(step0, "step0_input")

# ----------------------------
# STEP 1: GRAYSCALE
# ----------------------------
gray = cv2.cvtColor(vis, cv2.COLOR_BGR2GRAY)
step1 = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
step1 = draw_title_bar(step1, "Step 1: Grayscale")
save_fig(step1, "step1_grayscale")

# ----------------------------
# STEP 2: ADAPTIVE THRESHOLD
# ----------------------------
blur = cv2.GaussianBlur(gray, (5, 5), 0)
thr = cv2.adaptiveThreshold(blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                            cv2.THRESH_BINARY_INV, 31, 5)
step2 = cv2.cvtColor(thr, cv2.COLOR_GRAY2BGR)
step2 = draw_title_bar(step2, "Step 2: Adaptive threshold (binary mask)")
save_fig(step2, "step2_threshold")

# ----------------------------
# STEP 3: EDGE DETECTION
# ----------------------------
edges = cv2.Canny(blur, 60, 160)
kernel = np.ones((3, 3), np.uint8)
edges_dil = cv2.dilate(edges, kernel, iterations=1)
step3 = cv2.cvtColor(edges_dil, cv2.COLOR_GRAY2BGR)
step3 = draw_title_bar(step3, "Step 3: Edge map (Canny + dilate)")
save_fig(step3, "step3_edges")

# ----------------------------
# STEP 4: QUADRILATERAL CANDIDATES
# ----------------------------
contours, _ = cv2.findContours(edges_dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
quad_img = vis.copy()
quads = []

h, w = vis.shape[:2]
min_area = (w * h) * 0.005
for c in contours:
    peri = cv2.arcLength(c, True)
    approx = cv2.approxPolyDP(c, 0.02 * peri, True)
    if len(approx) == 4 and cv2.isContourConvex(approx):
        area = cv2.contourArea(approx)
        if area > min_area:
            quads.append(approx.reshape(4, 2))
            cv2.polylines(quad_img, [approx], True, (0, 200, 255), 3, cv2.LINE_AA)

step4 = draw_title_bar(quad_img, "Step 4: Quadrilateral candidates (potential tags)")
save_fig(step4, "step4_quads")

# ----------------------------
# STEP 5: CORNER ORDERING + HOMOGRAPHY
# ----------------------------
warp_img = vis.copy()
warp_tiles = []
tile_size = 220

for i, q in enumerate(quads[:6]):
    ordered = order_corners(q)
    dst = np.array([[0, 0],
                    [tile_size-1, 0],
                    [tile_size-1, tile_size-1],
                    [0, tile_size-1]], dtype=np.float32)
    H = cv2.getPerspectiveTransform(ordered, dst)
    tile = cv2.warpPerspective(vis, H, (tile_size, tile_size))
    colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0)]
    for j, p in enumerate(ordered.astype(int)):
        cv2.circle(warp_img, tuple(p), 6, colors[j], -1, cv2.LINE_AA)
        cv2.putText(warp_img, str(j), tuple(p + 8), cv2.FONT_HERSHEY_SIMPLEX, 0.6, colors[j], 2)
    warp_tiles.append(tile)

step5 = draw_title_bar(warp_img, "Step 5: Corner ordering (tl,tr,br,bl) + homography setup")
save_fig(step5, "step5_corners_homography")

# ----------------------------
# STEP 6: PERSPECTIVE RECTIFICATION
# ----------------------------
if warp_tiles:
    strip = np.hstack([
        cv2.copyMakeBorder(t, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=(240, 240, 240))
        for t in warp_tiles
    ])
    cv2.putText(strip, "Step 6: Perspective rectification (each tag normalized)",
                (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 50), 2, cv2.LINE_AA)
    save_fig(strip, "step6_warped_tiles")

# ----------------------------
# STEP 7: GRID SAMPLING (CONCEPTUAL)
# ----------------------------
if warp_tiles:
    grid = warp_tiles[0].copy()
    N = 8
    for i in range(1, N):
        x = i * grid.shape[1] // N
        y = i * grid.shape[0] // N
        cv2.line(grid, (x, 0), (x, grid.shape[0]-1), (0, 0, 0), 1)
        cv2.line(grid, (0, y), (grid.shape[1]-1, y), (0, 0, 0), 1)
    grid = draw_title_bar(grid, "Step 7: Grid sampling for bit decoding (conceptual)")
    save_fig(grid, "step7_grid_sampling")

# ----------------------------
# FINAL MONTAGE (ALL STEPS)
# ----------------------------
def pad_to_width(img, width):
    h, w = img.shape[:2]
    if w == width:
        return img
    pad = max(0, width - w)
    left = pad // 2
    right = pad - left
    return cv2.copyMakeBorder(img, 0, 0, left, right, cv2.BORDER_CONSTANT, value=(255, 255, 255))


montage_imgs = []
for name in ["step0_input", "step1_grayscale", "step2_threshold",
              "step3_edges", "step4_quads", "step5_corners_homography"]:
    p = OUT_DIR / f"{name}.png"
    if p.exists():
        montage_imgs.append(cv2.imread(str(p)))

if montage_imgs:
    rows = []
    for i in range(0, len(montage_imgs), 3):
        row = np.hstack(montage_imgs[i:i+3])
        rows.append(row)
    montage = np.vstack(rows)
else:
    montage = vis.copy()

final_parts = [montage]
for fname in ["step6_warped_tiles.png", "step7_grid_sampling.png"]:
    p = OUT_DIR / fname
    if p.exists():
        final_parts.append(cv2.imread(str(p)))

max_w = max(img.shape[1] for img in final_parts)
final_parts = [pad_to_width(img, max_w) for img in final_parts]
final = np.vstack(final_parts)
cv2.imwrite(str(OUT_DIR / "topotag_steps_montage_full.png"), final)

print("\n[✓] Visualization complete! Check the ./topotag_steps/ folder.")
