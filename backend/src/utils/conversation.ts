export function normalizePair(userAId: string, userBId: string) {
  return [userAId, userBId].sort() as [string, string];
}

