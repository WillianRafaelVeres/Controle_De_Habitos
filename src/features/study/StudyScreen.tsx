import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { BookOpenCheck, Pause, Play, Square } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SectionHeader } from '../../components/SectionHeader';
import { TextField } from '../../components/TextField';
import { createStudySession, getStudyActivities, getStudySessionsForRange } from '../../database';
import { colors, radii, spacing, typography } from '../../theme';
import type { Activity, StudySession } from '../../types';
import { todayKey } from '../../utils/date';

const PRESETS = [
  { label: '20/5', focus: 20, break: 5 },
  { label: '25/5', focus: 25, break: 5 },
  { label: '50/10', focus: 50, break: 10 },
  { label: 'Personalizado', focus: 30, break: 5 },
];

type TimerPhase = 'focus' | 'break' | 'finished';

type ActiveSession = {
  activity: Activity | null;
  activityName: string;
  plannedFocusMinutes: number;
  plannedBreakMinutes: number;
  startedAtIso: string;
  phase: TimerPhase;
  phaseStartedAtMs: number;
  pausedAtMs: number | null;
  pausedTotalMs: number;
  focusStudyMs: number;
  focusBreaksCount: number;
};

export function StudyScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [sessionsToday, setSessionsToday] = useState<StudySession[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [manualActivityName, setManualActivityName] = useState('Estudo livre');
  const [presetIndex, setPresetIndex] = useState(1);
  const [customFocus, setCustomFocus] = useState('30');
  const [customBreak, setCustomBreak] = useState('5');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [tick, setTick] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const breakWarningRef = useRef(false);

  const selectedPreset = PRESETS[presetIndex];
  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? null;

  const loadStudyData = useCallback(async () => {
    const [studyActivities, todaySessions] = await Promise.all([getStudyActivities(), getStudySessionsForRange(todayKey(), todayKey())]);

    setActivities(studyActivities);
    setSessionsToday(todaySessions);
    setSelectedActivityId((current) => current ?? studyActivities[0]?.id ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStudyData();
    }, [loadStudyData]),
  );

  useEffect(() => {
    if (!activeSession || activeSession.phase === 'finished' || activeSession.pausedAtMs) {
      return undefined;
    }

    const id = setInterval(() => setTick((value) => value + 1), 1000);

    return () => clearInterval(id);
  }, [activeSession]);

  const timerState = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    const durationMs = (activeSession.phase === 'focus' ? activeSession.plannedFocusMinutes : activeSession.plannedBreakMinutes) * 60 * 1000;
    const nowMs = activeSession.pausedAtMs ?? Date.now();
    const elapsedMs = Math.max(0, nowMs - activeSession.phaseStartedAtMs - activeSession.pausedTotalMs);
    const remainingMs = activeSession.phase === 'finished' ? 0 : Math.max(0, durationMs - elapsedMs);
    const percentage = durationMs > 0 ? Math.min(100, Math.round((elapsedMs / durationMs) * 100)) : 100;

    return {
      elapsedMs,
      remainingMs,
      percentage,
      durationMs,
    };
  }, [activeSession, tick]);

  useEffect(() => {
    if (!activeSession || !timerState || activeSession.pausedAtMs || activeSession.phase === 'finished') {
      return;
    }

    if (timerState.remainingMs > 0) {
      return;
    }

    if (activeSession.phase === 'focus') {
      Alert.alert('Periodo de estudo concluido', 'Hora de iniciar a pausa.');
      setActiveSession({
        ...activeSession,
        phase: 'break',
        phaseStartedAtMs: Date.now(),
        pausedAtMs: null,
        pausedTotalMs: 0,
        focusStudyMs: activeSession.plannedFocusMinutes * 60 * 1000,
      });
      return;
    }

    Alert.alert('Pausa concluida', 'Sessao pronta para finalizar ou reiniciar.');
    setActiveSession({
      ...activeSession,
      phase: 'finished',
      phaseStartedAtMs: Date.now(),
      pausedAtMs: null,
      pausedTotalMs: 0,
    });
  }, [activeSession, timerState]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (!activeSession || activeSession.phase !== 'focus' || activeSession.pausedAtMs) {
        return;
      }

      if (previousState === 'active' && nextState.match(/inactive|background/)) {
        breakWarningRef.current = true;
        setActiveSession((current) =>
          current && current.phase === 'focus'
            ? {
                ...current,
                focusBreaksCount: current.focusBreaksCount + 1,
              }
            : current,
        );
      }

      if (previousState.match(/inactive|background/) && nextState === 'active' && breakWarningRef.current) {
        breakWarningRef.current = false;
        Alert.alert('Modo foco interrompido', 'Voce saiu do app durante o estudo.');
      }
    });

    return () => subscription.remove();
  }, [activeSession]);

  function startStudy() {
    const focusMinutes = selectedPreset.label === 'Personalizado' ? parsePositiveMinute(customFocus, 30) : selectedPreset.focus;
    const breakMinutes = selectedPreset.label === 'Personalizado' ? parsePositiveMinute(customBreak, 5) : selectedPreset.break;
    const activityName = selectedActivity?.name ?? manualActivityName.trim() || 'Estudo livre';

    setActiveSession({
      activity: selectedActivity,
      activityName,
      plannedFocusMinutes: focusMinutes,
      plannedBreakMinutes: breakMinutes,
      startedAtIso: new Date().toISOString(),
      phase: 'focus',
      phaseStartedAtMs: Date.now(),
      pausedAtMs: null,
      pausedTotalMs: 0,
      focusStudyMs: 0,
      focusBreaksCount: 0,
    });
  }

  function pauseStudy() {
    setActiveSession((current) => (current && !current.pausedAtMs && current.phase !== 'finished' ? { ...current, pausedAtMs: Date.now() } : current));
  }

  function resumeStudy() {
    setActiveSession((current) => {
      if (!current?.pausedAtMs) {
        return current;
      }

      return {
        ...current,
        pausedTotalMs: current.pausedTotalMs + Date.now() - current.pausedAtMs,
        pausedAtMs: null,
      };
    });
  }

  async function finishStudy(completed = true) {
    if (!activeSession) {
      return;
    }

    const currentFocusMs =
      activeSession.phase === 'focus' && timerState
        ? Math.min(timerState.elapsedMs, activeSession.plannedFocusMinutes * 60 * 1000)
        : 0;
    const actualStudySeconds = Math.round((activeSession.focusStudyMs + currentFocusMs) / 1000);

    await createStudySession({
      activity: activeSession.activity,
      activityName: activeSession.activityName,
      plannedFocusMinutes: activeSession.plannedFocusMinutes,
      plannedBreakMinutes: activeSession.plannedBreakMinutes,
      actualStudySeconds,
      focusBreaksCount: activeSession.focusBreaksCount,
      completed,
      startedAt: activeSession.startedAtIso,
      endedAt: new Date().toISOString(),
    });

    setActiveSession(null);
    await loadStudyData();
  }

  const todayStudySeconds = sessionsToday.reduce((sum, session) => sum + session.actual_study_seconds, 0);

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Estudo</Text>
        <Text style={styles.subtitle}>Cronometro com registro local</Text>
      </View>

      {activeSession ? (
        <TimerCard activeSession={activeSession} timerState={timerState} onPause={pauseStudy} onResume={resumeStudy} onFinish={() => finishStudy(true)} />
      ) : (
        <>
          <Card style={styles.cardGap}>
            <SectionHeader title="Atividade" subtitle="Use rotinas do tipo estudo ou registre livremente" />
            {activities.length === 0 ? (
              <TextField label="Nome da atividade" value={manualActivityName} onChangeText={setManualActivityName} placeholder="Ex.: CNPI" />
            ) : (
              <View style={styles.activityGroups}>
                {groupActivitiesByCategory(activities).map((group) => (
                  <View key={group.label} style={styles.activityGroup}>
                    <Text style={styles.activityGroupTitle}>{group.label}</Text>
                    <View style={styles.activityGrid}>
                      {group.activities.map((activity) => {
                        const selected = activity.id === selectedActivityId;
                        const accent = activity.color ?? activity.category_color ?? colors.secondary;

                        return (
                          <Pressable
                            key={activity.id}
                            onPress={() => setSelectedActivityId(activity.id)}
                            style={[styles.activityPill, selected && { borderColor: accent, backgroundColor: `${accent}18` }]}
                          >
                            <Text style={[styles.activityText, selected && styles.activePillText]} numberOfLines={1}>
                              {activity.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card style={styles.cardGap}>
            <SectionHeader title="Modelo" subtitle="Estudo / pausa" />
            <View style={styles.presetGrid}>
              {PRESETS.map((preset, index) => {
                const selected = index === presetIndex;

                return (
                  <Pressable key={preset.label} onPress={() => setPresetIndex(index)} style={[styles.presetButton, selected && styles.presetActive]}>
                    <Text style={[styles.presetLabel, selected && styles.activePillText]}>{preset.label}</Text>
                    <Text style={styles.presetDetail}>{preset.focus} min / {preset.break} min</Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedPreset.label === 'Personalizado' ? (
              <View style={styles.customGrid}>
                <TextField label="Estudo" value={customFocus} onChangeText={setCustomFocus} keyboardType="number-pad" />
                <TextField label="Pausa" value={customBreak} onChangeText={setCustomBreak} keyboardType="number-pad" />
              </View>
            ) : null}

            <PrimaryButton label="Iniciar estudo" icon={Play} onPress={startStudy} />
          </Card>
        </>
      )}

      <Card style={styles.cardGap}>
        <SectionHeader title="Hoje" subtitle="Tempo registrado" />
        <Text style={styles.studyValue}>{formatDuration(todayStudySeconds)}</Text>
        {sessionsToday.length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="Sem sessoes hoje" subtitle="As sessoes finalizadas aparecem aqui." />
        ) : (
          <View style={styles.sessionList}>
            {sessionsToday.slice(-4).reverse().map((session) => (
              <View key={session.id} style={styles.sessionRow}>
                <Text style={styles.sessionName} numberOfLines={1}>{session.activity_name_snapshot}</Text>
                <Text style={styles.sessionValue}>{formatDuration(session.actual_study_seconds)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function TimerCard({
  activeSession,
  timerState,
  onPause,
  onResume,
  onFinish,
}: {
  activeSession: ActiveSession;
  timerState: { remainingMs: number; percentage: number } | null;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
}) {
  const isPaused = Boolean(activeSession.pausedAtMs);
  const phaseLabel = activeSession.phase === 'focus' ? 'Estudo' : activeSession.phase === 'break' ? 'Pausa' : 'Concluido';

  return (
    <Card style={styles.timerCard}>
      <Text style={styles.timerActivity}>{activeSession.activityName}</Text>
      <Text style={styles.timerPhase}>{phaseLabel}</Text>
      <Text style={styles.timerValue}>{formatClock(timerState?.remainingMs ?? 0)}</Text>
      <ProgressBar value={timerState?.percentage ?? 0} height={8} color={activeSession.phase === 'break' ? colors.warning : colors.secondary} />
      <Text style={styles.focusBreaks}>Quebras de foco: {activeSession.focusBreaksCount}</Text>
      <View style={styles.timerActions}>
        {isPaused ? (
          <PrimaryButton label="Continuar" icon={Play} onPress={onResume} style={styles.timerButton} />
        ) : (
          <PrimaryButton label="Pausar" icon={Pause} variant="secondary" onPress={onPause} style={styles.timerButton} />
        )}
        <PrimaryButton label="Finalizar" icon={Square} variant="danger" onPress={onFinish} style={styles.timerButton} />
      </View>
    </Card>
  );
}

function parsePositiveMinute(value: string, fallback: number) {
  const parsed = Number(value.replace(/\D/g, ''));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(240, parsed);
}

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes}min`;
  }

  return `${hours}h ${String(minutes).padStart(2, '0')}min`;
}

function groupActivitiesByCategory(activities: Activity[]) {
  const groups = new Map<string, { label: string; activities: Activity[] }>();

  for (const activity of activities) {
    const label = activity.category_name ?? activity.category ?? 'Geral';
    const group = groups.get(label) ?? { label, activities: [] };

    group.activities.push(activity);
    groups.set(label, group);
  }

  return [...groups.values()];
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
  cardGap: {
    gap: spacing.md,
  },
  activityGroups: {
    gap: spacing.md,
  },
  activityGroup: {
    gap: spacing.sm,
  },
  activityGroupTitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  activityPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
    maxWidth: '100%',
  },
  activePill: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
  },
  activityText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '800',
  },
  activePillText: {
    color: colors.text,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  presetButton: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '47%',
    padding: spacing.md,
    backgroundColor: 'rgba(161, 161, 170, 0.06)',
  },
  presetActive: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(20, 184, 166, 0.14)',
  },
  presetLabel: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '900',
  },
  presetDetail: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  customGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timerCard: {
    alignItems: 'center',
    gap: spacing.md,
  },
  timerActivity: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: '900',
    textAlign: 'center',
  },
  timerPhase: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  timerValue: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '900',
  },
  focusBreaks: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
  timerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  timerButton: {
    flex: 1,
  },
  studyValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  sessionList: {
    gap: spacing.sm,
  },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sessionName: {
    color: colors.text,
    flex: 1,
    fontSize: typography.small,
    fontWeight: '800',
  },
  sessionValue: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '900',
  },
});
