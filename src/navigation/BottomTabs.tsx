import { BarChart3, CalendarRange, Home, ListChecks, Timer } from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../types';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { QtsScreen } from '../features/qts/QtsScreen';
import { RoutinesScreen } from '../features/routines/RoutinesScreen';
import { StatsScreen } from '../features/stats/StatsScreen';
import { StudyScreen } from '../features/study/StudyScreen';
import { colors, radii, spacing } from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          position: 'absolute',
          left: spacing.lg,
          right: spacing.lg,
          bottom: spacing.lg,
          height: 72,
          paddingTop: 7,
          paddingBottom: spacing.md,
          backgroundColor: 'rgba(18, 20, 25, 0.96)',
          borderTopWidth: 0,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 16,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Qts"
        component={QtsScreen}
        options={{
          title: 'QTS',
          tabBarIcon: ({ color, size }) => <CalendarRange color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Routines"
        component={RoutinesScreen}
        options={{
          title: 'Rotinas',
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Study"
        component={StudyScreen}
        options={{
          title: 'Estudo',
          tabBarIcon: ({ color, size }) => <Timer color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Estatisticas',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
