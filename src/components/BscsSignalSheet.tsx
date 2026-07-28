import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BscsComponent } from '../api/types';
import { formatBscsComponentValue } from '../dashboard/bscsPresentation';
import { bscsSignalCopy } from '../dashboard/bscsSignals';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

/**
 * Explains one BSCS sub-signal in plain English — the phone's answer to the
 * web dashboard's help bubbles. Opens from a tap on the signal row and
 * repeats the current reading so the number stays in view while reading
 * what it means.
 */
export function BscsSignalSheet({ signal, onClose }: {
  signal: BscsComponent | null;
  onClose: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const copy = signal ? bscsSignalCopy(signal.key) : null;

  return (
    <Modal visible={signal !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: palette.panel, paddingBottom: insets.bottom + spacing(2) }]}>
        <View style={[styles.sheetHandle, { backgroundColor: palette.lineStrong }]} />
        {signal ? (
          <>
            <Text style={[styles.sheetEyebrow, { color: palette.green }]}>MARKET REGIME SIGNAL</Text>
            <View style={styles.titleRow}>
              <Text style={[styles.sheetTitle, { color: palette.text }]}>{copy?.title ?? signal.label}</Text>
              <View style={styles.readingBlock}>
                <Text style={[styles.reading, { color: signal.fired ? palette.amber : palette.text }]}>
                  {formatBscsComponentValue(signal.value)}
                </Text>
                <View style={[styles.stateChip, { backgroundColor: signal.fired ? palette.amberSoft : palette.panelStrong }]}>
                  <Text style={[styles.stateChipText, { color: signal.fired ? palette.amber : palette.textFaint }]}>
                    {signal.fired ? 'FIRED' : 'QUIET'}
                  </Text>
                </View>
              </View>
            </View>
            {copy ? (
              <View style={styles.bodyBlock}>
                <Text style={[styles.tip, { color: palette.textSoft }]}>{copy.tip}</Text>
                {copy.body.map((paragraph) => (
                  <Text key={paragraph} style={[styles.paragraph, { color: palette.text }]}>{paragraph}</Text>
                ))}
              </View>
            ) : null}
            <Pressable onPress={onClose} style={[styles.closeButton, { borderColor: palette.line, backgroundColor: palette.panelStrong }]}>
              <Ionicons name="close" size={17} color={palette.textSoft} />
              <Text style={[styles.closeLabel, { color: palette.textSoft }]}>Close</Text>
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  sheet: { paddingHorizontal: spacing(2), paddingTop: spacing(1), borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing(2.5) },
  sheetEyebrow: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing(1.5), marginTop: 4 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -1, flex: 1 },
  readingBlock: { alignItems: 'flex-end', gap: 5 },
  reading: { fontFamily: fonts.monoBold, fontSize: 22, letterSpacing: -0.6 },
  stateChip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  stateChipText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 0.9 },
  bodyBlock: { gap: spacing(1), marginTop: spacing(2) },
  tip: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  paragraph: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 20 },
  closeButton: { marginTop: spacing(2.5), borderWidth: 1, borderRadius: radius.control, paddingVertical: spacing(1.25), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  closeLabel: { fontFamily: fonts.medium, fontSize: 14 },
});
