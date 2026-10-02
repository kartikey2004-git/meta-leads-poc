import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StatusBar, Text, View } from 'react-native';
import { appStyles as styles, colors } from './styles';
import ConnectionStatus from './components/ConnectionStatus';
import LeadCard from './components/LeadCard';
import { fetchLeads } from './services/api';
import { createWebSocketService, type WsStatus } from './services/websocket';
import type { Lead } from './types/lead';
import { WS_URL } from './config';

type DisplayLead = Lead & { _isNew: boolean };

function mergeLeads(prev: DisplayLead[], fetched: Lead[]): DisplayLead[] {
  const fetchedIds = new Set(fetched.map((l) => l.id));
  const localNew = prev.filter((l) => l._isNew && !fetchedIds.has(l.id));
  const fetchedDisplay = fetched.map((l) => ({ ...l, _isNew: false }));
  return [...localNew, ...fetchedDisplay];
}

export default function App() {
  const [leads, setLeads] = useState<DisplayLead[]>([]);
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  const loadLeads = useCallback(async (merge: boolean, refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    try {
      const fetched = await fetchLeads();
      setFetchError(false);
      if (merge) {
        setLeads((prev) => mergeLeads(prev, fetched));
      } else {
        setLeads(fetched.map((l) => ({ ...l, _isNew: false })));
      }
    } catch {
      setFetchError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLeads(false);
  }, [loadLeads]);

  useEffect(() => {
    const service = createWebSocketService({
      url: WS_URL,
      onLeadCreated: (lead) => {
        setLeads((prev) => {
          if (prev.some((l) => l.id === lead.id)) return prev;
          return [{ ...lead, _isNew: true }, ...prev];
        });
      },
      onStatusChange: setStatus,
      onReconnect: () => loadLeads(true),
    });
    return () => service.destroy();
  }, [loadLeads]);

  const renderItem = ({ item }: { item: DisplayLead }) => (
    <LeadCard lead={item} isNew={item._isNew} />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.loadingText}>Loading leads...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        <ConnectionStatus status={status} />
      </View>
      {fetchError ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Couldn't load leads.</Text>
          <Pressable onPress={() => loadLeads(false)} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : leads.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No leads yet.</Text>
          <Text style={styles.emptySubtitle}>
            Submit a test lead from Meta's{'\n'}Lead Testing Tool.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.count}>
            {leads.length} {leads.length === 1 ? 'lead' : 'leads'}
          </Text>
          <FlatList
            data={leads}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            onRefresh={() => loadLeads(false, true)}
            refreshing={isRefreshing}
          />
        </>
      )}
    </View>
  );
}
