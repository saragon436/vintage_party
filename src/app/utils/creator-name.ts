export interface Creator {
  firstName?: string;
  lastName?: string;
  userName: string;
}

export function creatorName(user?: Creator | null): string {
  const fullName = [user?.firstName, user?.lastName]
    .map(value => value?.trim())
    .filter(Boolean)
    .join(' ');

  return fullName || user?.userName?.trim() || 'No registrado';
}
