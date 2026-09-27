export const avatars = [
  { id: 'santa', name: 'Santa Claus', model: 'santa', preview: '/models/avatars/santa.webp' },
  { id: 'food-worker', name: 'Food Worker', model: 'food-worker', preview: '/models/avatars/food-worker.webp' },
  { id: 'generic-male', name: 'Generic Male', model: 'generic-male', preview: '/models/avatars/generic-male.webp' },
  { id: 'generic-female', name: 'Generic Female', model: 'generic-female', preview: '/models/avatars/generic-female.webp' },
  { id: 'citizen-1', name: 'Citizen 1', model: 'citizen-1', preview: '/models/avatars/citizen-1.webp' },
  { id: 'citizen-2', name: 'Citizen 2', model: 'citizen-2', preview: '/models/avatars/citizen-2.webp' },
  { id: 'citizen-3', name: 'Citizen 3', model: 'citizen-3', preview: '/models/avatars/citizen-3.webp' },
  { id: 'male-officer', name: 'Male Officer', model: 'male-officer', preview: '/models/avatars/male-officer.webp' },
  { id: 'female-officer', name: 'Female Officer', model: 'female-officer', preview: '/models/avatars/female-officer.webp' },
  { id: 'crypto-bro', name: 'Crypto Bro', model: 'crypto-bro', preview: '/models/avatars/crypto-bro.webp' },
  { id: 'prisoner', name: 'Prisoner', model: 'prisoner', preview: '/models/avatars/prisoner.webp' },
  { id: 'retail-worker', name: 'Retail Worker', model: 'retail-worker', preview: '/models/avatars/retail-worker.webp' },
  { id: 'chicken-guy', name: 'Chicken Guy', model: 'chicken-guy', preview: '/models/avatars/chicken-guy.webp' },
] as const;

export type AvatarId = (typeof avatars)[number]['id'];
export type Avatar = (typeof avatars)[number];

export function getAvatar(id: string): Avatar {
  return avatars.find(avatar => avatar.id === id) ?? avatars[3];
}
