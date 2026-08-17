import { apiRequest } from "./api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushSupported(): Promise<boolean> {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function getSubscriptionStatus(): Promise<boolean> {
  if (!(await isPushSupported())) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

export async function subscribeToPush(token: string): Promise<boolean> {
  if (!(await isPushSupported())) {
    throw new Error("Les notifications push ne sont pas supportées par votre navigateur.");
  }

  // 1. Demander la permission à l'utilisateur
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permission de notification refusée par l'utilisateur.");
  }

  // 2. Récupérer la clé publique VAPID du serveur
  const { publicKey } = await apiRequest<{ publicKey: string | null }>("/push/public-key", { token });
  if (!publicKey) {
    throw new Error("Clé VAPID non disponible sur le serveur.");
  }

  // 3. Obtenir l'enregistrement Service Worker et créer l'abonnement
  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
  }

  // 4. Envoyer l'abonnement au serveur
  const rawSub = subscription.toJSON();
  if (!rawSub.endpoint || !rawSub.keys?.p256dh || !rawSub.keys?.auth) {
    throw new Error("Abonnement push incomplet généré par le navigateur.");
  }

  await apiRequest("/push/subscribe", {
    method: "POST",
    token,
    body: JSON.stringify({
      endpoint: rawSub.endpoint,
      keys: {
        p256dh: rawSub.keys.p256dh,
        auth: rawSub.keys.auth,
      },
    }),
  });

  return true;
}

export async function unsubscribeFromPush(token: string): Promise<boolean> {
  if (!(await isPushSupported())) return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await apiRequest("/push/unsubscribe", {
        method: "POST",
        token,
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
    return true;
  } catch (err) {
    console.error("Erreur lors du désabonnement push:", err);
    return false;
  }
}
