// A robotválasztás csak a megjelenést módosítja; a nyelvi motor nem használja.
export const ROBOT_IDS = ["balazs", "levi", "bence"] as const;
export type RobotId = (typeof ROBOT_IDS)[number];
export const DEFAULT_ROBOT: RobotId = "balazs";
