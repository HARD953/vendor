import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HeaderMenu = ({ onLogout }) => {
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Déconnecter',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              onLogout();
            } catch (error) {
              console.log('Erreur lors de la déconnexion:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ marginRight: 15 }}>
      <TouchableOpacity onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default HeaderMenu;