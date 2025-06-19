import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { ref, onValue } from '@angular/fire/database';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  loginData = {
    email: '',
    password: '',
  };

  constructor(
    private toastr: ToastrService,
    private authService: AuthService,
    private router : Router
  ) {}

  loginFormSubmitted(event: SubmitEvent) {
    event.preventDefault();

    if (this.loginData.email.trim() === '') {
      this.toastr.warning('Email is required!!');
      return;
    }
    if (this.loginData.password.trim() === '') {
      this.toastr.warning('Password is required!!');
      return;
    }

    this.authService
      .login(this.loginData.email, this.loginData.password)
      .then((user) => {
        if (user) {
          const uid = user.uid;

          // Get full user info from Realtime Database
          const userRef = ref(this.authService['fireDb'], `users/${uid}`);
          onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
              console.log('Logged in user data:', userData);

              // Optionally store in localStorage
              localStorage.setItem('user', JSON.stringify(userData));
              this.router.navigate([`/chat-dashboard/`])
            } else {
              this.toastr.warning('User data not found in database.');
            }
          });
        }
      })
      .catch((error) => {
        console.error('Login error:', error);
        this.toastr.error('Login failed!');
      });
  }
}
