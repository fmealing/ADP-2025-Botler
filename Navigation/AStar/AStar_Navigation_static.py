# A* Path Planning & Live Lidar Mapping
# This script integrates a live Lidar sensor with the A* path planning algorithm
# and visualizes the results using Matplotlib.


import numpy as np
import matplotlib.pyplot as plt
import heapq
import math
import time

# --- Lidar and GPIO Configuration (Adjust as needed) ---
LIDAR_PORT = '/dev/ttyAMA0'  # Default RPi UART serial port for the HAT
LIDAR_BAUDRATE = 230400       # Common baudrate for LD06/LD19 Lidar
PWM_GPIO_PIN = 18            # GPIO 18 (Physical Pin 12) for PWM motor control
LIDAR_HZ = 10                # Target motor speed in Hz

# --- Conditional Hardware Imports ---
# This block prevents crashes if the Lidar libraries are not installed.
try:
    import lgpio
    from rplidar import RPLidar
    LIVE_LIDAR_MODE = True
    print("Hardware libraries imported successfully. Running in LIVE mode.")
except ImportError:
    LIVE_LIDAR_MODE = False
    print("Warning: Hardware libraries not found. Running in SIMULATED mode.")


# --- 1. Node Class for A* ---
class Node:
    """A node class for A* Pathfinding."""
    def __init__(self, parent=None, position=None):
        self.parent = parent
        self.position = position
        self.g = 0  # Cost from start
        self.h = 0  # Heuristic (estimated cost to end)
        self.f = 0  # Total cost (g + h)

    def __eq__(self, other):
        # Nodes are equal if their grid positions are the same
        return self.position == other.position

    def __lt__(self, other):
        # Defines the comparison for the priority queue (heapq)
        return self.f < other.f

# --- 2. Lidar Data Acquisition and Mapping ---

def get_lidar_data_points(grid_size=40, resolution_cm=10):
    """
    Connects to the Lidar, acquires one full scan, and converts it into an
    Occupancy Grid Map based on a fixed resolution.
    
    Returns: numpy array (occupancy grid)
    """
    if not LIVE_LIDAR_MODE:
        return create_simulated_map(grid_size, resolution_cm)

    print(f"--- Attempting live scan on {LIDAR_PORT} ---")

    lidar = None
    h = None
    
    try:
        # --- A. Lidar Motor Control (Hardware PWM via lgpio) ---
    
        h = lgpio.gpiochip_open(0)
        
        # Start PWM control on GPIO 18 (Pin 12)
        PWM_FREQ = 500  # Hz
        PWM_DUTY_CYCLE = 128  # Duty cycle 0-255 (50% duty)
        
        lgpio.pwm_start(h, PWM_GPIO_PIN, PWM_FREQ, PWM_DUTY_CYCLE, 0)
        print(f"Motor PWM started on GPIO {PWM_GPIO_PIN} at {PWM_FREQ}Hz.")

        # --- B. Lidar Data Acquisition (RPLidar) ---
        lidar = RPLidar(LIDAR_PORT, LIDAR_BAUDRATE)
        print("Lidar connected. Waiting for a full scan...")

        # Acquire a single full scan
        # scan yields a list of tuples: (quality, angle_degrees, distance_mm)
        for scan_data in lidar.iter_scans():
            raw_scan_data = scan_data
            break # Get only the first full 360 scan

        # Filter and prepare data
        raw_scan_data = [(angle, dist) for quality, angle, dist in raw_scan_data if dist > 0]
        print(f"Acquired {len(raw_scan_data)} measurements.")

    except Exception as e:
        print(f"\nFATAL LIDAR/GPIO ERROR: {e}")
        print("Switching to simulated static map.")
        return create_simulated_map(grid_size, resolution_cm)
    
    finally:
        # Safely stop Lidar and PWM motor (CRUCIAL)
        if lidar:
            lidar.stop()
            lidar.disconnect()
            # If the RPLidar object was successfully created, it handles motor power down
        if h:
            # Explicitly stop PWM and close chip access
            lgpio.pwm_stop(h, PWM_GPIO_PIN)
            lgpio.gpiochip_close(h)
            print("Hardware resources released safely.")

    # --- C. Convert Scan to Occupancy Grid ---
    occupancy_grid = np.zeros((grid_size, grid_size), dtype=int)
    map_center = grid_size // 2
    
    for angle_deg, dist_mm in raw_scan_data:
        # Ignore data beyond a reasonable indoor range (e.g., 5 meters)
        if dist_mm > 5000:
            continue
        
        # Convert to grid units
        dist_units = dist_mm / (resolution_cm * 10) 
        angle_rad = math.radians(angle_deg)
        
        # Convert to Cartesian coordinates (x, y) relative to Lidar (center)
        x_raw = dist_units * math.cos(angle_rad)
        y_raw = dist_units * math.sin(angle_rad)

        # Map to grid coordinates (row, col)
        # Note: Row (r) maps to y, Col (c) maps to x. Invert Y for standard display.
        col = int(map_center + x_raw)
        row = int(map_center - y_raw)
        
        # Mark as obstacle if within bounds
        if 0 <= row < grid_size and 0 <= col < grid_size:
            occupancy_grid[row, col] = 1

    print("Map generated from Lidar data.")
    return occupancy_grid

def create_simulated_map(grid_size=40, resolution_cm=10):
    """
    Creates a static, simulated map for debugging when Lidar fails or is disconnected.
    0 = Free space, 1 = Obstacle.
    """
    simulated_map = np.zeros((grid_size, grid_size), dtype=int)
    print("Using SIMULATED MAP.")

    # 1. Outer boundaries 
    simulated_map[0, :] = 1
    simulated_map[-1, :] = 1
    simulated_map[:, 0] = 1
    simulated_map[:, -1] = 1

    # 2. Add complex obstacles 
    simulated_map[15, 10:30] = 1 # Horizontal wall
    simulated_map[5:10, 25] = 1  # Vertical block
    
    # Diagonal obstacle
    for i in range(10):
        simulated_map[25 + i, 10 + i] = 1
        
    return simulated_map

# --- 3. The A* Algorithm---

def a_star_search(maze, start, end):
    """
    Returns a list of tuples as a path from the given start to the given end in the given maze.
    """
    start_node = Node(None, start)
    start_node.g = start_node.h = start_node.f = 0
    end_node = Node(None, end)
    end_node.g = end_node.h = end_node.f = 0

    open_list = []
    # heapq stores (priority_value, item). We use f-score as priority.
    heapq.heappush(open_list, (start_node.f, start_node))
    
    closed_list = set()
    open_list_lookup = {start_node.position: start_node}

    # Cardinal moves only (no diagonal)
    neighbors = [(0, -1), (0, 1), (-1, 0), (1, 0), ]
    
    while len(open_list) > 0:
        
        # Get the current node (the one with the lowest f_score)
        # Pop returns (f_score, node)
        current_f, current_node = heapq.heappop(open_list)
        
        # Move current node to closed list
        closed_list.add(current_node.position)

        # Check if we found the goal
        if current_node.position == end_node.position:
            path = []
            current = current_node
            while current is not None:
                path.append(current.position)
                current = current.parent
            return path[::-1] # Return reversed path

        # Generate neighbors
        for dr, dc in neighbors:
            
            # Get node position
            node_position = (current_node.position[0] + dr, current_node.position[1] + dc)

            # Check if within bounds
            if not (0 <= node_position[0] < len(maze) and 0 <= node_position[1] < len(maze[0])):
                continue

            # Make sure walkable terrain (0 = free space)
            if maze[node_position[0]][node_position[1]] != 0:
                continue

            # Skip if neighbor is already in the closed set
            if node_position in closed_list:
                continue
            
            # Create new node
            new_node = Node(current_node, node_position)

            # Calculate f, g, and h values
            new_node.g = current_node.g + 1 
            
            # Heuristic: Manhattan distance
            new_node.h = abs(new_node.position[0] - end_node.position[0]) + abs(new_node.position[1] - end_node.position[1])
            new_node.f = new_node.g + new_node.h

            # Check if this node is already in the open list
            if node_position in open_list_lookup:
                existing_node = open_list_lookup[node_position]
                if new_node.g < existing_node.g:
                    # Found a shorter path, update the existing node
                    existing_node.g = new_node.g
                    existing_node.f = new_node.f
                    existing_node.parent = current_node
                    # The update is sufficient; Python's heapq handles the priority correctly
                continue

            # Add the child to the open list and lookup dictionary
            heapq.heappush(open_list, (new_node.f, new_node))
            open_list_lookup[node_position] = new_node

    return None # No path found

# --- 4. Visualization

def plot_path(maze, start, end, path):
    """
    Visualizes the maze, start, end, and the final path using Matplotlib.
    """
    plot_map = np.copy(maze)
    
    # Mark Start (2) and End (3)
    plot_map[start[0], start[1]] = 2
    plot_map[end[0], end[1]] = 3
    
    # Mark Path (4)
    if path:
        for (r, c) in path:
            if (r, c) != start and (r, c) != end:
                plot_map[r, c] = 4

    # Define Colors for the plot (White, Black, Yellow, Red, Blue)
    colors = ['white', 'black', 'yellow', 'red', 'blue']
    cmap = plt.cm.colors.ListedColormap(colors)
    
    # Setup plot
    fig, ax = plt.subplots(figsize=(10, 10))
    ax.imshow(plot_map, cmap=cmap, origin='upper', interpolation='none')

    # Add grid lines
    ax.set_xticks(np.arange(-0.5, plot_map.shape[1], 1), minor=True)
    ax.set_yticks(np.arange(-0.5, plot_map.shape[0], 1), minor=True)
    ax.grid(which='minor', color='gray', linestyle='-', linewidth=0.5)

    # Title and Labels
    ax.set_title("Lidar Mapping and A* Path Planning Visualization")
    ax.text(start[1], start[0], 'S', ha='center', va='center', color='black', fontsize=12, fontweight='bold')
    ax.text(end[1], end[0], 'E', ha='center', va='center', color='black', fontsize=12, fontweight='bold')
    
    plt.show()

# --- 5. Main Execution

if __name__ == '__main__':
    
    GRID_SIZE = 40
    RESOLUTION_CM = 10 

    # 1. Get Live Lidar Data (or fallback to simulation if libraries are missing/connection fails)
    maze = get_lidar_data_points(GRID_SIZE, RESOLUTION_CM)
    
    # 2. Define Start and End Points on the Grid
    start = (GRID_SIZE - 5, 5) # Bottom-Left
    end = (5, GRID_SIZE - 5)   # Top-Right

    # IMPORTANT: Ensure Start/End points are not obstacles
    if maze[start[0], start[1]] == 1:
        print(f"Warning: Start point {start} is an obstacle. Moving start point.")
        start = (start[0] - 1, start[1])
        if maze[start[0], start[1]] == 1:
             print("Critical Error: Cannot find a free starting cell.")
             exit()
    
    if maze[end[0], end[1]] == 1:
        print(f"Warning: End point {end} is an obstacle. Moving end point.")
        end = (end[0] + 1, end[1])
        if maze[end[0], end[1]] == 1:
             print("Critical Error: Cannot find a free ending cell.")
             exit()

    # 3. Run A* Search
    print(f"\n--- Running A* from {start} to {end} ---")
    start_time = time.time()
    path = a_star_search(maze, start, end)
    end_time = time.time()
    
    # 4. Report Results
    if path:
        print(f"Path Found! Total Steps: {len(path)}.")
        print(f"A* Search Time: {end_time - start_time:.4f} seconds.")
    else:
        print("No path found to the goal through the generated map.")

    # 5. Visualize
    plot_path(maze, start, end, path)