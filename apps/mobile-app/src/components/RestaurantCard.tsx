import React from 'react';
import {View, Text, Image, TouchableOpacity, StyleSheet} from 'react-native';
import {Restaurant} from '../types';

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
}

/**
 * Restaurant Card Component
 * Reusable component for displaying restaurant information
 */
export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {restaurant.imageUrl && (
        <Image source={{uri: restaurant.imageUrl}} style={styles.image} />
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{restaurant.name}</Text>
        <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
        <View style={styles.meta}>
          <Text style={styles.rating}>⭐ {restaurant.rating}</Text>
          <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
          {restaurant.distance && (
            <Text style={styles.distance}>
              {restaurant.distance.toFixed(1)} km
            </Text>
          )}
        </View>
        <Text style={styles.address} numberOfLines={1}>
          {restaurant.address}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: '#E0E0E0',
  },
  info: {
    padding: 15,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  cuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  rating: {
    fontSize: 14,
    color: '#FF6B6B',
    marginRight: 10,
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  distance: {
    fontSize: 14,
    color: '#999',
  },
  address: {
    fontSize: 13,
    color: '#999',
  },
});
