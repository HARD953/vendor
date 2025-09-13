import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';
import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';

const API_BASE_URL = "https://backendsupply.onrender.com/api";
const { width } = Dimensions.get('window');

export default function SalesReportScreen() {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    purchase_count: 0,
    sales_count: 0,
    total_amounts: 0,
    total_quantitys: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
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
      
      setSummary({
        purchase_count: data.purchase_count || 0,
        sales_count: data.sales_count || 0,
        total_amounts: data.total_amounts || 0,
        total_quantitys: data.total_quantitys || 0
      });
    } catch (error) {
      console.log('Erreur lors du chargement du résumé des ventes:', error);
      throw error;
    }
  };

  const loadData = async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        AsyncStorage.getItem('clients'),
        AsyncStorage.getItem('products'),
      ]);

      setClients(clientsData ? JSON.parse(clientsData) : []);
      setProducts(productsData ? JSON.parse(productsData) : []);
    } catch (error) {
      console.log('Erreur lors du chargement des données:', error);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadData(), loadSalesSummary()]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), loadSalesSummary()]);
    setIsRefreshing(false);
  };

  const resetData = () => {
    Alert.alert(
      'Réinitialiser les données',
      'Êtes-vous sûr de vouloir supprimer toutes les données du jour? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['clients', 'products']);
              setClients([]);
              setProducts([]);
              Alert.alert('Succès', 'Données réinitialisées');
            } catch (error) {
              Alert.alert('Erreur', 'Erreur lors de la réinitialisation');
            }
          }
        }
      ]
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculs des statistiques
  const getClientStats = () => {
    const totalClients = clients.length;
    const totalClientRevenue = clients.reduce((sum, client) => sum + client.amount, 0);
    const averageClientValue = totalClients > 0 ? totalClientRevenue / totalClients : 0;
    
    // Grouper par zone
    const zoneStats = clients.reduce((acc, client) => {
      if (!acc[client.zone]) {
        acc[client.zone] = { count: 0, revenue: 0 };
      }
      acc[client.zone].count += 1;
      acc[client.zone].revenue += client.amount;
      return acc;
    }, {});

    return {
      totalClients,
      totalClientRevenue,
      averageClientValue,
      zoneStats: Object.entries(zoneStats).map(([zone, data]) => ({
        zone,
        ...data
      }))
    };
  };

  const getProductStats = () => {
    const totalAssigned = products.reduce((sum, product) => sum + product.quantity, 0);
    const totalSold = products.reduce((sum, product) => sum + product.soldQuantity, 0);
    const totalProductRevenue = products.reduce((sum, product) => sum + (product.soldQuantity * product.unitPrice), 0);
    const remainingStock = totalAssigned - totalSold;
    const sellRate = totalAssigned > 0 ? (totalSold / totalAssigned) * 100 : 0;

    // Top produits vendus
    const topProducts = [...products]
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5);

    return {
      totalAssigned,
      totalSold,
      totalProductRevenue,
      remainingStock,
      sellRate,
      topProducts
    };
  };

  const clientStats = getClientStats();
  const productStats = getProductStats();
  const totalRevenue = clientStats.totalClientRevenue + productStats.totalProductRevenue;

  // Données pour les graphiques
  const zoneChartData = clientStats.zoneStats.length > 0 ? {
    labels: clientStats.zoneStats.map(zone => zone.zone.substring(0, 10)),
    datasets: [{
      data: clientStats.zoneStats.map(zone => zone.revenue)
    }]
  } : null;

  const productChartData = productStats.topProducts.length > 0 ? {
    labels: productStats.topProducts.map(p => p.name.substring(0, 10)),
    datasets: [{
      data: productStats.topProducts.map(p => p.soldQuantity)
    }]
  } : null;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* En-tête avec onglets */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rapport des Ventes</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
              Aperçu
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'clients' && styles.activeTab]}
            onPress={() => setActiveTab('clients')}
          >
            <Text style={[styles.tabText, activeTab === 'clients' && styles.activeTabText]}>
              Clients
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Text style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}>
              Produits
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
        {/* Résumé général - visible uniquement dans l'onglet Aperçu */}
        {activeTab === 'overview' && (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="trending-up" size={24} color={COLORS.primary} />
                <Text style={styles.cardTitle}>Résumé du jour</Text>
              </View>

              <View style={styles.totalRevenueContainer}>
                <Text style={styles.totalRevenueLabel}>Chiffre d'affaires total</Text>
                <Text style={styles.totalRevenueAmount}>{formatPrice(summary.total_amounts)}</Text>
              </View>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '20' }]}>
                    <Ionicons name="cart" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.summaryNumber}>{summary.purchase_count}</Text>
                  <Text style={styles.summaryLabel}>Achats</Text>
                </View>
                <View style={styles.summaryItem}>
                  <View style={[styles.iconContainer, { backgroundColor: COLORS.success + '20' }]}>
                    <Ionicons name="cash" size={20} color={COLORS.success} />
                  </View>
                  <Text style={styles.summaryNumber}>{summary.sales_count}</Text>
                  <Text style={styles.summaryLabel}>Ventes</Text>
                </View>
                <View style={styles.summaryItem}>
                  <View style={[styles.iconContainer, { backgroundColor: COLORS.accent + '20' }]}>
                    <Ionicons name="cube" size={20} color={COLORS.accent} />
                  </View>
                  <Text style={styles.summaryNumber}>{summary.total_quantitys}</Text>
                  <Text style={styles.summaryLabel}>Quantité vendue</Text>
                </View>
              </View>
            </View>

            {/* Graphique des revenus par zone */}
            {zoneChartData && (
              <View style={styles.chartCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="map" size={24} color={COLORS.primary} />
                  <Text style={styles.cardTitle}>Revenus par zone</Text>
                </View>
                <BarChart
                  data={zoneChartData}
                  width={width - 64}
                  height={220}
                  yAxisLabel="FCFA "
                  chartConfig={{
                    backgroundColor: COLORS.surface,
                    backgroundGradientFrom: COLORS.surface,
                    backgroundGradientTo: COLORS.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(65, 105, 225, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: COLORS.primary
                    }
                  }}
                  style={styles.chart}
                  verticalLabelRotation={30}
                />
              </View>
            )}
          </>
        )}

        {/* Statistiques clients - visible dans les onglets Aperçu et Clients */}
        {(activeTab === 'overview' || activeTab === 'clients') && (
          <View style={styles.clientStatsCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Collecte clients</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatPrice(clientStats.totalClientRevenue)}</Text>
                <Text style={styles.statLabel}>Revenus clients</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatPrice(clientStats.averageClientValue)}</Text>
                <Text style={styles.statLabel}>Panier moyen</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{clientStats.totalClients}</Text>
                <Text style={styles.statLabel}>Total clients</Text>
              </View>
            </View>

            {clientStats.zoneStats.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Répartition par zone</Text>
                {clientStats.zoneStats.map((zoneStat, index) => (
                  <View key={index} style={styles.zoneItem}>
                    <View style={styles.zoneInfo}>
                      <Text style={styles.zoneName}>{zoneStat.zone}</Text>
                      <Text style={styles.zoneClients}>{zoneStat.count} client(s)</Text>
                    </View>
                    <Text style={styles.zoneRevenue}>{formatPrice(zoneStat.revenue)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Statistiques produits - visible dans les onglets Aperçu et Produits */}
        {(activeTab === 'overview' || activeTab === 'products') && (
          <View style={styles.productStatsCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="cube" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Vente de produits</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatPrice(productStats.totalProductRevenue)}</Text>
                <Text style={styles.statLabel}>Revenus produits</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{productStats.remainingStock}</Text>
                <Text style={styles.statLabel}>Stock restant</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{Math.round(productStats.sellRate)}%</Text>
                <Text style={styles.statLabel}>Taux de vente</Text>
              </View>
            </View>

            {/* Graphique des produits les plus vendus */}
            {productChartData && activeTab === 'products' && (
              <>
                <Text style={styles.sectionTitle}>Top produits vendus</Text>
                <BarChart
                  data={productChartData}
                  width={width - 64}
                  height={220}
                  chartConfig={{
                    backgroundColor: COLORS.surface,
                    backgroundGradientFrom: COLORS.surface,
                    backgroundGradientTo: COLORS.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    }
                  }}
                  style={styles.chart}
                  verticalLabelRotation={30}
                />
              </>
            )}

            {productStats.topProducts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Top produits vendus</Text>
                {productStats.topProducts.map((product, index) => (
                  <View key={product.id} style={styles.topProductItem}>
                    <View style={[styles.rankBadge, 
                      index === 0 && styles.firstRank,
                      index === 1 && styles.secondRank,
                      index === 2 && styles.thirdRank]}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productSold}>{product.soldQuantity} vendus</Text>
                    </View>
                    <Text style={styles.productRevenue}>
                      {formatPrice(product.soldQuantity * product.unitPrice)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Actions - visible dans tous les onglets */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download-outline" size={20} color={COLORS.surface} />
            <Text style={styles.exportButtonText}>Exporter le rapport</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={resetData}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.error} />
            <Text style={styles.resetButtonText}>Réinitialiser les données</Text>
          </TouchableOpacity>
        </View>

        {/* Dernière mise à jour */}
        <View style={styles.lastUpdateCard}>
          <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
          <Text style={styles.lastUpdateText}>
            Dernière mise à jour: {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textLight,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.surface,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  clientStatsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  productStatsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  actionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  lastUpdateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  totalRevenueContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
  },
  totalRevenueLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  totalRevenueAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
    marginTop: 8,
  },
  zoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  zoneClients: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  zoneRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  rankBadge: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.textLight,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  firstRank: {
    backgroundColor: '#FFD700',
  },
  secondRank: {
    backgroundColor: '#C0C0C0',
  },
  thirdRank: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  productSold: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  exportButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: COLORS.surface,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  resetButtonText: {
    color: COLORS.error,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  lastUpdateText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
  }
});