import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/types';
import { formatNaira } from '@/lib/format';
import { Palette } from '@/constants/Colors';
import { useCart } from '@/context/CartContext';

import { resolveProductImage } from '@/lib/images';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const soldOut = product.stock === 0;
  const lowStock = !soldOut && product.stock <= 5;
  const imageSource = resolveProductImage(product.image_url, product.name);

  const handlePress = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: product.id },
    });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={handlePress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageSource }}
          style={styles.image}
          resizeMode="cover"
        />

        {soldOut && (
          <View style={[styles.badge, styles.soldOutBadge]}>
            <Text style={styles.soldOutBadgeText}>Sold out</Text>
          </View>
        )}

        {lowStock && (
          <View style={[styles.badge, styles.lowStockBadge]}>
            <Text style={styles.lowStockBadgeText}>Only {product.stock} left</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {product.description || 'Fresh botanical blooms, hand-tied daily.'}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.price}>{formatNaira(product.price)}</Text>

          <TouchableOpacity
            style={[styles.addButton, soldOut && styles.addButtonDisabled]}
            disabled={soldOut}
            onPress={() => addToCart(product, 1)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={soldOut ? 'close' : 'bag-add-outline'}
              size={18}
              color={soldOut ? Palette.ink.muted : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: Palette.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Palette.line,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: Palette.sand[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.sand[100],
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  soldOutBadge: {
    backgroundColor: 'rgba(22, 33, 26, 0.85)',
  },
  soldOutBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lowStockBadge: {
    backgroundColor: Palette.bloom[500],
  },
  lowStockBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  info: {
    padding: 12,
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Palette.ink.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: Palette.ink.soft,
    lineHeight: 16,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.leaf[700],
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.leaf[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: Palette.sand[200],
  },
});
