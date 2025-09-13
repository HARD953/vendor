import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';

const API_BASE_URL = 'https://backendsupply.onrender.com/api';

export default function ProductsScreen() {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({ 
    total_products: 0, 
    total_amount: 0,
    remaining_products: 0,
    sold_amount: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    
    // Vérification du token
    console.log('[DEBUG] Token présent ?', token ? 'OUI' : 'NON');
    if (token) {
      console.log('[DEBUG] Token (début):', token.substring(0, 10) + '...');
    } else {
      console.warn('[WARNING] Aucun token trouvé dans AsyncStorage');
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActivities(),
        loadSummary(),
        loadCustomers()
      ]);
    } catch (error) {
      console.log('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/vendor-activities/`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setActivities(data);
      
      // Calculer les produits restants et le montant vendu
      let remainingProducts = 0;
      let soldAmount = 0;
      
      data.forEach(activity => {
        if (activity.activity_type === 'stock_replenishment') {
          activity.order_items.forEach(item => {
            remainingProducts += item.product_variant.current_stock;
          });
        } else if (activity.activity_type === 'sale') {
          activity.order_items.forEach(item => {
            soldAmount += parseFloat(item.total);
          });
        }
      });
      
      setSummary(prev => ({
        ...prev,
        remaining_products: remainingProducts,
        sold_amount: soldAmount
      }));
    } catch (error) {
      console.log('Erreur lors du chargement des activités:', error);
      throw error;
    }
  };

  const loadSummary = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/vendor-activities-summary/`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        setSummary(prev => ({
          ...prev,
          total_products: data[0].total_products,
          total_amount: parseFloat(data[0].total_amount)
        }));
      }
    } catch (error) {
      console.log('Erreur lors du chargement du résumé:', error);
      throw error;
    }
  };

  const loadCustomers = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/purchases/`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.log('Erreur lors du chargement des clients:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleSalePress = (product) => {
    const availableQuantity = product.product_variant.current_stock;
    
    if (availableQuantity <= 0) {
      Alert.alert('Stock épuisé', 'Plus de stock disponible pour ce produit');
      return;
    }

    setSelectedProduct(product);
    setSaleQuantity('');
    setSelectedCustomer(null);
    setSaleModalVisible(true);
  };

  const confirmSale = async () => {
    if (!saleQuantity || isNaN(saleQuantity) || parseInt(saleQuantity) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return;
    }

    const qty = parseInt(saleQuantity);
    const availableQuantity = selectedProduct.product_variant.current_stock;
    
    if (qty > availableQuantity) {
      Alert.alert('Erreur', 'Quantité supérieure au stock disponible');
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Information', 'Veuillez sélectionner un client');
      setCustomerModalVisible(true);
      return;
    }

    try {
      // Envoyer la vente à l'API
      const headers = await getAuthHeader();
      headers['Content-Type'] = 'application/json';
      
      const response = await fetch(`${API_BASE_URL}/sales/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_variant: selectedProduct.product_variant.id,
          customer: selectedCustomer.id,
          quantity: qty,
          total_amount: (qty * parseFloat(selectedProduct.product_variant.price)).toFixed(2)
        })
      });

      if (response.ok) {
        Alert.alert('Succès', `Vente enregistrée pour ${selectedCustomer.full_name}`);
        setSaleModalVisible(false);
        // Recharger les données pour mettre à jour les stocks
        loadData();
      } else {
        const errorData = await response.json();
        console.log('Erreur détaillée:', errorData);
        Alert.alert('Erreur', 'Échec de l\'enregistrement de la vente');
      }
    } catch (error) {
      console.log('Erreur lors de l\'enregistrement de la vente:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la vente');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(price);
  };

  const getStockStatus = (product) => {
    const remaining = product.product_variant.current_stock;
    const minStock = product.product_variant.min_stock;
    
    if (remaining === 0) return { status: 'Épuisé', color: COLORS.error };
    if (remaining <= minStock) return { status: 'Stock faible', color: COLORS.warning };
    if (remaining <= minStock * 2) return { status: 'Stock moyen', color: COLORS.accent };
    return { status: 'Stock bon', color: COLORS.success };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  // Extraire tous les produits uniques des activités
  const allProducts = [];
  activities.forEach(activity => {
    activity.order_items.forEach(item => {
      // Vérifier si le produit existe déjà dans la liste
      const existingProduct = allProducts.find(p => p.product_variant.id === item.product_variant.id);
      if (!existingProduct) {
        allProducts.push(item);
      }
    });
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Statistiques générales */}
        <View style={styles.statsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Résumé du jour</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{summary.total_products}</Text>
              <Text style={styles.statLabel}>Produits assignés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{summary.remaining_products}</Text>
              <Text style={styles.statLabel}>Produits restants</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatPrice(summary.total_amount)}</Text>
              <Text style={styles.statLabel}>Montant assigné</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatPrice(summary.sold_amount)}</Text>
              <Text style={styles.statLabel}>Montant vendu</Text>
            </View>
          </View>
        </View>

        {/* Liste des produits */}
        <View style={styles.productsCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="cube" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Mes produits ({allProducts.length})</Text>
          </View>

          {allProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>Aucun produit assigné</Text>
            </View>
          ) : (
            allProducts.map((product) => {
              const stockInfo = getStockStatus(product);
              const remaining = product.product_variant.current_stock;
              
              return (
                <TouchableOpacity
                  key={product.product_variant.id}
                  style={styles.productItem}
                  onPress={() => handleSalePress(product)}
                  activeOpacity={0.7}
                >
                  <View style={styles.productHeader}>
                    {product.product_variant.image && (
                      <Image 
                        source={{ uri: product.product_variant.image }} 
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.product_name}</Text>
                      <Text style={styles.productFormat}>{product.product_variant.format.name}</Text>
                      <Text style={styles.productDescription}>
                        SKU: {product.product_variant.product.sku}
                      </Text>
                    </View>
                    <View style={styles.productPrice}>
                      <Text style={styles.priceText}>{formatPrice(product.product_variant.price)}</Text>
                    </View>
                  </View>

                  <View style={styles.productStats}>
                    <View style={styles.quantityInfo}>
                      <View style={styles.quantityItem}>
                        <Text style={styles.quantityLabel}>Stock min:</Text>
                        <Text style={styles.quantityValue}>{product.product_variant.min_stock}</Text>
                      </View>
                      <View style={styles.quantityItem}>
                        <Text style={styles.quantityLabel}>Stock max:</Text>
                        <Text style={styles.quantityValue}>{product.product_variant.max_stock}</Text>
                      </View>
                      <View style={styles.quantityItem}>
                        <Text style={styles.quantityLabel}>Restant:</Text>
                        <Text style={[styles.quantityValue, { color: stockInfo.color }]}>
                          {remaining}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, { backgroundColor: stockInfo.color }]}>
                        <Text style={styles.statusText}>{stockInfo.status}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${(remaining / product.product_variant.max_stock) * 100}%`,
                            backgroundColor: stockInfo.color,
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round((remaining / product.product_variant.max_stock) * 100)}% du stock max
                    </Text>
                  </View>

                  <View style={styles.actionHint}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.actionHintText}>Appuyer pour enregistrer une vente</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Modal de vente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={saleModalVisible}
        onRequestClose={() => setSaleModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vendre {selectedProduct?.product_name}</Text>
            
            <Text style={styles.modalLabel}>Quantité à vendre:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={saleQuantity}
              onChangeText={setSaleQuantity}
              placeholder="Entrez la quantité"
            />
            
            <Text style={styles.modalLabel}>Client:</Text>
            <TouchableOpacity 
              style={styles.customerSelector}
              onPress={() => setCustomerModalVisible(true)}
            >
              <Text style={selectedCustomer ? styles.customerSelected : styles.customerPlaceholder}>
                {selectedCustomer ? selectedCustomer.full_name : 'Sélectionner un client'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
            
            {selectedCustomer && (
              <View style={styles.customerInfo}>
                <Text style={styles.customerDetail}>Zone: {selectedCustomer.zone}</Text>
                <Text style={styles.customerDetail}>Téléphone: {selectedCustomer.phone}</Text>
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSaleModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmSale}
              >
                <Text style={styles.confirmButtonText}>Confirmer la vente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection du client */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customerModalVisible}
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                  }}
                >
                  <View style={styles.customerDetails}>
                    <Text style={styles.customerName}>{item.full_name}</Text>
                    <Text style={styles.customerZone}>{item.zone}</Text>
                  </View>
                  <Ionicons name="person-circle-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyListText}>Aucun client disponible</Text>
              }
            />
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setCustomerModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: 16,
    marginTop: 12,
  },
  productItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    backgroundColor: COLORS.background,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  productFormat: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  quantityItem: {
    marginRight: 20,
  },
  quantityLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.surface,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionHintText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  customerPlaceholder: {
    color: COLORS.textLight,
  },
  customerSelected: {
    color: COLORS.text,
  },
  customerInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  customerDetail: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.error,
  },
  confirmButton: {
    backgroundColor: COLORS.success,
  },
  cancelButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  customerZone: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyListText: {
    textAlign: 'center',
    color: COLORS.textLight,
    padding: 20,
  },
});