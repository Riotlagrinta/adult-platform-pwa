export type Sticker = {
  id: string;
  emoji: string;
  name: string;
  category: "hot" | "flirt" | "vip" | "fun" | "spicy";
};

export type StickerCategory = {
  id: "hot" | "flirt" | "vip" | "fun" | "spicy";
  label: string;
  icon: string;
};

export const STICKER_CATEGORIES: StickerCategory[] = [
  { id: "hot", label: "Hot & Passion", icon: "🔥" },
  { id: "flirt", label: "Flirt & Charme", icon: "💋" },
  { id: "vip", label: "VIP & Luxe", icon: "👑" },
  { id: "fun", label: "Réactions & Fun", icon: "😂" },
  { id: "spicy", label: "Spicy & Secret", icon: "🔞" },
];

export const STICKERS: Sticker[] = [
  // 🔥 Hot & Passion
  { id: "fire_heart", emoji: "❤️‍🔥", name: "Cœur en feu", category: "hot" },
  { id: "flame", emoji: "🔥", name: "Flamme brûlante", category: "hot" },
  { id: "peach", emoji: "🍑", name: "Pêche juteuse", category: "hot" },
  { id: "cherries", emoji: "🍒", name: "Cerises gourmandes", category: "hot" },
  { id: "eggplant", emoji: "🍆", name: "Spicy", category: "hot" },
  { id: "sweat_droplets", emoji: "💦", name: "Gouttes de sueur", category: "hot" },
  { id: "devil_smile", emoji: "😈", name: "Diable coquin", category: "hot" },
  { id: "devil_kiss", emoji: "👿", name: "Diablotin passion", category: "hot" },
  { id: "hot_face", emoji: "🥵", name: "Coup de chaud", category: "hot" },

  // 💋 Flirt & Charme
  { id: "kiss_mark", emoji: "💋", name: "Baiser rouge", category: "flirt" },
  { id: "kissing_heart", emoji: "😘", name: "Bisou volant", category: "flirt" },
  { id: "wink_tongue", emoji: "😜", name: "Clin d'œil séduction", category: "flirt" },
  { id: "heart_eyes", emoji: "😍", name: "Amoureux fou", category: "flirt" },
  { id: "smirk", emoji: "😏", name: "Sourire séducteur", category: "flirt" },
  { id: "drooling", emoji: "🤤", name: "En admiration", category: "flirt" },
  { id: "rose", emoji: "🌹", name: "Rose rouge", category: "flirt" },
  { id: "sparkling_heart", emoji: "💖", name: "Cœur brillant", category: "flirt" },
  { id: "love_letter", emoji: "💌", name: "Message secret", category: "flirt" },

  // 👑 VIP & Luxe
  { id: "crown", emoji: "👑", name: "Couronne VIP", category: "vip" },
  { id: "diamond", emoji: "💎", name: "Diamant précieux", category: "vip" },
  { id: "champagne", emoji: "🍾", name: "Bouteille Champagne", category: "vip" },
  { id: "cocktail", emoji: "🍸", name: "Cocktail chic", category: "vip" },
  { id: "clinking_glasses", emoji: "🥂", name: "Trinquons !", category: "vip" },
  { id: "money_bag", emoji: "💰", name: "Plein aux as", category: "vip" },
  { id: "money_wings", emoji: "💸", name: "Pluie de billets", category: "vip" },
  { id: "sparkles", emoji: "✨", name: "Étoiles & Magie", category: "vip" },
  { id: "star_struck", emoji: "🤩", name: "Étoiles dans les yeux", category: "vip" },

  // 😂 Réactions & Fun
  { id: "laugh_tears", emoji: "😂", name: "MDR", category: "fun" },
  { id: "rofl", emoji: "🤣", name: "Mort de rire", category: "fun" },
  { id: "exploding_head", emoji: "🤯", name: "Choqué", category: "fun" },
  { id: "cool_shades", emoji: "😎", name: "Trop frais", category: "fun" },
  { id: "party_popper", emoji: "🎉", name: "Fête !", category: "fun" },
  { id: "hundred", emoji: "💯", name: "100% Validé", category: "fun" },
  { id: "eyes", emoji: "👀", name: "Je regarde...", category: "fun" },
  { id: "salute", emoji: "🫡", name: "Respect", category: "fun" },
  { id: "melting_face", emoji: "🫠", name: "Je fonds", category: "fun" },

  // 🔞 Spicy & Secret
  { id: "shushing", emoji: "🤫", name: "Chut, c'est secret", category: "spicy" },
  { id: "peeking_eye", emoji: "🫣", name: "Regard discret", category: "spicy" },
  { id: "no_see_monkey", emoji: "🙈", name: "Trop timide", category: "spicy" },
  { id: "candle", emoji: "🕯️", name: "Ambiance tamisée", category: "spicy" },
  { id: "zipper_mouth", emoji: "🤐", name: "Bouche cousue", category: "spicy" },
  { id: "locked_heart", emoji: "🔐", name: "Cadenas d'amour", category: "spicy" },
  { id: "bed", emoji: "🛏️", name: "Rejoins-moi", category: "spicy" },
  { id: "massage", emoji: "💆‍♀️", name: "Détente intime", category: "spicy" },
  { id: "sparkle_lips", emoji: "👄", name: "Lèvres douces", category: "spicy" },
];

export function parseSticker(text?: string | null): Sticker | null {
  if (!text || !text.startsWith("[sticker:") || !text.endsWith("]")) {
    return null;
  }
  const stickerId = text.slice(9, -1);
  return STICKERS.find((s) => s.id === stickerId) ?? {
    id: stickerId,
    emoji: stickerId,
    name: "Sticker",
    category: "hot",
  };
}

export function encodeSticker(sticker: Sticker): string {
  return `[sticker:${sticker.id}]`;
}
