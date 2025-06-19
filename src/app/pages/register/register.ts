import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss'],
})
export class Register {
  user: User = new User();
  constructor(
    private toastr: ToastrService,
    private authService: AuthService,
    private router : Router
  ) {}

  formSubmit(event: SubmitEvent) {
    event.preventDefault();
    // console.log(this.user);
    if (this.user.name.trim() === '') {
      this.toastr.error('Name is required', 'Error');
    }
    if (this.user.email.trim() === '') {
      this.toastr.error('Email is required', 'Error');
    }
    if (this.user.password.trim() === '') {
      this.toastr.error('Password is required', 'Error');
    }
    

    this.authService.register(this.user);
  }

  //  register code from here
}
