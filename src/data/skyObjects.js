export const skyObjects = [
  { id: "sirius", name: "Sirius", kind: "Star", ra: 101.287, dec: -16.716, magnitude: -1.46, constellation: "Canis Major" },
  { id: "canopus", name: "Canopus", kind: "Star", ra: 95.988, dec: -52.696, magnitude: -0.74, constellation: "Carina" },
  { id: "arcturus", name: "Arcturus", kind: "Star", ra: 213.915, dec: 19.182, magnitude: -0.05, constellation: "Bootes" },
  { id: "vega", name: "Vega", kind: "Star", ra: 279.234, dec: 38.784, magnitude: 0.03, constellation: "Lyra" },
  { id: "capella", name: "Capella", kind: "Star", ra: 79.172, dec: 45.998, magnitude: 0.08, constellation: "Auriga" },
  { id: "rigel", name: "Rigel", kind: "Star", ra: 78.634, dec: -8.202, magnitude: 0.13, constellation: "Orion" },
  { id: "procyon", name: "Procyon", kind: "Star", ra: 114.825, dec: 5.225, magnitude: 0.34, constellation: "Canis Minor" },
  { id: "betelgeuse", name: "Betelgeuse", kind: "Star", ra: 88.793, dec: 7.407, magnitude: 0.42, constellation: "Orion" },
  { id: "altair", name: "Altair", kind: "Star", ra: 297.696, dec: 8.868, magnitude: 0.77, constellation: "Aquila" },
  { id: "aldebaran", name: "Aldebaran", kind: "Star", ra: 68.98, dec: 16.509, magnitude: 0.85, constellation: "Taurus" },
  { id: "spica", name: "Spica", kind: "Star", ra: 201.298, dec: -11.161, magnitude: 0.98, constellation: "Virgo" },
  { id: "antares", name: "Antares", kind: "Star", ra: 247.352, dec: -26.432, magnitude: 1.06, constellation: "Scorpius" },
  { id: "pollux", name: "Pollux", kind: "Star", ra: 116.329, dec: 28.026, magnitude: 1.14, constellation: "Gemini" },
  { id: "fomalhaut", name: "Fomalhaut", kind: "Star", ra: 344.412, dec: -29.622, magnitude: 1.16, constellation: "Piscis Austrinus" },
  { id: "deneb", name: "Deneb", kind: "Star", ra: 310.358, dec: 45.28, magnitude: 1.25, constellation: "Cygnus" },
];

export const constellationLines = [
  ["rigel", "betelgeuse"],
  ["betelgeuse", "aldebaran"],
  ["vega", "deneb"],
  ["deneb", "altair"],
  ["altair", "vega"],
  ["pollux", "procyon"],
  ["antares", "spica"],
];
