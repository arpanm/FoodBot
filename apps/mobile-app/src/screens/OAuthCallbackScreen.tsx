import React, {useEffect} from 'react';
import {View, Text, ActivityIndicator, StyleSheet} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types';
import {useAppDispatch} from '../store';
import {completeOAuthCallback} from '../store/slices/authSlice';

type Props = NativeStackScreenProps<RootStackParamList, 'OAuthCallback'>;

/**
 * OAuth Callback Screen
 * Handles OAuth redirect from browser and completes authentication
 */
const OAuthCallbackScreen: React.FC<Props> = ({route, navigation}) => {
  const dispatch = useAppDispatch();
  const {code, state} = route.params;

  useEffect(() => {
    handleCallback();
  }, [code, state]);

  const handleCallback = async () => {
    try {
      await dispatch(completeOAuthCallback({code, state})).unwrap();
      // Authentication successful, navigation will be handled by AppNavigator
    } catch (error) {
      console.error('OAuth callback failed:', error);
      // Navigate back to login on error
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF6B6B" />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default OAuthCallbackScreen;
