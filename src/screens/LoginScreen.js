import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/colors';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isFocused, setIsFocused] = useState({ username: false, password: false });
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const formSlideAnim = useRef(new Animated.Value(30)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée séquentielle
    Animated.sequence([
      // Animation du fond
      Animated.timing(backgroundAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Animation parallèle du logo et du formulaire
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(formSlideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
          delay: 200,
        })
      ])
    ]).start();
  }, []);

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const animateError = () => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -10,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 80,
        useNativeDriver: true,
      })
    ]).start();
  };

  const animateSuccess = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1.1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      })
    ]).start(() => {
      onLogin();
    });
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!username.trim()) {
      setUsernameError('Le nom d\'utilisateur est requis');
      isValid = false;
    } else if (username.length < 3) {
      setUsernameError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      isValid = false;
    } else {
      setUsernameError('');
    }
    
    if (!password.trim()) {
      setPasswordError('Le mot de passe est requis');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      isValid = false;
    } else {
      setPasswordError('');
    }
    
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      animateError();
      return;
    }

    animateButtonPress();
    setIsLoading(true);
    
    try {
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const response = await fetch('https://api.pushtrack360.com/api/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Stockage des tokens et des données utilisateur
        await AsyncStorage.multiSet([
          ['accessToken', data.access],
          ['refreshToken', data.refresh],
          ['userData', JSON.stringify({
            username: username,
            loginDate: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          })]
        ]);
        
        animateSuccess();
        
      } else {
        let errorMessage = 'Nom d\'utilisateur ou mot de passe incorrect';
        if (data.detail) {
          errorMessage = data.detail;
        }
        
        animateError();
        Alert.alert('Erreur de connexion', errorMessage);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      animateError();
      Alert.alert(
        'Erreur de connexion', 
        'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputFocus = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: true }));
  };

  const handleInputBlur = (field) => {
    setIsFocused(prev => ({ ...prev, [field]: false }));
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Mot de passe oublié',
      'Veuillez contacter votre administrateur pour réinitialiser votre mot de passe.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const backgroundInterpolate = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#667eea', '#764ba2']
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <Animated.View 
        style={[
          styles.background,
          { backgroundColor: backgroundInterpolate }
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Logo Section */}
              <Animated.View 
                style={[
                  styles.logoContainer,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { translateY: slideAnim },
                      { scale: logoScale }
                    ]
                  }
                ]}
              >
                <View style={styles.logoCircle}>
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    style={styles.logoGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="storefront" size={60} color={COLORS.surface} />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>VendeurApp</Text>
                <Text style={styles.subtitle}>Solution professionnelle de gestion mobile</Text>
              </Animated.View>

              {/* Form Section */}
              <Animated.View 
                style={[
                  styles.formContainer,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: formSlideAnim }]
                  }
                ]}
              >
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Connexion</Text>
                  <Text style={styles.formSubtitle}>
                    Accédez à votre espace professionnel
                  </Text>
                </View>
                
                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Animated.View style={[
                    styles.inputContainer, 
                    usernameError ? styles.inputError : null,
                    isFocused.username && styles.inputFocused
                  ]}>
                    <Ionicons 
                      name="person-outline" 
                      size={22} 
                      color={
                        usernameError ? COLORS.error : 
                        isFocused.username ? COLORS.primary : COLORS.textLight
                      } 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nom d'utilisateur"
                      placeholderTextColor={COLORS.textLight}
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        if (usernameError) setUsernameError('');
                      }}
                      onFocus={() => handleInputFocus('username')}
                      onBlur={() => handleInputBlur('username')}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      returnKeyType="next"
                    />
                    {username.length > 0 && !usernameError && (
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    )}
                  </Animated.View>
                  {usernameError ? (
                    <Text style={styles.errorText}>{usernameError}</Text>
                  ) : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Animated.View style={[
                    styles.inputContainer, 
                    passwordError ? styles.inputError : null,
                    isFocused.password && styles.inputFocused
                  ]}>
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={22} 
                      color={
                        passwordError ? COLORS.error : 
                        isFocused.password ? COLORS.primary : COLORS.textLight
                      } 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      placeholder="Mot de passe"
                      placeholderTextColor={COLORS.textLight}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (passwordError) setPasswordError('');
                      }}
                      onFocus={() => handleInputFocus('password')}
                      onBlur={() => handleInputBlur('password')}
                      secureTextEntry={!isPasswordVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity
                      onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                      style={styles.eyeIcon}
                      disabled={isLoading}
                    >
                      <Ionicons
                        name={isPasswordVisible ? "eye-outline" : "eye-off-outline"}
                        size={22}
                        color={passwordError ? COLORS.error : COLORS.textLight}
                      />
                    </TouchableOpacity>
                  </Animated.View>
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}
                </View>

                {/* Login Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#FF6B6B', '#FF8E53']}
                      style={styles.buttonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {isLoading ? (
                        <View style={styles.buttonContent}>
                          <ActivityIndicator color={COLORS.surface} size="small" />
                          <Text style={styles.loginButtonText}>Connexion...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonContent}>
                          <Text style={styles.loginButtonText}>Se connecter</Text>
                          <Ionicons name="arrow-forward" size={22} color={COLORS.surface} style={styles.buttonIcon} />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Version 1.0.0</Text>
                <Text style={styles.footerSubText}>© 2024 VendeurApp - Tous droits réservés</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  background: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height,
  },
  content: {
    paddingHorizontal: 30,
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.surface,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    marginBottom: 20,
  },
  formHeader: {
    marginBottom: 25,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  inputError: {
    borderColor: COLORS.error,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 4,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: 6,
    marginLeft: 8,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 16,
    marginTop: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginHorizontal: 8,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  footerSubText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});