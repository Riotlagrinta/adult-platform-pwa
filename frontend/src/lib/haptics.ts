/**
 * Haptic feedback utility for Only Adult
 * Works seamlessly across Capacitor native apps (iOS / Android)
 * and fallback to Web Vibration API (Android Chrome / browsers).
 */

let CapacitorHaptics: any = null;

// Dynamically import Capacitor Haptics if available in runtime
if (typeof window !== "undefined") {
  import("@capacitor/haptics")
    .then((mod) => {
      CapacitorHaptics = mod.Haptics;
    })
    .catch(() => {
      // Running in standard web browser without Capacitor native bridge
    });
}

export const haptics = {
  /**
   * Subtle tick feedback (navigation, tabs, picker)
   */
  light: async () => {
    if (CapacitorHaptics) {
      try {
        await CapacitorHaptics.impact({ style: "LIGHT" });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
  },

  /**
   * Medium bump feedback (button press, like, follow)
   */
  medium: async () => {
    if (CapacitorHaptics) {
      try {
        await CapacitorHaptics.impact({ style: "MEDIUM" });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }
  },

  /**
   * Heavy bump feedback (story recording start/stop, delete action)
   */
  heavy: async () => {
    if (CapacitorHaptics) {
      try {
        await CapacitorHaptics.impact({ style: "HEAVY" });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([30, 20, 30]);
    }
  },

  /**
   * Success feedback pattern (message sent, payment success, login)
   */
  success: async () => {
    if (CapacitorHaptics) {
      try {
        await CapacitorHaptics.notification({ type: "SUCCESS" });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([15, 30, 20]);
    }
  },

  /**
   * Error feedback pattern (failed action, validation error)
   */
  error: async () => {
    if (CapacitorHaptics) {
      try {
        await CapacitorHaptics.notification({ type: "ERROR" });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([40, 40, 40]);
    }
  },

  /**
   * Selection changed feedback (scrolling wheels, list item selection)
   */
  selection: async () => {
    if (CapacitorHaptics) {
      try {
        await CapacitorHaptics.selectionChanged();
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(8);
    }
  },
};
