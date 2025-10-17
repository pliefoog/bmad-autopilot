const { parseNmeaSentence } = require('nmea-simple');
const sentences = [
  '$IIMWV,352.0,R,6.96,N,A*00',           // Wind - most common
  '$IIVHW,,T,170.44,M,,N,,K*4D',          // Water speed/heading  
  '$HCHDG,170.96,,,,*7B',                 // Compass heading
  '$GPGLL,4838.1993,N,00201.4012,W,,A,A*54', // GPS position
  '$GPVTG,,,,,0.039,N,0.072,K,A*35',      // Speed over ground
  '$IIVWR,10.0,L,7.08,N,,,,*5F',          // Relative wind
  '$TIROT,0.00,A*0B',                     // Rate of turn
  '$GPRMC,110050.00,A,3746.5464,N,12225.1105,W,6.8,265.9,220725,,*7C', // GPS fix
  '$IIMWD,54.5,T,54.5,M,13.0,N,6.7,M*52' // Wind direction/speed (test recording)
];

sentences.forEach(sentence => {
  try {
    const parsed = parseNmeaSentence(sentence);
    const fields = Object.keys(parsed).filter(k => !['sentenceId', 'talkerId', 'chxOk', 'sentenceName'].includes(k));
    console.log('✓', sentence.substring(0, 35), '→', parsed.sentenceId, 'Fields:', fields.slice(0,4).join(','));
  } catch (e) {
    console.log('✗', sentence.substring(0, 35), '→', e.message);
  }
});
