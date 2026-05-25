import { useCallback, useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Database, Download, HardDrive, ListChecks, ShieldCheck, Trash2, WifiOff } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { MetricCard } from '../../components/MetricCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { clearDatabase, countLogs, exportDatabaseSnapshot, getAllRoutines, getRoutines } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';

export function SettingsScreen() {
  const [totalRoutines, setTotalRoutines] = useState(0);
  const [activeRoutines, setActiveRoutines] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  const loadSettings = useCallback(async () => {
    const [currentRoutines, allRoutines, logsCount] = await Promise.all([getRoutines(true), getAllRoutines(), countLogs()]);

    setTotalRoutines(allRoutines.length);
    setActiveRoutines(currentRoutines.filter((routine) => routine.is_active === 1).length);
    setTotalLogs(logsCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  function handleClearData() {
    Alert.alert('Apagar dados locais', 'Isso remove rotinas e historico salvos neste aparelho. Use apenas se quiser recomecar do zero.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await clearDatabase();
          await loadSettings();
        },
      },
    ]);
  }

  async function handleExportBackup() {
    try {
      const snapshot = await exportDatabaseSnapshot();
      await Share.share({
        title: 'Backup Controle de Habitos',
        message: snapshot,
      });
    } catch (err) {
      Alert.alert('Backup nao gerado', err instanceof Error ? err.message : 'Nao foi possivel exportar os dados locais.');
    }
  }

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
        <Text style={styles.subtitle}>Banco local e preferencias do app</Text>
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusTop}>
          <View style={styles.statusIcon}>
            <Database color={colors.secondary} size={26} strokeWidth={2.4} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>SQLite local</Text>
            <Text style={styles.statusText}>Dados persistem no dispositivo e funcionam offline.</Text>
          </View>
        </View>

        <View style={styles.pillRow}>
          <InfoPill icon={WifiOff} label="Offline" />
          <InfoPill icon={ShieldCheck} label="Sem Supabase" />
          <InfoPill icon={HardDrive} label="Persistente" />
        </View>
      </Card>

      <View style={styles.metricRow}>
        <MetricCard label="Rotinas" value={`${totalRoutines}`} detail={`${activeRoutines} ativas atuais`} icon={ListChecks} accent={colors.primary} />
        <MetricCard label="Registros" value={`${totalLogs}`} detail="Logs salvos" icon={Database} accent={colors.success} />
      </View>

      <Card style={styles.dataCard}>
        <SectionHeader title="Backup local" subtitle="Exportacao JSON do estado atual" />
        <PrimaryButton label="Exportar backup" icon={Download} onPress={handleExportBackup} />
      </Card>

      <Card style={styles.dataCard}>
        <SectionHeader title="Dados locais" subtitle="Acoes aplicadas apenas neste aparelho" />
        <PrimaryButton label="Apagar todos os dados" icon={Trash2} variant="danger" onPress={handleClearData} />
      </Card>
    </Screen>
  );
}

function InfoPill({ icon: Icon, label }: { icon: typeof WifiOff; label: string }) {
  return (
    <View style={styles.pill}>
      <Icon color={colors.secondary} size={15} strokeWidth={2.4} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
    paddingBottom: 116,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
  },
  statusCard: {
    gap: spacing.lg,
  },
  statusTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statusIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(38, 217, 255, 0.13)',
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
  },
  statusText: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  pillText: {
    color: colors.text,
    fontSize: typography.tiny,
    fontWeight: '800',
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dataCard: {
    gap: spacing.md,
  },
});
