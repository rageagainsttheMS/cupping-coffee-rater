export type LocationStatus = "while-using" | "denied" | "not-asked";

/** Reduces the platform's permission answer to what the Profile row shows. */
export function locationStatus(permission: {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}): LocationStatus {
  if (permission.granted) return "while-using";
  return permission.status === "undetermined" && permission.canAskAgain ? "not-asked" : "denied";
}
