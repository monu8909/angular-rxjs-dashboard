import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { MOCK_USERS } from '../shared/mock-data';

@Injectable({ providedIn: 'root' })
export class UserService {
  private usersSubject = new BehaviorSubject<User[]>(MOCK_USERS);
  private storageKey = 'dashboard-users';

  constructor() {
    this.loadFromStorage();
  }

  get users$(): Observable<User[]> {
    return this.usersSubject.asObservable();
  }

  get roleDistribution$(): Observable<{ role: UserRole; count: number }[]> {
    return this.users$.pipe(
      map((users) => {
        const distribution = users.reduce(
          (acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          },
          {} as Record<UserRole, number>
        );
        return (Object.keys(distribution) as UserRole[]).map((role) => ({
          role,
          count: distribution[role],
        }));
      })
    );
  }

  getUsers(): User[] {
    return this.usersSubject.getValue();
  }

  addUser(user: Omit<User, 'id'>): void {
    const current = this.getUsers();
    const maxId = current.length > 0 ? Math.max(...current.map((u) => u.id)) : 0;
    const newUser: User = { ...user, id: maxId + 1 };
    const updated = [...current, newUser];
    this.usersSubject.next(updated);
    this.persistToStorage(updated);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed: User[] = JSON.parse(stored);
        if (parsed.length) {
          this.usersSubject.next(parsed);
        }
      }
    } catch {
      /* ignore storage errors */
    }
  }

  private persistToStorage(users: User[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(users));
    } catch {
      /* ignore storage errors */
    }
  }
}
