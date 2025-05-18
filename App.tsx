import React from 'react';
import { NavigationContainer } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';

// Pages
import Index from './src/screens/Index';
import NotFound from './src/screens/NotFound';
import SignUpScreen from './src/screens/SignUpScreen';
import SignInScreen from './src/screens/SignInScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import ProcessingScreen from './src/screens/ProcessingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ModelTestScreen from './src/screens/ModelTestScreen';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <NavigationContainer>
      <AuthProvider>
        <Stack.Navigator initialRouteName="Index">
          <Stack.Screen name="Index" component={Index} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Recording" component={RecordingScreen} />
          <Stack.Screen name="Processing" component={ProcessingScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="ModelTest" component={ModelTestScreen} />
          <Stack.Screen name="NotFound" component={NotFound} />
        </Stack.Navigator>
      </AuthProvider>
      <Toast />
    </NavigationContainer>
  </QueryClientProvider>
);

export default App;