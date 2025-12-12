const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function checkStorage() {
  try {
    const data = await AsyncStorage.getItem('widget-store');
    console.log('Current AsyncStorage data:', data);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('Parsed state:', JSON.stringify(parsed, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStorage();
