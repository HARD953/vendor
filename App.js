import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import SalesReportScreen from './src/screens/SalesReportScreen';
import PointOfSaleScreen from './src/screens/PointOfSaleScreen';
import ProductsScreenPOS from './src/screens/ProductsScreenPOS';

// Design System
import { COLORS } from './src/styles/colors';

// Components
import HeaderMenu from './src/screens/HeaderMenu';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Constants
const TAB_BAR_CONFIG = {
  ios: {
    height: 85,
    paddingBottom: 25,
    paddingTop: 8,
  },
  android: {
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
  },
};

const SCREENS_CONFIG = {
  Collection: {
    title: 'Collecte Clients',
    icon: {
      focused: 'people',
      outline: 'people-outline',
    },
    component: CollectionScreen,
  },
  // PointsDeVente: {
  //   title: 'Points de Vente',
  //   icon: {
  //     focused: 'business',
  //     outline: 'business-outline',
  //   },
  //   component: PointOfSaleScreen,
  // },
  Produits: {
    title: 'Vente Pushcart',
    icon: {
      focused: 'cube',
      outline: 'cube-outline',
    },
    component: ProductsScreen,
  },
  // ProduitsPOS: {
  //   title: 'Vente POS',
  //   icon: {
  //     focused: 'cart',
  //     outline: 'cart-outline',
  //   },
  //   component: ProductsScreenPOS,
  // },
  Rapport: {
    title: 'Rapport Ventes',
    icon: {
      focused: 'stats-chart',
      outline: 'stats-chart-outline',
    },
    component: SalesReportScreen,
  },
};

// Navigation Components
const MainTabNavigator = ({ onLogout }) => {
  const renderTabBarIcon = useCallback((route, focused, color, size) => {
    const screenConfig = SCREENS_CONFIG[route.name];
    if (!screenConfig) return null;
    
    const iconName = focused ? screenConfig.icon.focused : screenConfig.icon.outline;
    
    return <Ionicons name={iconName} size={size} color={color} />;
  }, []);

  const getTabBarStyle = useCallback(() => ({
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    height: TAB_BAR_CONFIG[Platform.OS].height,
    paddingBottom: TAB_BAR_CONFIG[Platform.OS].paddingBottom,
    paddingTop: TAB_BAR_CONFIG[Platform.OS].paddingTop,
    // Supprimer position: 'absolute' pour permettre le scroll
    elevation: 8,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
    borderTopWidth: 1,
  }), []);

  const getTabBarLabelStyle = useCallback(() => ({
    fontSize: 11,
    marginBottom: Platform.OS === 'ios' ? 4 : 2,
    fontWeight: '500',
  }), []);

  const getScreenOptions = useCallback(({ route }) => ({
    tabBarIcon: ({ focused, color, size }) => 
      renderTabBarIcon(route, focused, color, size),
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textLight,
    tabBarStyle: getTabBarStyle(),
    tabBarLabelStyle: getTabBarLabelStyle(),
    headerStyle: {
      backgroundColor: COLORS.primary,
      elevation: 4,
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 2},
      shadowRadius: 4,
    },
    headerTintColor: COLORS.surface,
    headerTitleStyle: {
      fontWeight: 'bold',
      fontSize: 18,
    },
    headerRight: () => <HeaderMenu onLogout={onLogout} />,
    headerShown: true,
    // Ajouter un padding safe area pour le contenu
    contentStyle: {
      backgroundColor: COLORS.background,
      paddingBottom: TAB_BAR_CONFIG[Platform.OS].height + 10, // Espace pour le tab bar
    },
  }), [onLogout, renderTabBarIcon, getTabBarStyle, getTabBarLabelStyle]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Tab.Navigator 
        screenOptions={getScreenOptions}
        sceneContainerStyle={styles.sceneContainer}
      >
        {Object.entries(SCREENS_CONFIG).map(([name, config]) => (
          <Tab.Screen 
            key={name}
            name={name} 
            component={config.component}
            options={{ 
              title: config.title,
              // Options spécifiques pour chaque écran
              ...getScreenSpecificOptions(name),
            }}
          />
        ))}
      </Tab.Navigator>
    </SafeAreaView>
  );
};

// Fonction pour les options spécifiques à chaque écran
const getScreenSpecificOptions = (screenName) => {
  const specificOptions = {
    Produits: {
      headerShown: true,
    },
    ProduitsPOS: {
      headerShown: true,
    },
    Rapport: {
      headerShown: true,
    },
    // Options par défaut
    default: {
      headerShown: true,
    }
  };

  return specificOptions[screenName] || specificOptions.default;
};

// Main App Component
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!userToken);
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleLogin = useCallback(() => {
    setIsLoggedIn(true);
  }, []);

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );

  const renderNavigation = () => (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            cardStyle: { backgroundColor: COLORS.background },
            presentation: 'card',
          }}
        >
          {isLoggedIn ? (
            <Stack.Screen 
              name="Main" 
              options={{ headerShown: false }}
            >
              {(props) => <MainTabNavigator {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen 
              name="Login" 
              options={{ 
                headerShown: false,
                animationTypeForReplace: 'pop',
              }}
            >
              {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </KeyboardAvoidingView>
  );

  if (isLoading) {
    return renderLoading();
  }

  return renderNavigation();
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  sceneContainer: {
    backgroundColor: COLORS.background,
    // Ajouter un padding pour éviter que le contenu soit caché derrière le tab bar
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});

export default App;