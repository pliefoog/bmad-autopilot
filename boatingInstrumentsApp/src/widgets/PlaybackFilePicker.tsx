import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export const PlaybackFilePicker: React.FC<{ onPick: (filename: string) => void }> = ({ onPick }) => {
  // Stub: hardcoded file list for MVP
  const files = ['demo.nmea', 'test1.nmea', 'test2.nmea'];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Playback File Picker</Text>
      {files.map((file) => (
        <Button key={file} title={file} onPress={() => onPick(file)} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f7f7fa',
    borderRadius: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
  },
});
