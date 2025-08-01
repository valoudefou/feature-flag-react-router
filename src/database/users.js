// src/database/users.js

export const users = [
  {
    username: 'admin',
    password: 'admin',
    displayName: 'User1',
    email: 'admin@example.com',
    joinedDate: '2023-01-01',
    role: 'developer',
    id: '772afe88-b30b-4700-8cbc-00165cbbc524'
  },
  {
    username: 'user',
    password: 'user',
    displayName: 'User2',
    email: 'demo@example.com',
    joinedDate: '2023-06-01',
    role: 'marketing',
    id: 'fcfe4de4-db82-4200-9d16-993360788a56'
  }
];

export function addUser(newUser) {
  users.push(newUser);
}
