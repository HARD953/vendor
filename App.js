import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform,
  KeyboardAvoidingView,
  SafeAreaView 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des écrans
import LoginScreen from './src/screens/LoginScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import SalesReportScreen from './src/screens/SalesReportScreen';
import PointOfSaleScreen from './src/screens/PointOfSaleScreen';
// Couleurs
import { COLORS } from './src/styles/colors';

// Composant HeaderMenu
import HeaderMenu from './src/screens/HeaderMenu';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Navigation des onglets principaux
function MainTabNavigator({ onLogout }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Collection') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Produits') {
              iconName = focused ? 'cube' : 'cube-outline';
            } else if (route.name === 'Rapport') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'PointsDeVente') {
              iconName = focused ? 'business' : 'business-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textLight,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            height: Platform.OS === 'ios' ? 85 : 55,
            paddingBottom: Platform.OS === 'ios' ? 25 : 8,
            paddingTop: 8,
            position: 'absolute',
            elevation: 0,
            shadowOpacity: 0,
            borderTopWidth: 0,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            marginBottom: Platform.OS === 'ios' ? 0 : 4,
          },
          headerStyle: {
            backgroundColor: COLORS.primary,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: COLORS.surface,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => <HeaderMenu onLogout={onLogout} />,
          headerShown: true,
        })}
      >
        <Tab.Screen 
          name="Collection" 
          component={CollectionScreen}
          options={{ 
            title: 'Collecte Clients',
          }}
        />
        <Tab.Screen 
          name="PointsDeVente" 
          component={PointOfSaleScreen}
          options={{ 
            title: 'Points de Vente',
          }}
        />
        <Tab.Screen 
          name="Produits" 
          component={ProductsScreen}
          options={{ 
            title: 'Mes Produits',
          }}
        />
        <Tab.Screen 
          name="Rapport" 
          component={SalesReportScreen}
          options={{ 
            title: 'Rapport Ventes',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default function App() {
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
      console.log('Erreur lors de la vérification du token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setIsLoggedIn(false);
    } catch (error) {
      console.log('Erreur lors de la déconnexion:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Ajouter un indicateur de chargement ici si nécessaire */}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" backgroundColor={COLORS.primary} />
      <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            cardStyle: { backgroundColor: COLORS.background }
          }}
        >
          {isLoggedIn ? (
            <Stack.Screen name="Main">
              {props => <MainTabNavigator {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={() => setIsLoggedIn(true)} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});