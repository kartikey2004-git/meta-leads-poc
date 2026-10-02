import { StatusBar, StyleSheet } from 'react-native';

export const colors = {
  bg: '#f8f9fa',
  white: '#ffffff',
  border: '#e5e7eb',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  blue: '#3b82f6',
  blueBg: '#dbeafe',
  blueDark: '#1d4ed8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

export const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: (StatusBar.currentHeight || 0) + 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  count: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textMuted,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.blue,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

export const leadCardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNew: {
    borderLeftWidth: 3,
    borderLeftColor: colors.blue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.blueBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.blueDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  custom: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
});

export const connectionStatusStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
