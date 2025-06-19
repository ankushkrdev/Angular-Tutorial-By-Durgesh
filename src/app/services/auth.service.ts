import { AngularFireAuth } from '@angular/fire/compat/auth';
import { inject, Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from '@angular/fire/auth';
import { Database, get, ref, set } from '@angular/fire/database';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { User } from '../models/user';
import { catchError, from, map, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private auth: Auth = inject(Auth),
    private fireDb: Database = inject(Database),
    private router: Router = inject(Router),
    private toastr: ToastrService = inject(ToastrService)
  ) {}

  async register(user: User) {
    try {
      const result = await createUserWithEmailAndPassword(
        this.auth,
        user.email,
        user.password
      );

      if (result.user) {
        try {
          await updateProfile(result.user, {
            displayName: user.name.trim(),
          });
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
        }

        this.toastr.success('Saving user detail...', 'Registration Success');

        user.uid = result.user.uid;
        user.displayName = result.user.displayName || user.name.toUpperCase();
        user.emailVerified = result.user.emailVerified;
        user.password = '';
        user.imageURL =
          result.user.photoURL || 'https://via.placeholder.com/150';

        console.log('User saved:', user);

        this.setUserToLocalStorage(user);

        try {
          await this.saveUserData(user);
          this.toastr.success('User data saved!!');
          this.router.navigate(['/login']);
        } catch (error) {
          console.error('Database error:', error);
          this.toastr.error('Permission denied or error saving user data');
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.code === 'auth/email-already-in-use') {
        this.toastr.error(
          'This email is already registered. Try logging in.',
          'Error'
        );
      } else {
        this.toastr.error(error.message, 'Error');
      }
    }
  }

  // Save User data in firebase
  saveUserData(user: User) {
    const userRef = ref(this.fireDb, `users/${user.uid}`);
    return set(userRef, user);
  }

  // Save User data in Local Storage
  setUserToLocalStorage(user: User) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  get loggedInStatus() {
    const userString = localStorage.getItem('user');
    if (userString === null) {
      return false;
    } else {
      return JSON.parse(userString);
    }
  }

  logoutFromLocalStorage() {
    localStorage.removeItem('user');
  }

  signOutUser() {
    this.auth
      .signOut()
      .then(() => {
        this.logoutFromLocalStorage();
        this.toastr.success('Logout Successfull');
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        this.toastr.error('Error in logging out!!');
      });
  }

  async login(email: string, password: string): Promise<any> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      // Get user data from database and store in localStorage
      if (userCredential.user) {
        try {
          this.getUserById(userCredential.user.uid).subscribe({
            next: (userData) => {
              this.setUserToLocalStorage(userData);
            },
            error: (error) => {
              console.error('Error fetching user data:', error);
              // Fallback to auth user data
            }
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to auth user data
        }
      }

      this.toastr.success('Login Successful');
      console.log(
        'Login successful, displayName:',
        userCredential.user.displayName
      );
      return userCredential.user;
    } catch (error: any) {
      this.toastr.error('Email or password is incorrect');
      return error;
    }
  }

  getUserById(uid: string): Observable<User> {
  const userRef = ref(this.fireDb, `users/${uid}`);
  return from(get(userRef)).pipe(
    map((snapshot) => {
      if (snapshot.exists()) {
        return snapshot.val() as User;
      } else {
        throw 'No user data found';
      }
    }),
    catchError((error) => throwError(() => error))
  );
}
}
