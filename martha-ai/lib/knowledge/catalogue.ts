// Single source of truth for the (fictional) Martha Motors lineup.
// Used by: landing-page model cards, the system prompt knowledge table, and lead scoring.
// All figures are illustrative.

export type Trim = {
  name: string;
  priceLakh: number; // ex-showroom, ₹ lakh
  batteryKwh: number;
  rangeKm: number; // claimed
  zeroTo100s: number;
  topSpeedKmh: number;
  dcFast10to80Min: number;
  acFullHrs: number; // on the included 7.4 kW wallbox
  drive: "FWD" | "RWD" | "AWD";
};

export type Model = {
  id: "spark" | "terra" | "aero" | "atlas" | "voltgt";
  name: string;
  segment: string;
  bodyType: "hatchback" | "SUV" | "sedan" | "coupe";
  seats: number;
  bootL: number;
  groundClearanceMm: number;
  highlights: string[];
  colours: string[];
  trims: Trim[];
};

export const catalogue: Model[] = [
  {
    id: "spark",
    name: "Martha Spark",
    segment: "Compact city hatchback",
    bodyType: "hatchback",
    seats: 5,
    bootL: 320,
    groundClearanceMm: 175,
    highlights: ["easy city parking", "lowest running cost"],
    colours: ["white", "silver", "teal", "red"],
    trims: [
      { name: "Standard", priceLakh: 11.5, batteryKwh: 30, rangeKm: 250, zeroTo100s: 9.8, topSpeedKmh: 140, dcFast10to80Min: 35, acFullHrs: 4.5, drive: "FWD" },
      { name: "Plus", priceLakh: 13.5, batteryKwh: 30, rangeKm: 250, zeroTo100s: 9.8, topSpeedKmh: 140, dcFast10to80Min: 35, acFullHrs: 4.5, drive: "FWD" },
      { name: "Long Range", priceLakh: 16.0, batteryKwh: 45, rangeKm: 380, zeroTo100s: 8.9, topSpeedKmh: 150, dcFast10to80Min: 38, acFullHrs: 6.5, drive: "FWD" },
    ],
  },
  {
    id: "terra",
    name: "Martha Terra",
    segment: "Mid-size SUV",
    bodyType: "SUV",
    seats: 5,
    bootL: 520,
    groundClearanceMm: 200,
    highlights: ["panoramic roof", "vehicle-to-load (V2L) power outlet"],
    colours: ["white", "grey", "blue", "red"],
    trims: [
      { name: "Standard", priceLakh: 22.0, batteryKwh: 55, rangeKm: 380, zeroTo100s: 8.2, topSpeedKmh: 160, dcFast10to80Min: 30, acFullHrs: 8, drive: "RWD" },
      { name: "Long Range", priceLakh: 29.5, batteryKwh: 72, rangeKm: 500, zeroTo100s: 6.9, topSpeedKmh: 180, dcFast10to80Min: 28, acFullHrs: 10.5, drive: "RWD" },
      { name: "AWD", priceLakh: 34.0, batteryKwh: 72, rangeKm: 460, zeroTo100s: 5.2, topSpeedKmh: 190, dcFast10to80Min: 28, acFullHrs: 10.5, drive: "AWD" },
    ],
  },
  {
    id: "aero",
    name: "Martha Aero",
    segment: "Premium sedan",
    bodyType: "sedan",
    seats: 5,
    bootL: 480,
    groundClearanceMm: 160,
    highlights: ["most efficient Martha", "hands-free highway assist"],
    colours: ["black", "white", "midnight blue", "silver"],
    trims: [
      { name: "Standard", priceLakh: 32.0, batteryKwh: 64, rangeKm: 450, zeroTo100s: 6.5, topSpeedKmh: 200, dcFast10to80Min: 27, acFullHrs: 9.5, drive: "RWD" },
      { name: "Long Range", priceLakh: 38.5, batteryKwh: 82, rangeKm: 560, zeroTo100s: 5.8, topSpeedKmh: 210, dcFast10to80Min: 27, acFullHrs: 12, drive: "RWD" },
      { name: "Performance", priceLakh: 45.0, batteryKwh: 82, rangeKm: 510, zeroTo100s: 3.9, topSpeedKmh: 240, dcFast10to80Min: 27, acFullHrs: 12, drive: "AWD" },
    ],
  },
  {
    id: "atlas",
    name: "Martha Atlas",
    segment: "7-seater SUV",
    bodyType: "SUV",
    seats: 7,
    bootL: 300,
    groundClearanceMm: 210,
    highlights: ["three rows with captain-seat option", "boot grows to 750 L with third row folded"],
    colours: ["white", "graphite", "forest green", "silver"],
    trims: [
      { name: "Long Range", priceLakh: 42.0, batteryKwh: 90, rangeKm: 520, zeroTo100s: 7.0, topSpeedKmh: 180, dcFast10to80Min: 32, acFullHrs: 13, drive: "RWD" },
      { name: "AWD Performance", priceLakh: 55.0, batteryKwh: 90, rangeKm: 450, zeroTo100s: 4.6, topSpeedKmh: 200, dcFast10to80Min: 32, acFullHrs: 13, drive: "AWD" },
    ],
  },
  {
    id: "voltgt",
    name: "Martha Volt GT",
    segment: "Performance coupe",
    bodyType: "coupe",
    seats: 4,
    bootL: 350,
    groundClearanceMm: 140,
    highlights: ["track mode", "carbon-ceramic brakes on GT Track"],
    colours: ["volt mint", "black", "white", "red"],
    trims: [
      { name: "GT", priceLakh: 78.0, batteryKwh: 95, rangeKm: 480, zeroTo100s: 3.2, topSpeedKmh: 250, dcFast10to80Min: 22, acFullHrs: 14, drive: "AWD" },
      { name: "GT Track", priceLakh: 95.0, batteryKwh: 95, rangeKm: 420, zeroTo100s: 2.6, topSpeedKmh: 270, dcFast10to80Min: 22, acFullHrs: 14, drive: "AWD" },
    ],
  },
];

export function priceRange(model: Model): { min: number; max: number } {
  const prices = model.trims.map((t) => t.priceLakh);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function maxRange(model: Model): number {
  return Math.max(...model.trims.map((t) => t.rangeKm));
}

/** Compact pipe table + one line per model. Keeps the prompt knowledge block small. */
export function catalogueToCompactTable(models: Model[] = catalogue): string {
  const header = "Model|Seg|Seats|Trim|₹L|kWh|Range km|0-100s|Top kmh|DC10-80 min|AC full h|Drive";
  const rows = models.flatMap((m) =>
    m.trims.map((t) =>
      [m.name.replace("Martha ", ""), m.bodyType, m.seats, t.name, t.priceLakh, t.batteryKwh, t.rangeKm, t.zeroTo100s, t.topSpeedKmh, t.dcFast10to80Min, t.acFullHrs, t.drive].join("|"),
    ),
  );
  const lines = models.map(
    (m) =>
      `${m.name.replace("Martha ", "")}: ${m.segment}, boot ${m.bootL}L, GC ${m.groundClearanceMm}mm, colours ${m.colours.join("/")}, ${m.highlights.join(", ")}`,
  );
  return [header, ...rows, "", ...lines].join("\n");
}
