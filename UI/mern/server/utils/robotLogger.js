import RobotHistory from "../models/RobotHistory.js";

// Helper to log robot state transitions
export async function logRobotAction(robot, action, table = null, order = null) {
    if (!robot) return;

    // Close any active (unfinished) session
    await RobotHistory.updateOne(
        { robot: robot._id, endedAt: null },
        { endedAt: new Date() }
    );

    // Start a new session
    await RobotHistory.create({
        robot: robot._id,
        action,
        table,
        order,
        startedAt: new Date(),
    });
}
