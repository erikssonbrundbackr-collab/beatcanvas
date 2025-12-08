// checkMidi.js
const { Midi } = require("@tonejs/midi");
const fs = require("fs");

// <-- Ändra namnet här om din fil heter annorlunda eller ligger i annan mapp
const buf = fs.readFileSync("./public/Back_In_Black__AC_DC_Drums.mid");

const midi = new Midi(buf);

console.log("Antal spår i MIDI:", midi.tracks.length);
midi.tracks.forEach((tr, i) => {
  const notes = tr.notes.map(n => n.midi);
  const unique = [...new Set(notes)].sort((a, b) => a - b);
  console.log(`\nSpår ${i} (${tr.name || "utan namn"}):`);
  console.log(`  Antal noter: ${notes.length}`);
  console.log(`  Unika MIDI-notnummer: ${unique}`);
});
