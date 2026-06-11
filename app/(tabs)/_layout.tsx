import { Tabs } from 'expo-router';
import { Text } from 'react-native';

type TabIconProps = {
  symbol: string;
  color: string;
};

const TabIcon = ({ symbol, color }: TabIconProps) => (
  <Text style={{ fontSize: 18, color, lineHeight: 22 }}>{symbol}</Text>
);

type TabLabelProps = {
  label: string;
  color: string;
  focused: boolean;
};

const TabLabel = ({ label, color, focused }: TabLabelProps) => (
  <Text
    style={{
      fontSize: 11,
      color,
      fontWeight: focused ? '600' : '500',
    }}
  >
    {label}
  </Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A2A30',
        tabBarInactiveTintColor: '#8A8074',
        tabBarStyle: {
          backgroundColor: 'rgba(250,248,245,0.92)',
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(26,42,48,0.12)',
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <TabIcon symbol="◉" color={color} />,
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          tabBarIcon: ({ color }) => <TabIcon symbol="▰" color={color} />,
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Lessons" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ color }) => <TabIcon symbol="✺" color={color} />,
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="Marco" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <TabIcon symbol="○" color={color} />,
          tabBarLabel: ({ color, focused }) => (
            <TabLabel label="You" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
