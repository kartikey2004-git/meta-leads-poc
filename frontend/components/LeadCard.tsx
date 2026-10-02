import React from 'react';
import { Text, View } from 'react-native';
import { leadCardStyles as styles } from '../styles';
import type { Lead } from '../types/lead';

interface Props {
  lead: Lead;
  isNew: boolean;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diff = Math.floor((now - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function LeadCard({ lead, isNew }: Props) {
  const hasCustomFields = lead.customFields && Object.keys(lead.customFields).length > 0;

  return (
    <View style={[styles.card, isNew && styles.cardNew]}>
      <View style={styles.header}>
        <Text style={styles.name}>{lead.name ?? '(no name)'}</Text>
        {isNew && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>New</Text>
          </View>
        )}
      </View>
      {lead.email ? <Text style={styles.detail}>{lead.email}</Text> : null}
      {lead.phone ? <Text style={styles.detail}>{lead.phone}</Text> : null}
      {hasCustomFields
        ? Object.entries(lead.customFields!).map(([k, v]) => (
            <Text key={k} style={styles.custom}>
              {k}: {String(v)}
            </Text>
          ))
        : null}
      <Text style={styles.time}>{formatTime(lead.receivedAt)}</Text>
    </View>
  );
}
