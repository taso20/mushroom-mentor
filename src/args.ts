export type MushroomAction = "on" | "off" | "status" | "invalid";

// Bare /mushroom turns Mushroom on and keeps it on, like Ponytail.
export function parseMushroomArgs(text: string): MushroomAction {
  switch (text.trim().toLowerCase()) {
    case "":
    case "on":
      return "on";
    case "off":
      return "off";
    case "status":
      return "status";
    default:
      return "invalid";
  }
}
