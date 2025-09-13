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
  Image,
  Dimensions,
  Animated,
  Easing,
  SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://backendsupply.onrender.com/api';

export default function ProductsScreen() {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({ 
    total_products: 0, 
    total_amount: 0,
    remaining_products: 0,
    sold_amount: 0,
    sold_quantity: 0,
    remaining_amount: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [activeTab, setActiveTab] = useState('all');
  const [searchProductQuery, setSearchProductQuery] = useState('');

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start();
  }, []);

    useEffect(() => {
      if (selectedProduct && saleQuantity) {
        const qty = parseInt(saleQuantity);
        if (!isNaN(qty) && qty > 0) {
          const price = parseFloat(selectedProduct.product_variant.price);
          setTotalAmount(qty * price);
        } else {
          setTotalAmount(0);
        }
      } else {
        setTotalAmount(0);
      }
    }, [saleQuantity, selectedProduct]);
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('accessToken');
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
        loadSalesSummary(),
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
      
      let totalAssignedProducts = 0;
      let totalAssignedAmount = 0;
      
      data.forEach(activity => {
        if (activity.activity_type === 'stock_replenishment') {
          activity.order_items.forEach(item => {
            totalAssignedProducts += item.quantity;
            totalAssignedAmount += parseFloat(item.total);
          });
        }
      });
      
      setSummary(prev => ({
        ...prev,
        total_products: totalAssignedProducts,
        total_amount: totalAssignedAmount
      }));
    } catch (error) {
      console.log('Erreur lors du chargement des activités:', error);
      throw error;
    }
  };

  const loadSalesSummary = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/sales/summary/`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      setSummary(prev => ({
        ...prev,
        sold_amount: data.total_revenue || 0,
        sold_quantity: data.total_quantity || 0,
        remaining_products: prev.total_products - (data.total_quantity || 0),
        remaining_amount: prev.total_amount - (data.total_revenue || 0)
      }));
    } catch (error) {
      console.log('Erreur lors du chargement du résumé des ventes:', error);
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
      setFilteredCustomers(data);
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
    setTotalAmount(0);
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
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/sales/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_variant: selectedProduct.product_variant.id,
          customer: selectedCustomer.id,
          quantity: qty,
          total_amount: totalAmount.toFixed(2)
        })
      });

      if (response.ok) {
        Alert.alert('Succès', `Vente enregistrée pour ${selectedCustomer.full_name}`);
        setSaleModalVisible(false);
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
    
    if (remaining === 0) return { status: 'Épuisé', color: '#ff4757', icon: 'close-circle', priority: 0 };
    if (remaining <= minStock) return { status: 'Stock faible', color: '#ff9f43', icon: 'warning', priority: 1 };
    if (remaining <= minStock * 2) return { status: 'Stock moyen', color: '#2e86de', icon: 'alert-circle', priority: 2 };
    return { status: 'Stock bon', color: '#10ac84', icon: 'checkmark-circle', priority: 3 };
  };

  const getFilteredProducts = () => {
    let allProducts = [];
    activities.forEach(activity => {
      activity.order_items.forEach(item => {
        const existingProduct = allProducts.find(p => p.product_variant.id === item.product_variant.id);
        if (!existingProduct) {
          allProducts.push(item);
        }
      });
    });

    // Filtrer par recherche
    if (searchProductQuery.trim() !== '') {
      allProducts = allProducts.filter(product => 
        product.product_name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
        product.product_variant.product.sku.toLowerCase().includes(searchProductQuery.toLowerCase())
      );
    }

    // Filtrer par onglet actif
    if (activeTab !== 'all') {
      allProducts = allProducts.filter(product => {
        const status = getStockStatus(product);
        return (
          (activeTab === 'low' && status.priority <= 1) ||
          (activeTab === 'medium' && status.priority === 2) ||
          (activeTab === 'good' && status.priority === 3)
        );
      });
    }

    // Trier par statut de stock (les plus critiques en premier)
    return allProducts.sort((a, b) => {
      const statusA = getStockStatus(a);
      const statusB = getStockStatus(b);
      return statusA.priority - statusB.priority;
    });
  };

  const getProductSections = () => {
    const products = getFilteredProducts();
    const sections = [
      { title: 'Stock Critique', data: [], color: '#ff4757' },
      { title: 'Stock Faible', data: [], color: '#ff9f43' },
      { title: 'Stock Moyen', data: [], color: '#2e86de' },
      { title: 'Stock Bon', data: [], color: '#10ac84' }
    ];

    products.forEach(product => {
      const status = getStockStatus(product);
      if (status.priority === 0) sections[0].data.push(product);
      else if (status.priority === 1) sections[1].data.push(product);
      else if (status.priority === 2) sections[2].data.push(product);
      else sections[3].data.push(product);
    });

    return sections.filter(section => section.data.length > 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  const filteredProducts = getFilteredProducts();
  const productSections = getProductSections();

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header avec recherche */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Inventaire Produits</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Gestion de votre inventaire en temps réel</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            value={searchProductQuery}
            onChangeText={setSearchProductQuery}
            placeholderTextColor={COLORS.textLight}
          />
          {searchProductQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchProductQuery('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Statistiques générales */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.statsCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statsHeader}>
              <Ionicons name="analytics" size={24} color="#fff" />
              <Text style={styles.statsTitle}>Aperçu du Stock</Text>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCircle}>
                <Text style={styles.statCircleNumber}>{summary.total_products}</Text>
                <Text style={styles.statCircleLabel}>Total</Text>
              </View>
              
              <View style={styles.statCircle}>
                <Text style={[styles.statCircleNumber, { color: '#10ac84' }]}>{summary.sold_quantity}</Text>
                <Text style={styles.statCircleLabel}>Vendus</Text>
              </View>
              
              <View style={styles.statCircle}>
                <Text style={[styles.statCircleNumber, { color: '#ff9f43' }]}>{summary.remaining_products}</Text>
                <Text style={styles.statCircleLabel}>Restants</Text>
              </View>
            </View>
            
            <View style={styles.amountSummary}>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Valeur totale:</Text>
                <Text style={styles.amountValue}>{formatPrice(summary.total_amount)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(summary.sold_quantity / summary.total_products) * 100}%`,
                      backgroundColor: '#10ac84',
                    }
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>Taux de vente: {Math.round((summary.sold_quantity / summary.total_products) * 100)}%</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Filtres par statut de stock */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity 
              style={[styles.filterButton, activeTab === 'all' && styles.filterButtonActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.filterText, activeTab === 'all' && styles.filterTextActive]}>Tous</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, activeTab === 'low' && styles.filterButtonActive]}
              onPress={() => setActiveTab('low')}
            >
              <Ionicons name="warning" size={16} color={activeTab === 'low' ? '#fff' : '#ff9f43'} />
              <Text style={[styles.filterText, activeTab === 'low' && styles.filterTextActive]}>Faible</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, activeTab === 'medium' && styles.filterButtonActive]}
              onPress={() => setActiveTab('medium')}
            >
              <Ionicons name="alert-circle" size={16} color={activeTab === 'medium' ? '#fff' : '#2e86de'} />
              <Text style={[styles.filterText, activeTab === 'medium' && styles.filterTextActive]}>Moyen</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterButton, activeTab === 'good' && styles.filterButtonActive]}
              onPress={() => setActiveTab('good')}
            >
              <Ionicons name="checkmark-circle" size={16} color={activeTab === 'good' ? '#fff' : '#10ac84'} />
              <Text style={[styles.filterText, activeTab === 'good' && styles.filterTextActive]}>Bon</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Liste des produits */}
        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits ({filteredProducts.length})</Text>
            <Text style={styles.sectionSubtitle}>Classés par niveau de stock</Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#e0e0e0" />
              <Text style={styles.emptyStateText}>Aucun produit trouvé</Text>
              <Text style={styles.emptyStateSubtext}>Ajustez vos filtres ou votre recherche</Text>
            </View>
          ) : (
            <SectionList
              sections={productSections}
              keyExtractor={(item) => item.product_variant.id.toString()}
              // Par ceci :
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: section.color + '20' }]}>
                  <View style={[styles.sectionIndicator, { backgroundColor: section.color }]} />
                  <Text style={[styles.sectionHeaderText, { color: section.color }]}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.data.length}</Text>
                </View>
              )}
              renderItem={({ item: product, index, section }) => {
                const stockInfo = getStockStatus(product);
                const remaining = product.product_variant.current_stock;
                const progressPercentage = Math.min(100, (remaining / product.product_variant.max_stock) * 100);
                
                return (
                  <TouchableOpacity
                    style={styles.productItem}
                    onPress={() => handleSalePress(product)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productImageContainer}>
                      {product.product_variant.image ? (
                        <Image 
                          source={{ uri: product.product_variant.image }} 
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productImagePlaceholder}>
                          <Ionicons name="cube" size={24} color="#ccc" />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.productContent}>
                      <View style={styles.productHeader}>
                        <Text style={styles.productName} numberOfLines={1}>{product.product_name}</Text>
                        <Text style={styles.productPrice}>{formatPrice(product.product_variant.price)}</Text>
                      </View>
                      
                      <Text style={styles.productFormat}>{product.product_variant.format.name}</Text>
                      <Text style={styles.productSku}>SKU: {product.product_variant.product.sku}</Text>
                      
                      <View style={styles.stockInfoRow}>
                        <View style={styles.stockStats}>
                          <View style={styles.stockStat}>
                            <Text style={styles.stockLabel}>Min:</Text>
                            <Text style={styles.stockValue}>{product.product_variant.min_stock}</Text>
                          </View>
                          <View style={styles.stockStat}>
                            <Text style={styles.stockLabel}>Restant:</Text>
                            <Text style={[styles.stockValue, { color: stockInfo.color }]}>
                              {remaining}
                            </Text>
                          </View>
                        </View>
                        
                        <View style={[styles.statusBadge, { backgroundColor: stockInfo.color + '20' }]}>
                          <Ionicons name={stockInfo.icon} size={14} color={stockInfo.color} />
                          <Text style={[styles.statusText, { color: stockInfo.color }]}>{stockInfo.status}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${progressPercentage}%`,
                                backgroundColor: stockInfo.color,
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progressPercentage)}%</Text>
                      </View>
                    </View>
                    
                    <View style={styles.productAction}>
                      <TouchableOpacity 
                        style={[styles.saleButton, remaining === 0 && styles.saleButtonDisabled]}
                        onPress={() => handleSalePress(product)}
                        disabled={remaining === 0}
                      >
                        <Ionicons name="cart" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enregistrer une vente</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setSaleModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.productSummary}>
              <View style={styles.productImageModal}>
                {selectedProduct?.product_variant?.image ? (
                  <Image 
                    source={{ uri: selectedProduct.product_variant.image }} 
                    style={styles.modalProductImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.modalProductImagePlaceholder}>
                    <Ionicons name="cube" size={32} color="#ccc" />
                  </View>
                )}

                <Text style={styles.productSummaryTitle}>{selectedProduct?.product_name}</Text>
                <Text style={styles.productSummaryDetail}>{selectedProduct?.product_variant?.format?.name}</Text>
                <Text style={styles.productSummaryPrice}>
                  {formatPrice(selectedProduct?.product_variant?.price || 0)}/unité
                </Text>
                <Text style={styles.productSummaryStock}>
                  Stock: <Text style={{ fontWeight: 'bold', color: selectedProduct ? getStockStatus(selectedProduct)?.color : '#000' }}>
                    {selectedProduct?.product_variant?.current_stock || 0}
                  </Text>
                </Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantité à vendre</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={saleQuantity}
                onChangeText={setSaleQuantity}
                placeholder="0"
                placeholderTextColor="#ccc"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Client</Text>
              <TouchableOpacity 
                style={styles.customerSelector}
                onPress={() => setCustomerModalVisible(true)}
              >
                {selectedCustomer ? (
                  <View style={styles.selectedCustomer}>
                    <View style={styles.customerAvatarSmall}>
                      <Ionicons name="person" size={16} color={COLORS.primary} />
                    </View>
                    <Text style={styles.customerSelected}>{selectedCustomer.full_name}</Text>
                  </View>
                ) : (
                  <Text style={styles.customerPlaceholder}>Sélectionner un client</Text>
                )}
                <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            
            {selectedCustomer && (
              <View style={styles.customerInfo}>
                <View style={styles.customerDetailRow}>
                  <Ionicons name="location" size={16} color={COLORS.textLight} />
                  <Text style={styles.customerDetail}>{selectedCustomer.zone}</Text>
                </View>
                <View style={styles.customerDetailRow}>
                  <Ionicons name="call" size={16} color={COLORS.textLight} />
                  <Text style={styles.customerDetail}>{selectedCustomer.phone}</Text>
                </View>
              </View>
            )}
            
            {saleQuantity && !isNaN(parseInt(saleQuantity)) && parseInt(saleQuantity) > 0 && (
              <View style={styles.totalAmountContainer}>
                <Text style={styles.totalAmountLabel}>Montant total</Text>
                <Text style={styles.totalAmountText}>{formatPrice(totalAmount)}</Text>
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSaleModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, (!saleQuantity || !selectedCustomer) && styles.disabledButton]}
                onPress={confirmSale}
                disabled={!saleQuantity || !selectedCustomer}
              >
                <Ionicons name="checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.confirmButtonText}>Confirmer</Text>
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.customerModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un client</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setCustomerModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.textLight}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>
            
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                  }}
                >
                  <View style={styles.customerAvatar}>
                    <Ionicons name="person" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.customerDetails}>
                    <Text style={styles.customerName}>{item.full_name}</Text>
                    <View style={styles.customerMeta}>
                      <View style={styles.customerMetaItem}>
                        <Ionicons name="location" size={12} color={COLORS.textLight} />
                        <Text style={styles.customerZone}>{item.zone}</Text>
                      </View>
                      <View style={styles.customerMetaItem}>
                        <Ionicons name="call" size={12} color={COLORS.textLight} />
                        <Text style={styles.customerPhone}>{item.phone}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="people" size={48} color="#e0e0e0" />
                  <Text style={styles.emptyListText}>
                    {searchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  refreshButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  clearSearchButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  statsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  statCircleNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statCircleLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  amountSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 4,
  },
  filterTextActive: {
    color: '#fff',
  },
  productsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productContent: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.accent,
  },
  productFormat: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 2,
    fontWeight: '500',
  },
  productSku: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  stockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockStats: {
    flexDirection: 'row',
  },
  stockStat: {
    marginRight: 16,
  },
  stockLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    minWidth: 30,
    textAlign: 'right',
  },
  productAction: {
    justifyContent: 'center',
    marginLeft: 12,
  },
  saleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saleButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 20,
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 0,
    width: '100%',
    maxHeight: '99%',
    overflow: 'hidden',
  },
  customerModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: 4,
  },
  productSummary: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImageModal: {
    marginRight: 16,
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  modalProductImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfoModal: {
    flex: 1,
  },
  productSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  productSummaryDetail: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
    fontWeight: '500',
  },
  productSummaryPrice: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '700',
    marginBottom: 4,
  },
  productSummaryStock: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  inputGroup: {
    padding: 20,
    paddingBottom: 0,
  },
  inputLabel: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  customerSelected: {
    color: COLORS.text,
    fontWeight: '600',
  },
  customerPlaceholder: {
    color: COLORS.textLight,
  },
  customerInfo: {
    padding: 20,
    paddingTop: 12,
  },
  customerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerDetail: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  totalAmountContainer: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalAmountText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 0,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  customerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  customerMeta: {
    flexDirection: 'row',
  },
  customerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  customerZone: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  emptyList: {
    alignItems: 'center',
    padding: 40,
  },
  emptyListText: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: 12,
    fontSize: 16,
  },
});