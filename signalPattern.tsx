// signalPattern.ts
// Manuellt mönster för låten "Signal" – längre & tightare

export const SIGNAL_PATTERN = [
  { time: 0.50, lane: "crash" }, // CRASH i början

  // --- Startmönster ---
  { time: 0.75, lane: "hihat" },

  { time: 1.00, lane: "snare" },
  { time: 1.02, lane: "hihat" },

  { time: 1.25, lane: "hihat" },
  { time: 1.50, lane: "hihat" },

  { time: 1.75, lane: "snare" },
  { time: 1.77, lane: "hihat" },

  { time: 2.00, lane: "hihat" },

  { time: 2.25, lane: "snare" },
  { time: 2.27, lane: "hihat" },

  { time: 2.50, lane: "hihat" },
  { time: 2.75, lane: "hihat" },

  { time: 3.00, lane: "snare" },
  { time: 3.02, lane: "hihat" },

  { time: 3.25, lane: "hihat" },

  { time: 3.50, lane: "snare" },
  { time: 3.52, lane: "hihat" },

  { time: 3.75, lane: "hihat" },
  { time: 4.00, lane: "hihat" },

  { time: 4.25, lane: "snare" },
  { time: 4.27, lane: "hihat" },

  { time: 4.50, lane: "hihat" },

  { time: 4.75, lane: "snare" },
  { time: 4.77, lane: "hihat" },

  { time: 5.00, lane: "hihat" },

  // --- Förlängning: fortsätter mönstret ---
  { time: 5.25, lane: "hihat" },

  { time: 5.50, lane: "snare" },
  { time: 5.52, lane: "hihat" },

  { time: 5.75, lane: "hihat" },
  { time: 6.00, lane: "hihat" },

  { time: 6.25, lane: "snare" },
  { time: 6.27, lane: "hihat" },

  { time: 6.50, lane: "hihat" },
  { time: 6.75, lane: "hihat" },

  { time: 7.00, lane: "snare" },
  { time: 7.02, lane: "hihat" },

  { time: 7.25, lane: "hihat" },

  { time: 7.50, lane: "snare" },
  { time: 7.52, lane: "hihat" },

  { time: 7.75, lane: "hihat" },
  { time: 8.00, lane: "hihat" },

  // --- Ny längre del (8 sek → 12 sek) ---
  { time: 8.25, lane: "snare" },
  { time: 8.27, lane: "hihat" },

  { time: 8.50, lane: "hihat" },
  { time: 8.75, lane: "hihat" },

  { time: 9.00, lane: "snare" },
  { time: 9.02, lane: "hihat" },

  { time: 9.25, lane: "hihat" },

  { time: 9.50, lane: "snare" },
  { time: 9.52, lane: "hihat" },

  { time: 9.75, lane: "hihat" },
  { time: 10.00, lane: "hihat" },

  { time: 10.25, lane: "snare" },
  { time: 10.27, lane: "hihat" },

  { time: 10.50, lane: "hihat" },
  { time: 10.75, lane: "hihat" },

  { time: 11.00, lane: "snare" },
  { time: 11.02, lane: "hihat" },

  { time: 11.25, lane: "hihat" },

  { time: 11.50, lane: "snare" },
  { time: 11.52, lane: "hihat" },

  { time: 11.75, lane: "hihat" },
  { time: 12.00, lane: "hihat" },
] as const;
