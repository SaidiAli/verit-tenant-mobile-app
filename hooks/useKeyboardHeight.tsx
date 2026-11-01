import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Current on-screen keyboard height, or 0 when it is closed. The `will*`
 * events are used on iOS so the value updates before the keyboard animation
 * finishes; Android only provides the `did*` events.
 */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillShow', event => setKeyboardHeight(event.endCoordinates.height))
      : Keyboard.addListener('keyboardDidShow', event => setKeyboardHeight(event.endCoordinates.height));
    const hide = Platform.OS === 'ios'
      ? Keyboard.addListener('keyboardWillHide', () => setKeyboardHeight(0))
      : Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardHeight;
}
