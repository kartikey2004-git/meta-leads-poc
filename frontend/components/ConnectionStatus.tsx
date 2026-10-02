import React from 'react';
import { Text, View } from 'react-native';
import { connectionStatusStyles as styles } from '../styles';
import type { WsStatus } from '../services/websocket';

interface Props {
  status: WsStatus;
}

const STATUS_CONFIG: Record<WsStatus, { label: string; color: string }> = {
  connected: { label: 'Live', color: '#22c55e' },
  connecting: { label: 'Connecting...', color: '#f59e0b' },
  offline: { label: 'Offline', color: '#ef4444' },
};

export default function ConnectionStatus({ status }: Props) {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}
