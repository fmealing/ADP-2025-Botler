import cv2
import numpy as np
import json
import heapq # For A* priority queue
import matplotlib.pyplot as plt # For visualization
from pupil_apriltags import Detector
# from motor_controller import MotorController # Hardware dependency is ignored for simulation

# --- 1. LOCALIZATION CLASS (MOCK SENSOR) ---
class CameraLocalization:
    """Simulates camera localization by returning a pre-defined path sequence."""
    
    def __init__(self, map_file, camera_params, tag_size=0.05):
        # In simulation, we skip hardware init and load map data for validation
        with open(map_file, "r") as f:
            tag_map = json.load(f)["tags"]
        self.world_positions = {t["id"]: np.array(t["position"]) for t in tag_map}
        self.camera_params = camera_params
        self.tag_size = tag_size
        
        # Define a simulated trajectory (start at (1, 1), move toward (5, 2))
        self.simulated_path = iter([
            (1.0, 1.0, np.pi/4), (1.5, 1.3, np.pi/4), (2.0, 1.6, np.pi/4),
            (2.5, 2.0, np.pi/4), (3.0, 2.4, np.pi/4), (3.5, 2.8, np.pi/4)
        ])
        
        # Detector and VideoCapture are only initialized to satisfy code structure, 
        # but their methods are overridden for mock data.
        self.detector = Detector(families="tag36h11", nthreads=1)
        # Using a dummy value for cap as we won't read it
        self.cap = type('MockCap', (object,), {'read': lambda: (False, None)})() 
        print("CameraLocalization initialized in MOCK mode.")
        
    def get_robot_pose(self):
        """
        Calculates and returns the robot's current (x, y, theta) in the world frame.
        In simulation, this returns the next point from the predefined path.
        """
        try:
            x, y, theta = next(self.simulated_path)
            return x, y, theta
        except StopIteration:
            # End of simulated path, stop simulation
            return None, None, None

# --- 2. MAPPING CLASS (MOCK LiDAR) ---
class LidarMapper:
    """Simulates LiDAR output by providing a static occupancy grid."""
    def __init__(self, map_dimensions=(100, 100), cell_size=0.1):
        self.map_dims = map_dimensions
        self.cell_size = cell_size
        self.occupancy_grid = np.zeros(map_dimensions, dtype=np.uint8)
        
        # Define simulated obstacles (1 = Occupied)
        # 1. Table 1 near the start
        self.occupancy_grid[15:25, 40:55] = 1 
        # 2. Table 2 in the middle
        self.occupancy_grid[50:60, 60:75] = 1
        # 3. Table 3 near the target area
        self.occupancy_grid[75:85, 30:45] = 1
        # 4. Table 4 between table 1 and 3
        self.occupancy_grid[40:50, 45:55] = 1

    def update_map(self, lidar_data, current_pose):
        """Returns the static, simulated occupancy grid."""
        return self.occupancy_grid
    
    def add_dynamic_obstacle(self, x_start_m, y_start_m, size_m):

        x_start_c = int(x_start_m / self.cell_size)
        y_start_c = int(y_start_m / self.cell_size)
        size_c = int(size_m / self.cell_size)

        self.occupancy_grid[x_start_c:x_start_c + size_c, y_start_c:y_start_c + size_c] = 1

# --- 3. PATH PLANNING CLASS (A* ALGORITHM IMPLEMENTATION) ---
class AStarPlanner:
    def __init__(self, cell_size=0.1):
        self.cell_size = cell_size

    def _to_grid_cell(self, pose):
        """Converts world coordinates (m) to grid cell indices (int)."""
        x, y = pose[0], pose[1]
        return (int(x / self.cell_size), int(y / self.cell_size))

    def _to_world_coord(self, cell):
        """Converts grid cell indices (int) to world coordinates (m)."""
        r, c = cell
        return (r * self.cell_size, c * self.cell_size)

    def _heuristic(self, a, b):
        """Heuristic: Euclidean distance between two cells."""
        return np.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)

    def plan_path(self, start_pose, goal_pose, occupancy_grid):
        """Implements the full A* search algorithm."""
        start_cell = self._to_grid_cell(start_pose)
        goal_cell = self._to_grid_cell(goal_pose)
        rows, cols = occupancy_grid.shape

        if occupancy_grid[start_cell] == 1:
            print(f"ERROR: Start cell {start_cell} is in an obstacle!")
            return []
        
        if occupancy_grid[goal_cell] == 1:
            print(f"ERROR: Goal cell {goal_cell} is in an obstacle!")
            return []

        # A* setup
        open_list = [(0, start_cell)] # (f_cost, cell)
        came_from = {}
        g_score = {start_cell: 0}

        while open_list:
            f_cost, current_cell = heapq.heappop(open_list)
            
            if current_cell == goal_cell:
                # Reconstruct path and convert to world waypoints
                path = []
                while current_cell in came_from:
                    path.append(self._to_world_coord(current_cell))
                    current_cell = came_from[current_cell]
                path.reverse()
                return path

            # Explore neighbors (8 directions)
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]:
                neighbor_cell = (current_cell[0] + dr, current_cell[1] + dc)
                
                # Check boundaries and obstacles
                if 0 <= neighbor_cell[0] < rows and 0 <= neighbor_cell[1] < cols and \
                   occupancy_grid[neighbor_cell] == 0:
                    
                    # Calculate tentative g_score (distance cost)
                    cost = self._heuristic(current_cell, neighbor_cell)
                    tentative_g_score = g_score[current_cell] + cost

                    if tentative_g_score < g_score.get(neighbor_cell, float('inf')):
                        came_from[neighbor_cell] = current_cell
                        g_score[neighbor_cell] = tentative_g_score
                        f_cost = tentative_g_score + self._heuristic(neighbor_cell, goal_cell)
                        heapq.heappush(open_list, (f_cost, neighbor_cell))

        return [] # Path not found


# --- 4. CONTROL LOOP (Main Execution) ---

def visualize_simulation(mapper, planned_path, robot_trace, goal):
    """Visualizes the map, path, and robot movement using Matplotlib."""
    plt.figure(figsize=(10, 10))
    
    # Draw Map and Obstacles (Invert the Y-axis for standard plotting)
    map_viz = np.flipud(mapper.occupancy_grid.T)
    plt.imshow(map_viz, cmap='gray', origin='lower', extent=[0, mapper.map_dims[0] * mapper.cell_size, 0, mapper.map_dims[1] * mapper.cell_size])
    
    # Draw Planned Path
    if planned_path:
        path_x = [p[0] for p in planned_path]
        path_y = [p[1] for p in planned_path]
        plt.plot(path_x, path_y, 'r--', label='A* Planned Path', linewidth=2)
    
    # Draw Robot Trace
    trace_x = [p[0] for p in robot_trace]
    trace_y = [p[1] for p in robot_trace]
    plt.plot(trace_x, trace_y, 'b-', label='Simulated Robot Trace', linewidth=1)
    
    # Draw Start and Goal
    plt.plot(robot_trace[0][0], robot_trace[0][1], 'go', markersize=10, label='Start Position')
    plt.plot(goal[0], goal[1], 'rx', markersize=10, label='Goal Position')

    plt.title("A* Path Planning Simulation: Dynamic Obstacle Avoidance")
    plt.xlabel("X Position (m)")
    plt.ylabel("Y Position (m)")
    plt.legend()
    plt.grid(True)
    plt.show()

def run_navigation():
    # Placeholder Intrinsics (Not used in this mock for simplicity)
    camera_params = [600, 600, 320, 240] 
    
    # Target: The known global coordinates of the table (e.g., 5.0m X, 8.0m Y)
    TARGET_X, TARGET_Y = 6.0, 8.0
    
    # Initialize Modules (MOCK MODE)
    # Note: A real map_definition.json file is still needed for the localizer init
    localizer = CameraLocalization("map_definition.json", camera_params)
    mapper = LidarMapper()
    planner = AStarPlanner()

    robot_trace = []
    
    print(f"Starting simulation. Target: ({TARGET_X}, {TARGET_Y})")
    
    # The initial pose is the first one returned by the mock localizer
    initial_x, initial_y, initial_theta = localizer.get_robot_pose()
    if initial_x is None:
        print("Simulation failed to start.")
        return

    # 1. INITIAL MAP AND PATH PLAN
    current_pose = (initial_x, initial_y, initial_theta)
    occupancy_grid = mapper.update_map({}, current_pose)
    
    planned_path = planner.plan_path(current_pose, (TARGET_X, TARGET_Y), occupancy_grid)
    
    if not planned_path:
        print("Pathfinding failed: Goal is blocked or unreachable.")
        return

    # The simulation loop for following the path
    current_idx = 0
    step_count = 0
    robot_trace.append((initial_x, initial_y))
    
    # Simplified path follower loop (move from start to end of planned path)
    while current_idx < len(planned_path):
        waypoint_x, waypoint_y = planned_path[current_idx]

        step_count +=1
        if step_count == 80:
            obstacle_x, obstacle_y = 5.0, 7.5
            obstacle_size = 1.0

            mapper.add_dynamic_obstacle(obstacle_x, obstacle_y, obstacle_size)
            print("-" * 30)
            print(f"!!! DYNAMIC OBSTACLE APPEARED at ({obstacle_x}, {obstacle_y})")

            # Re-plan from current position
            print(f"RE-PLANNING PATH from ({current_pose[0]:.2f}, {current_pose[1]:.2f}) to Goal")

            new_occupancy_grid = mapper.update_map({}, current_pose)

            # Recalculate path
            planned_path = planner.plan_path(current_pose, (TARGET_X, TARGET_Y), new_occupancy_grid)
            current_idx = 0  # Start following the new path from the beginning
            
            if not planned_path:
                print("RE-PLANNING FAILED: New obstacle blocked the route completely.")
                break
            print("New path successfully calculated.")
            print("-" * 30)

        
        # Simulate movement towards the waypoint (simplified step)
        dx = waypoint_x - current_pose[0]
        dy = waypoint_y - current_pose[1]
        distance = np.sqrt(dx**2 + dy**2)
        
        if distance < planner.cell_size:
            current_idx += 1 # Reached waypoint, move to the next one
            if current_idx >= len(planned_path):
                print(f"SIMULATION COMPLETE: Reached target at ({current_pose[0]:.2f}, {current_pose[1]:.2f})")
                break
            continue
        
        # Simulate a small, intentional step towards the next waypoint
        step_size = planner.cell_size * 0.5 
        step_x = current_pose[0] + dx / distance * step_size
        step_y = current_pose[1] + dy / distance * step_size
        
        # Update current pose (mocking what the INS/wheel encoders would do)
        current_pose = (step_x, step_y, current_pose[2])
        robot_trace.append((current_pose[0], current_pose[1]))
        
        # In a real system, you would call localizer.get_robot_pose() here 
        # for an update, but for this pure test, we rely on the simulation physics.

    # 5. VISUALIZATION
    visualize_simulation(mapper, planned_path, robot_trace, (TARGET_X, TARGET_Y))

if __name__ == "__main__":
    run_navigation()