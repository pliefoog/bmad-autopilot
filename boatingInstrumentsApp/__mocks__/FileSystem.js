// Mock File System for web
const FileSystem = {
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',

  readFile: async (path, encoding = 'utf8') => {
    console.log('[Web Mock FS] Read file:', path);
    // Return sample NMEA data for playback testing
    if (path.includes('.nmea')) {
      return '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\n' +
             '$SDDBT,12.4,f,3.8,M,2.1,F*3A\n' +
             '$WIMWV,045,R,12.5,N,A*27\n';
    }
    return '';
  },

  writeFile: async (path, content, encoding = 'utf8') => {
    console.log('[Web Mock FS] Write file:', path);
    return Promise.resolve();
  },

  exists: async (path) => {
    console.log('[Web Mock FS] Check exists:', path);
    return Promise.resolve(true);
  },

  readDir: async (path) => {
    console.log('[Web Mock FS] Read directory:', path);
    return Promise.resolve([]);
  },

  mkdir: async (path) => {
    console.log('[Web Mock FS] Create directory:', path);
    return Promise.resolve();
  },

  unlink: async (path) => {
    console.log('[Web Mock FS] Delete file:', path);
    return Promise.resolve();
  },
};

export default FileSystem;
