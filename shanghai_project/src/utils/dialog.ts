import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * 跨平台确认框。
 * 原生用 Alert.alert；web 用 window.confirm
 * （react-native-web 的 Alert.alert 是空实现，点了没反应）。
 */
export function confirmDialog(opts: ConfirmOptions) {
  const { title, message, confirmText = '确认', cancelText = '取消', destructive, onConfirm } = opts;
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (window.confirm(text)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/**
 * 跨平台提示框（信息/错误）。
 * 原生用 Alert.alert；web 用 window.alert，OK 后执行 onOk（若有）。
 */
export function alertDialog(title: string, message?: string, onOk?: () => void) {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    window.alert(text);
    onOk?.();
    return;
  }
  Alert.alert(title, message, onOk ? [{ text: '确定', onPress: onOk }] : undefined);
}
