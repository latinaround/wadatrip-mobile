import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { brand } from '../../theme/brand';

export default function BrandButton({ title, onPress, variant = 'primary', disabled = false, style, textStyle }) {
  const variantStyle = variant === 'secondary' ? styles.secondary : styles.primary;
  return (
    <TouchableOpacity style={[styles.base, variantStyle, disabled && styles.disabled, style]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: brand.colors.primary },
  secondary: { backgroundColor: brand.colors.secondary },
  disabled: { opacity: 0.7 },
  text: { color: '#fff', fontFamily: brand.typography.heading, letterSpacing: -0.2, fontSize: 15 },
});
