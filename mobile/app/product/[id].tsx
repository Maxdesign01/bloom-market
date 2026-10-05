import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { formatNaira } from '@/lib/format';
import { Palette } from '@/constants/Colors';
import { useCart } from '@/context/CartContext';
import { resolveProductImage } from '@/lib/images';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (data) {
          setProduct(data as Product);
        }
      } catch (err) {
        console.warn('Error loading product', err);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Palette.leaf[700]} />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Bloom not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const soldOut = product.stock === 0;
  const imageUri = resolveProductImage(product.image_url, product.name);

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

          {/* Floating Header */}
          <SafeAreaView style={styles.headerFloating}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={Palette.ink.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => router.push('/(tabs)/cart')}
              activeOpacity={0.8}
            >
              <Ionicons name="bag-handle-outline" size={20} color={Palette.ink.primary} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Content Details */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            {soldOut ? (
              <View style={[styles.badge, styles.soldOutBadge]}>
                <Text style={styles.badgeText}>Sold out</Text>
              </View>
            ) : product.stock <= 5 ? (
              <View style={[styles.badge, styles.lowStockBadge]}>
                <Text style={styles.badgeText}>Only {product.stock} left</Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.inStockBadge]}>
                <Text style={styles.inStockText}>In stock</Text>
              </View>
            )}
          </View>

          <Text style={styles.price}>{formatNaira(product.price)}</Text>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionHeading}>About these blooms</Text>
          <Text style={styles.description}>
            {product.description ||
              'Fresh botanical flowers conditioned by hand and hand-tied every morning. Delivered across Lagos in signature insulated packaging.'}
          </Text>

          {/* Features Highlights */}
          <View style={styles.featureBox}>
            <View style={styles.featureItem}>
              <Ionicons name="leaf-outline" size={20} color={Palette.leaf[700]} />
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>Freshness Guaranteed</Text>
                <Text style={styles.featureSub}>Cut fresh and lasts 7+ days</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="car-outline" size={20} color={Palette.leaf[700]} />
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>Next-Day Lagos Delivery</Text>
                <Text style={styles.featureSub}>Island & Mainland coverage</Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <Ionicons name="gift-outline" size={20} color={Palette.leaf[700]} />
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>Complimentary Note Card</Text>
                <Text style={styles.featureSub}>Add a handwritten note at checkout</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      <SafeAreaView style={styles.bottomBarSafe}>
        <View style={styles.bottomBar}>
          {!soldOut && (
            <View style={styles.quantityPicker}>
              <TouchableOpacity
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={styles.pickerBtn}
              >
                <Ionicons name="remove" size={18} color={Palette.ink.primary} />
              </TouchableOpacity>
              <Text style={styles.pickerQty}>{quantity}</Text>
              <TouchableOpacity
                onPress={() =>
                  setQuantity((q) =>
                    product.stock > 0 ? Math.min(product.stock, q + 1) : q + 1
                  )
                }
                style={styles.pickerBtn}
              >
                <Ionicons name="add" size={18} color={Palette.ink.primary} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.actionButton,
              soldOut && styles.actionButtonDisabled,
              added && styles.actionButtonAdded,
            ]}
            disabled={soldOut}
            onPress={handleAddToCart}
            activeOpacity={0.88}
          >
            <Ionicons
              name={added ? 'checkmark-circle' : 'bag-add-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.actionButtonText}>
              {soldOut
                ? 'Out of Stock'
                : added
                ? 'Added to Basket ✓'
                : `Add to Basket • ${formatNaira(product.price * quantity)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.canvas,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 18,
    color: Palette.ink.primary,
    marginBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Palette.leaf[700],
    borderRadius: 20,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    width: '100%',
    height: 380,
    backgroundColor: Palette.sand[200],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerFloating: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  body: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Palette.canvas,
    marginTop: -20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Palette.ink.primary,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  soldOutBadge: {
    backgroundColor: Palette.ink.muted,
  },
  lowStockBadge: {
    backgroundColor: Palette.bloom[500],
  },
  inStockBadge: {
    backgroundColor: Palette.leaf[100],
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  inStockText: {
    color: Palette.leaf[800],
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: Palette.leaf[700],
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.line,
    marginVertical: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Palette.ink.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Palette.ink.soft,
    lineHeight: 22,
    marginBottom: 20,
  },
  featureBox: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 18,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink.primary,
  },
  featureSub: {
    fontSize: 12,
    color: Palette.ink.soft,
    marginTop: 2,
  },
  bottomBarSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.sand[100],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    paddingHorizontal: 4,
    height: 48,
  },
  pickerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerQty: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.ink.primary,
    paddingHorizontal: 8,
  },
  actionButton: {
    flex: 1,
    height: 48,
    backgroundColor: Palette.leaf[700],
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: Palette.sand[400],
  },
  actionButtonAdded: {
    backgroundColor: Palette.bloom[600],
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
