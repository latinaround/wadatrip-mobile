import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { brand } from '../../theme/brand';

export default function BrandInput(props) {
  return <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor="#94A3B8" />;
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#fdfefe',
    borderWidth: 1,
    borderColor: brand.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    color: brand.colors.text,
    fontFamily: brand.typography.body,
  },
});
