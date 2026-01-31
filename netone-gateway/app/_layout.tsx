import { Stack } from "expo-router";
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { useState } from 'react';
import SplashScreen from '../components/SplashScreen'; // Import

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <Provider store={store}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </Provider>
  );
}
