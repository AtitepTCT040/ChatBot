import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// นำเข้าข้อมูล JSON จาก constants
import rawFaqData from '@/constants/faqData.json';

interface CleanFAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  typos: string[];
  note?: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'system';
  time: string;
  note?: string;
}

const getCurrentTime = (): string => {
  const now = new Date();
  const rawHours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const period = rawHours >= 12 ? 'PM' : 'AM';
  const hours = (rawHours % 12 || 12).toString().padStart(2, '0');
  return `${hours}:${minutes} ${period}`;
};

export default function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const flatListRef = useRef<FlatList>(null);

  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // สร้างแอนิเมชันลอยขึ้นลงสำหรับมาสคอต
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6, // ขยับขึ้นไป 6 พิกเซล
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0, // กลับมาที่เดิม
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [floatAnim]);

  const [chatHistory, setChatHistory] = useState<{ [key: string]: Message[] }>({
    home: [],
    search: [],
    paper: [],
    citation: [],
  });

  const messages = chatHistory[activeTab] || [];

  const updateCurrentMessages = (newMsgs: Message[] | ((prev: Message[]) => Message[])) => {
    setChatHistory((prev) => {
      const currentMsgs = prev[activeTab] || [];
      const updated = typeof newMsgs === 'function' ? newMsgs(currentMsgs) : newMsgs;
      return {
        ...prev,
        [activeTab]: updated,
      };
    });
  };

  const sidebarWidth = isPinned || isHovered ? 220 : 80;

  const faqList: CleanFAQItem[] = useMemo(() => {
    const dataToProcess = Array.isArray(rawFaqData) ? rawFaqData : [];
    return dataToProcess
      .map((row: any, idx: number) => {
        if (!row || typeof row !== 'object') return null;
        const question = String(row.question || row['คำถาม'] || '').trim();
        const answer = String(row.answer || row['คำตอบ'] || '').trim();
        const id = String(row.id || row['ลำดับ'] || idx + 1);
        const noteRaw = row.note || row['หมายเหตุ'];
        const note = noteRaw ? String(noteRaw).trim() : undefined;

        if (!question || !answer) return null;

        const rawKw = row.keywords || row['คีเวดหลัก'] || row['คีย์เวิร์ด'] || '';
        const keywords = Array.isArray(rawKw)
          ? rawKw.map((k) => String(k).trim().toLowerCase()).filter(Boolean)
          : String(rawKw).split(/[,;]/).map((k) => k.trim().toLowerCase()).filter(Boolean);

        const rawTypo = row.typos || row['คำที่มีโอกาสพิมพ์ผิด'] || '';
        const typos = Array.isArray(rawTypo)
          ? rawTypo.map((t) => String(t).trim().toLowerCase()).filter(Boolean)
          : String(rawTypo).split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean);

        return { id, question, answer, keywords, typos, note };
      })
      .filter((item): item is CleanFAQItem => item !== null);
  }, []);

  const findAnswer = (query: string): { answer: string; note?: string } => {
    const cleanQuery = query.trim().toLowerCase();
    const queryNoSpace = cleanQuery.replace(/[?.,()\-_\s]/g, '');

    if (['สวัสดี', 'หวัดดี', 'hello', 'hi'].some((g) => cleanQuery.includes(g))) {
      return {
        answer: 'สวัสดีครับ ผมพร้อมช่วยคุณสืบค้นระเบียบ รูปแบบเล่ม และคู่มือวิทยานิพนธ์แล้วครับ!',
      };
    }

    let bestMatch: CleanFAQItem | null = null;
    let maxScore = 0;

    faqList.forEach((item) => {
      let score = 0;
      const qLower = (item.question || '').toLowerCase();
      const qNoSpace = qLower.replace(/[?.,()\-_\s]/g, '');
      const aLower = (item.answer || '').toLowerCase();

      if (qNoSpace.includes(queryNoSpace) || queryNoSpace.includes(qNoSpace)) score += 35;

      item.keywords.forEach((kw) => {
        const kwClean = kw.replace(/\s/g, '');
        if (kwClean && (queryNoSpace.includes(kwClean) || kwClean.includes(queryNoSpace))) {
          score += 15;
        }
      });

      item.typos.forEach((typo) => {
        const typoClean = typo.replace(/\s/g, '');
        if (typoClean && (queryNoSpace.includes(typoClean) || typoClean.includes(queryNoSpace))) {
          score += 12;
        }
      });

      if (aLower.includes(queryNoSpace)) score += 3;

      if (score > maxScore) {
        maxScore = score;
        bestMatch = item;
      }
    });

    if (bestMatch && maxScore >= 6) {
      return { answer: bestMatch.answer, note: bestMatch.note };
    }

    return {
      answer: 'ไม่พบระเบียบที่ตรงกับคำค้นหา ลองใช้คำสั้นๆ เช่น "ตั้งหน้ากระดาษ", "ฟอนต์", "เลขหน้า" ดูนะครับ',
    };
  };

  const handleTabSwitch = (tabName: string, defaultQuery?: string) => {
    setActiveTab(tabName);
    setInputText('');

    const existingMsgs = chatHistory[tabName] || [];
    if (existingMsgs.length === 0 && defaultQuery) {
      setIsSearching(true);
      const currentTime = getCurrentTime();
      const userMsg: Message = {
        id: `${Date.now()}-user`,
        text: defaultQuery,
        sender: 'user',
        time: currentTime,
      };

      setChatHistory((prev) => ({
        ...prev,
        [tabName]: [userMsg],
      }));

      setTimeout(() => {
        const result = findAnswer(defaultQuery);
        const systemMsg: Message = {
          id: `${Date.now()}-system`,
          text: result.answer,
          sender: 'system',
          time: getCurrentTime(),
          note: result.note,
        };
        setChatHistory((prev) => ({
          ...prev,
          [tabName]: [...(prev[tabName] || [userMsg]), systemMsg],
        }));
        setIsSearching(false);
      }, 300);
    }
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `${Date.now()}-user`,
      text: query,
      sender: 'user',
      time: getCurrentTime(),
    };

    updateCurrentMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsSearching(true);

    setTimeout(() => {
      const result = findAnswer(query);
      const systemMsg: Message = {
        id: `${Date.now()}-system`,
        text: result.answer,
        sender: 'system',
        time: getCurrentTime(),
        note: result.note,
      };
      updateCurrentMessages((prev) => [...prev, systemMsg]);
      setIsSearching(false);
    }, 300);
  };

  const handleReset = () => {
    setChatHistory({
      home: [],
      search: [],
      paper: [],
      citation: [],
    });
    setInputText('');
    setActiveTab('home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appWrapper}>
        {/* ================= 1. COLLAPSIBLE SIDEBAR ================= */}
        <View
          style={[styles.slimSidebar, { width: sidebarWidth }]}
          {...(Platform.OS === 'web'
            ? {
                onMouseEnter: () => setIsHovered(true),
                onMouseLeave: () => setIsHovered(false),
              }
            : {})}
        >
          <View style={styles.sidebarTop}>
            <View style={styles.logoAndPinContainer}>
              <TouchableOpacity style={styles.logoBtn} onPress={() => handleTabSwitch('home')}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../../assets/images/Logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>

              {(isHovered || isPinned) && (
                <TouchableOpacity
                  style={styles.pinBtn}
                  onPress={() => setIsPinned(!isPinned)}
                >
                  <Text style={styles.pinText}>{isPinned ? '📌' : '📍'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.menuRowBtn, activeTab === 'home' && styles.menuRowActive]}
              onPress={() => handleTabSwitch('home')}
            >
              <Text style={styles.iconSymbol}>🏠</Text>
              {(isHovered || isPinned) && <Text style={styles.menuLabel}>หน้าแรก</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRowBtn, activeTab === 'search' && styles.menuRowActive]}
              onPress={() => handleTabSwitch('search', 'การตั้งค่าหน้ากระดาษ')}
            >
              <Text style={styles.iconSymbol}>🔍</Text>
              {(isHovered || isPinned) && <Text style={styles.menuLabel}>ตั้งค่าหน้ากระดาษ</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRowBtn, activeTab === 'paper' && styles.menuRowActive]}
              onPress={() => handleTabSwitch('paper', 'ใช้กระดาษอะไร')}
            >
              <Text style={styles.iconSymbol}>📄</Text>
              {(isHovered || isPinned) && <Text style={styles.menuLabel}>ชนิดกระดาษ</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuRowBtn, activeTab === 'citation' && styles.menuRowActive]}
              onPress={() => handleTabSwitch('citation', 'การอ้างอิง')}
            >
              <Text style={styles.iconSymbol}>📚</Text>
              {(isHovered || isPinned) && <Text style={styles.menuLabel}>การอ้างอิง</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.gridBtn} onPress={handleReset}>
            <Text style={styles.gridIcon}>↺</Text>
            {(isHovered || isPinned) && <Text style={styles.resetLabel}>ล้างข้อมูล</Text>}
          </TouchableOpacity>
        </View>

        {/* ================= 2. MAIN WORKSPACE ================= */}
        <View style={styles.mainCanvas}>
          {/* Top Navbar */}
          <View style={styles.topNavbar}>
            <View style={styles.guideBadge}>
              <Text style={styles.guideBadgeIcon}>📘</Text>
              <Text style={styles.guideBadgeTitle}>คู่มือวิทยานิพนธ์ฉบับทางการ</Text>
            </View>

            <Text style={styles.brandCenter}>LeO - ระบบสืบค้นข้อมูล</Text>

            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>เริ่มค้นหาใหม่ ↺</Text>
            </TouchableOpacity>
          </View>

          {/* Workspace Body */}
          <KeyboardAvoidingView
            style={styles.workspaceBody}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {messages.length === 0 ? (
              <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>
                  ระบบสืบค้น <Text style={styles.heroBold}>คู่มือและระเบียบ</Text>
                </Text>
                <Text style={styles.heroSubtitle}>การจัดทำวิทยานิพนธ์และงานวิจัย</Text>

                <View style={styles.handbookGraphic}>
                  {/* กรอบวงกลมพร้อมแอนิเมชันมาสคอตขยับขึ้นลง */}
                  <Animated.View
                    style={[
                      styles.mascotCircleWrapper,
                      { transform: [{ translateY: floatAnim }] },
                    ]}
                  >
                    <Image
                      source={require('../../assets/images/mascotlogo.png')}
                      style={styles.mascotImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </View>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatListContent}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                renderItem={({ item }) => {
                  const isUser = item.sender === 'user';
                  return (
                    <View style={[styles.msgWrapper, isUser ? styles.msgRight : styles.msgLeft]}>
                      <View style={[styles.bubbleCard, isUser ? styles.userBubbleCard : styles.systemBubbleCard]}>
                        <Text style={[styles.bubbleTxt, isUser ? styles.userBubbleTxt : styles.systemBubbleTxt]}>
                          {item.text}
                        </Text>
                        {item.note && (
                          <View style={styles.refBox}>
                            <Text style={styles.refTitle}>📌 แหล่งอ้างอิง:</Text>
                            <Text style={styles.refTxt}>{item.note}</Text>
                          </View>
                        )}
                        <Text style={[styles.timeLabel, isUser ? styles.userTimeLabel : styles.systemTimeLabel]}>
                          {item.time}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {isSearching && (
              <View style={styles.searchingRow}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.searchingTxt}>มาสคอตกำลังค้นหาข้อกำหนดให้คุณอยู่ครับ...</Text>
              </View>
            )}

            {/* ================= 3. FLOATING SEARCH CARD ================= */}
            <View style={styles.bottomCardWrapper}>
              <View style={styles.promptFloatingCard}>
                <View style={styles.inputAreaRow}>
                  <Text style={styles.inputSearchIcon}>🔍</Text>
                  <TextInput
                    style={styles.textInputField}
                    placeholder="พิมพ์คำถาม หรือหัวข้อระเบียบที่ต้องการสืบค้น..."
                    placeholderTextColor="#94A3B8"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={() => handleSend()}
                    returnKeyType="search"
                  />
                </View>

                <View style={styles.toolbarRow}>
                  <View style={styles.toolbarLeft}>
                    <TouchableOpacity style={styles.actionPill} onPress={() => handleSend('การตั้งค่าหน้ากระดาษ')}>
                      <Text style={styles.actionPillText}>📐 ตั้งค่าหน้ากระดาษ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionPill} onPress={() => handleSend('ฟอนต์ภาษาไทย')}>
                      <Text style={styles.actionPillText}>🔠 รูปแบบฟอนต์</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionPill} onPress={() => handleSend('การลำดับหน้า')}>
                      <Text style={styles.actionPillText}>🔢 การใส่เลขหน้า</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionPill} onPress={() => handleSend('ใช้กระดาษอะไร')}>
                      <Text style={styles.actionPillText}>📄 ชนิดกระดาษ</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.toolbarRight}>
                    <TouchableOpacity
                      style={[styles.sendCircleBtn, !inputText.trim() && styles.sendCircleDisabled]}
                      onPress={() => handleSend()}
                      disabled={!inputText.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.sendArrowIcon}>➤</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EEF2FF',
  },
  appWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  slimSidebar: {
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  sidebarTop: {
    gap: 12,
  },
  logoAndPinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoBtn: {},
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#93C5FD',
    overflow: 'hidden',
  },
  logoImage: {
    width: 24,
    height: 24,
  },
  pinBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  pinText: {
    fontSize: 14,
  },
  menuRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRowActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  iconSymbol: {
    fontSize: 16,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  gridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 12,
  },
  gridIcon: {
    fontSize: 18,
    color: '#64748B',
    width: 24,
    textAlign: 'center',
  },
  resetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  mainCanvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topNavbar: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  guideBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 6,
  },
  guideBadgeIcon: {
    fontSize: 13,
  },
  guideBadgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  brandCenter: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  resetBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  workspaceBody: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  heroTitle: {
    fontSize: 28,
    color: '#334155',
    fontWeight: '400',
    letterSpacing: -0.5,
  },
  heroBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 4,
    marginBottom: 16,
  },
  handbookGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  mascotCircleWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#93C5FD',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  mascotImage: {
    width: 80,
    height: 80,
  },
  chatListContent: {
    paddingVertical: 16,
    gap: 14,
  },
  msgWrapper: {
    width: '100%',
    flexDirection: 'row',
  },
  msgRight: {
    justifyContent: 'flex-end',
  },
  msgLeft: {
    justifyContent: 'flex-start',
  },
  bubbleCard: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubbleCard: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 2,
  },
  systemBubbleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderBottomLeftRadius: 2,
    shadowColor: '#3B82F6',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  bubbleTxt: {
    fontSize: 14,
    lineHeight: 22,
  },
  userBubbleTxt: {
    color: '#FFFFFF',
  },
  systemBubbleTxt: {
    color: '#0F172A',
  },
  refBox: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
  },
  refTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  timeLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimeLabel: {
    color: '#BFDBFE',
    textAlign: 'right',
  },
  systemTimeLabel: {
    color: '#94A3B8',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  searchingTxt: {
    fontSize: 12,
    color: '#3B82F6',
    fontStyle: 'italic',
  },
  bottomCardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  promptFloatingCard: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  inputAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  inputSearchIcon: {
    fontSize: 14,
    color: '#64748B',
  },
  textInputField: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 36,
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none',
          outlineWidth: 0,
        }
      : {}),
  } as any,
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  actionPill: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  actionPillText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '500',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendCircleDisabled: {
    backgroundColor: '#CBD5E1',
  },
  sendArrowIcon: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});