import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Account } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

export function AccountPicker({ visible, accounts, selectedId, onSelect, onClose }: {
  visible: boolean;
  accounts: Account[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: palette.panel, paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={[styles.sheetHandle, { backgroundColor: palette.lineStrong }]} />
        <Text style={[styles.sheetEyebrow, { color: palette.green }]}>TRADING ACCOUNT</Text>
        <Text style={[styles.sheetTitle, { color: palette.text }]}>Choose portfolio</Text>
        <View style={styles.accountRows}>{accounts.map((account) => {
          const active = account.id === selectedId;
          return <Pressable key={account.id} onPress={() => onSelect(account.id)} style={[styles.accountRow, { borderColor: active ? palette.green : palette.line, backgroundColor: active ? palette.greenSoft : palette.panelStrong }]}>
            <View style={[styles.exchangeIcon, { backgroundColor: palette.canvasRaised }]}><Text style={[styles.exchangeInitial, { color: palette.text }]}>{account.exchange.slice(0, 1)}</Text></View>
            <View style={styles.accountCopy}><Text style={[styles.accountName, { color: palette.text }]}>{account.name}</Text><Text style={[styles.accountExchange, { color: palette.textSoft }]}>{account.exchange}</Text></View>
            <View style={[styles.statusDot, { backgroundColor: account.is_trading ? palette.green : palette.amber }]} />
            {active ? <Ionicons name="checkmark-circle" size={22} color={palette.green} /> : null}
          </Pressable>;
        })}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: { paddingHorizontal: spacing(2), paddingTop: spacing(1), borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing(2.5) },
  sheetEyebrow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.8 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -1, marginTop: 4 },
  accountRows: { gap: spacing(1), marginTop: spacing(2) },
  accountRow: { borderWidth: 1, borderRadius: radius.control, padding: spacing(1.25), flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  exchangeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  exchangeInitial: { fontFamily: fonts.display, fontSize: 17 },
  accountCopy: { flex: 1, gap: 2 },
  accountName: { fontFamily: fonts.medium, fontSize: 15 },
  accountExchange: { fontFamily: fonts.regular, fontSize: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
});
