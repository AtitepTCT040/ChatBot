import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          // ซ่อนแถบเมนูด้านล่างถาวร ดันลงไปข้างล่างสุดและปิดการแสดงผล
          tabBarStyle: styles.hiddenTabBar,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: '' }}
        />
        <Tabs.Screen
          name="explore"
          options={{ title: '' }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  hiddenTabBar: {
    position: 'absolute',
    bottom: -100, // ดันตกขอบจอลงไปเลย
    left: 0,
    right: 0,
    height: 0,
    opacity: 0, // ซ่อนความโปร่งใส
    display: 'none', // ปิดการแสดงผล
  },
});