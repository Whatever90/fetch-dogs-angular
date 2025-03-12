import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private favoritesKeyPrefix = 'favorites_';
  private currentUser: string = ''; // Will be set after login
  private favorites: Set<string> = new Set();

  constructor() {
    // Optionally, you could load the current user from sessionStorage
    const storedUser = sessionStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = storedUser;
      this.loadFavorites();
    }
  }

  // Call this method after a successful login to set the current user.
  setCurrentUser(userIdentifier: string): void {
    this.currentUser = userIdentifier;
    sessionStorage.setItem('currentUser', userIdentifier);
    this.loadFavorites();
  }

  // Generate a key based on the current user.
  private getFavoritesKey(): string {
    return `${this.favoritesKeyPrefix}${this.currentUser}`;
  }

  // Load favorites from sessionStorage for the current user.
  private loadFavorites(): void {
    const stored = sessionStorage.getItem(this.getFavoritesKey());
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) {
          this.favorites = new Set(arr);
        }
      } catch (e) {
        console.error('Failed to parse favorites from storage', e);
      }
    } else {
      this.favorites = new Set([]);
    }
  }

  // Return favorites as an array.
  getFavorites(): string[] {
    return Array.from(this.favorites);
  }

  // Toggle a favorite dog ID.
  toggleFavorite(dogId: string): void {
    if (this.favorites.has(dogId)) {
      this.favorites.delete(dogId);
    } else {
      this.favorites.add(dogId);
    }
    this.saveFavorites();
  }

  // Save the current favorites to sessionStorage.
  private saveFavorites(): void {
    if (this.currentUser) {
      sessionStorage.setItem(this.getFavoritesKey(), JSON.stringify(Array.from(this.favorites)));
    }
  }

  // Optionally clear favorites (for example on logout)
  clearFavorites(): void {
    this.favorites.clear();
    sessionStorage.removeItem(this.getFavoritesKey());
  }
}
