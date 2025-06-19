import { Component, EventEmitter, NgZone, OnDestroy, Output } from '@angular/core';
import { User } from '../../models/user';
import { Database, onValue, ref, off } from '@angular/fire/database';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-list',
  imports: [CommonModule],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss'],
})
export class UserList  {
  
  public userList: User[] = [];
  public isLoading = true;
  public error: string | null = null;
  private usersRef: any;

  @Output() startEventEmitter : EventEmitter<string> = new EventEmitter()

  constructor(private fireDb: Database, private ngZone: NgZone) {
    this.loadUsers();
  }

  private loadUsers(): void {
    try {
      this.usersRef = ref(this.fireDb, 'users');

      console.log('Setting up user list listener...');

      onValue(
        this.usersRef,
        (snapshot) => {
          this.ngZone.run(() => {
            console.log('Snapshot received:', snapshot.exists());

            if (snapshot.exists()) {
              const users = snapshot.val();
              console.log('Raw users data:', users);

              // Convert object to array and ensure proper typing

              this.userList = Object.keys(users).map((key) => ({
                uid: key,
                imageURL:
                  users[key].imageURL || 'https://i.pravatar.cc/150?img=5',
                ...users[key],
              }));

              console.log('Processed userList:', this.userList);
              console.log('Number of users:', this.userList.length);
            } else {
              console.log('No users found in database');
              this.userList = [];
            }

            this.isLoading = false;
          });
        },
        (error) => {
          this.ngZone.run(() => {
            console.error('Error fetching users:', error);
            this.error = error.message || 'Failed to load users';
            this.isLoading = false;
          });
        }
      );
    } catch (error) {
      console.error('Error setting up user listener:', error);
      this.error = 'Failed to initialize user list';
      this.isLoading = false;
    }
  }

  ngOnDestroy(): void {
    if (this.usersRef) {
      off(this.usersRef);
    }
  }

  startChatChild(uid: string): void {
    this.startEventEmitter.next(uid)
  }

  // Helper method to get user count for debugging
  get userCount(): number {
    return this.userList?.length || 0;
  }
  handleImageError(event: Event, user: User) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = `https://i.pravatar.cc/150?u=${user.uid}`;
    user.imageURL = imgElement.src; // Update the user object if you want to persist the change
  }
}
