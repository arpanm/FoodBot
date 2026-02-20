import React, {useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {RootStackParamList} from '../types';
import {useAppDispatch, useAppSelector} from '../store';
import {restoreSession} from '../store/slices/authSlice';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OAuthCallbackScreen from '../screens/OAuthCallbackScreen';
import ChatScreen from '../screens/ChatScreen';
import RestaurantSearchScreen from '../screens/RestaurantSearchScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

/**
 * Main Tab Navigator (for authenticated users)
 */
const MainTabs: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#999',
      }}>
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          // tabBarIcon: ({ color, size }) => <ChatIcon color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={RestaurantSearchScreen}
        options={{
          tabBarLabel: 'Search',
          // tabBarIcon: ({ color, size }) => <SearchIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

/**
 * Root App Navigator
 */
export const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const {isAuthenticated, loading} = useAppSelector((state) => state.auth);

  // Restore session on app launch
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);

  if (loading) {
    // TODO: Replace with proper loading screen
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!isAuthenticated ? (
        // Auth stack
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="OAuthCallback" component={OAuthCallbackScreen} />
        </>
      ) : (
        // Main app stack
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{headerShown: true, title: 'Chat'}}
          />
          <Stack.Screen
            name="RestaurantSearch"
            component={RestaurantSearchScreen}
            options={{headerShown: true, title: 'Search Restaurants'}}
          />
        </>
      )}
    </Stack.Navigator>
  );
};
