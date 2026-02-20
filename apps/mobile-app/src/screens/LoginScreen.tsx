import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useAppDispatch, useAppSelector} from '../store';
import {loginWithOAuth} from '../store/slices/authSlice';

const LoginScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const {loading, error} = useAppSelector((state) => state.auth);

  const handleGoogleLogin = async () => {
    try {
      await dispatch(loginWithOAuth('google')).unwrap();
      // OAuth flow initiated, user will be redirected to browser
    } catch (err) {
      Alert.alert('Login Failed', 'Failed to initiate Google login');
    }
  };

  const handleFacebookLogin = async () => {
    try {
      await dispatch(loginWithOAuth('facebook')).unwrap();
    } catch (err) {
      Alert.alert('Login Failed', 'Failed to initiate Facebook login');
    }
  };

  const handleAppleLogin = async () => {
    try {
      await dispatch(loginWithOAuth('apple')).unwrap();
    } catch (err) {
      Alert.alert('Login Failed', 'Failed to initiate Apple login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FoodBot</Text>
        <Text style={styles.subtitle}>
          Your AI-powered food ordering assistant
        </Text>
      </View>

      <View style={styles.loginOptions}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue with Google</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.facebookButton]}
          onPress={handleFacebookLogin}
          disabled={loading}>
          <Text style={styles.buttonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={handleAppleLogin}
          disabled={loading}>
          <Text style={styles.buttonText}>Continue with Apple</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loginOptions: {
    marginBottom: 30,
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  googleButton: {
    backgroundColor: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 15,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
  },
  footer: {
    marginTop: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default LoginScreen;
