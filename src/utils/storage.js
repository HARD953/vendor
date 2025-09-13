import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés de stockage
export const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  CLIENTS: 'clients',
  PRODUCTS: 'products',
  DAILY_STATS: 'dailyStats',
};

// Utilitaires génériques
export const storage = {
  // Sauvegarder des données
  setItem: async (key, value) => {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de ${key}:`, error);
      return false;
    }
  },

  // Récupérer des données
  getItem: async (key) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error(`Erreur lors de la récupération de ${key}:`, error);
      return null;
    }
  },

  // Supprimer un élément
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression de ${key}:`, error);
      return false;
    }
  },

  // Vider tout le stockage
  clear: async () => {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Erreur lors du vidage du stockage:', error);
      return false;
    }
  },
};

// Utilitaires spécifiques aux clients
export const clientStorage = {
  // Sauvegarder la liste des clients
  saveClients: async (clients) => {
    return await storage.setItem(STORAGE_KEYS.CLIENTS, clients);
  },

  // Récupérer la liste des clients
  getClients: async () => {
    const clients = await storage.getItem(STORAGE_KEYS.CLIENTS);
    return clients || [];
  },

  // Ajouter un nouveau client
  addClient: async (client) => {
    try {
      const clients = await clientStorage.getClients();
      const newClient = {
        ...client,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedClients = [newClient, ...clients];
      await clientStorage.saveClients(updatedClients);
      return newClient;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du client:', error);
      return null;
    }
  },

  // Supprimer un client
  deleteClient: async (clientId) => {
    try {
      const clients = await clientStorage.getClients();
      const filteredClients = clients.filter(client => client.id !== clientId);
      await clientStorage.saveClients(filteredClients);
      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du client:', error);
      return false;
    }
  },
};

// Utilitaires spécifiques aux produits
export const productStorage = {
  // Sauvegarder la liste des produits
  saveProducts: async (products) => {
    return await storage.setItem(STORAGE_KEYS.PRODUCTS, products);
  },

  // Récupérer la liste des produits
  getProducts: async () => {
    const products = await storage.getItem(STORAGE_KEYS.PRODUCTS);
    return products || [];
  },

  // Mettre à jour la quantité vendue d'un produit
  updateProductSoldQuantity: async (productId, soldQuantity) => {
    try {
      const products = await productStorage.getProducts();
      const updatedProducts = products.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            soldQuantity,
            updatedAt: new Date().toISOString(),
          };
        }
        return product;
      });
      await productStorage.saveProducts(updatedProducts);
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      return false;
    }
  },

  // Réinitialiser les quantités vendues
  resetSoldQuantities: async () => {
    try {
      const products = await productStorage.getProducts();
      const resetProducts = products.map(product => ({
        ...product,
        soldQuantity: 0,
        updatedAt: new Date().toISOString(),
      }));
      await productStorage.saveProducts(resetProducts);
      return true;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      return false;
    }
  },
};

// Utilitaires d'authentification
export const authStorage = {
  // Sauvegarder les données de connexion
  saveUserData: async (userData) => {
    try {
      await storage.setItem(STORAGE_KEYS.USER_TOKEN, userData.token);
      await storage.setItem(STORAGE_KEYS.USER_DATA, userData);
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des données utilisateur:', error);
      return false;
    }
  },

  // Récupérer les données utilisateur
  getUserData: async () => {
    return await storage.getItem(STORAGE_KEYS.USER_DATA);
  },

  // Récupérer le token
  getToken: async () => {
    return await storage.getItem(STORAGE_KEYS.USER_TOKEN);
  },

  // Déconnexion
  logout: async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.USER_TOKEN);
      await storage.removeItem(STORAGE_KEYS.USER_DATA);
      return true;
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      return false;
    }
  },
};

// Utilitaires pour les statistiques
export const statsStorage = {
  // Calculer et sauvegarder les statistiques du jour
  calculateDailyStats: async () => {
    try {
      const [clients, products] = await Promise.all([
        clientStorage.getClients(),
        productStorage.getProducts(),
      ]);

      const stats = {
        date: new Date().toISOString().split('T')[0],
        clients: {
          total: clients.length,
          totalRevenue: clients.reduce((sum, client) => sum + client.amount, 0),
          averageRevenue: clients.length > 0 ? clients.reduce((sum, client) => sum + client.amount, 0) / clients.length : 0,
        },
        products: {
          totalAssigned: products.reduce((sum, product) => sum + product.quantity, 0),
          totalSold: products.reduce((sum, product) => sum + product.soldQuantity, 0),
          totalRevenue: products.reduce((sum, product) => sum + (product.soldQuantity * product.unitPrice), 0),
          sellRate: products.reduce((sum, product) => sum + product.quantity, 0) > 0 ? 
            (products.reduce((sum, product) => sum + product.soldQuantity, 0) / products.reduce((sum, product) => sum + product.quantity, 0)) * 100 : 0,
        },
        totalRevenue: clients.reduce((sum, client) => sum + client.amount, 0) + 
                     products.reduce((sum, product) => sum + (product.soldQuantity * product.unitPrice), 0),
        updatedAt: new Date().toISOString(),
      };

      await storage.setItem(STORAGE_KEYS.DAILY_STATS, stats);
      return stats;
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return null;
    }
  },

  // Récupérer les statistiques du jour
  getDailyStats: async () => {
    return await storage.getItem(STORAGE_KEYS.DAILY_STATS);
  },
};

// Utilitaires de réinitialisation
export const resetStorage = {
  // Réinitialiser toutes les données sauf l'authentification
  resetAllData: async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.CLIENTS);
      await storage.removeItem(STORAGE_KEYS.PRODUCTS);
      await storage.removeItem(STORAGE_KEYS.DAILY_STATS);
      return true;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      return false;
    }
  },

  // Réinitialiser seulement les données du jour
  resetDailyData: async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.CLIENTS);
      await productStorage.resetSoldQuantities();
      await storage.removeItem(STORAGE_KEYS.DAILY_STATS);
      return true;
    } catch (error) {
      console.error('Erreur lors de la réinitialisation quotidienne:', error);
      return false;
    }
  },
};