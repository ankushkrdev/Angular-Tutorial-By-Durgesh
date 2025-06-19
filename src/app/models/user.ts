export class User {
  constructor(
    public uid: string = '',
    public email: string = '',
    public password: string = '',
    public displayName: string = '',
    public imageURL: string = 'https://www.flaticon.com/free-icon/user_456212?term=user&page=1&position=1&origin=tag&related_id=456212',
    public emailVerified: boolean = false,
    public name: string = '',
    public about: string = ''
  ) {}
}
