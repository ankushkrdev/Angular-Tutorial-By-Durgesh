import {
  Component,
  NgZone,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { AuthService } from '../../services/auth.service';
import {
  Auth,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from '@angular/fire/auth';
import { Database, onValue, push, ref, set, off } from '@angular/fire/database';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { User } from '../../models/user';
import { UserList } from '../../components/user-list/user-list';
import { Message } from '../../models/message';

@Component({
  selector: 'app-chat-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UserList],
  templateUrl: './chat-dashboard.html',
  styleUrl: './chat-dashboard.scss',
})
export class ChatDashboard implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messageBox', { static: false }) messageBox!: ElementRef;

  currentUser: FirebaseUser | null = null;
  toUser: User | null = null;
  message: string = '';
  chats: Message[] = [];
  chatRefNode: string = '';
  oppChatRefNode: string = '';

  private chatRef: any = null;
  private shouldScrollToBottom = false;
  private isInitialLoad = true;
  private messageDrafts = new Map<string, string>();

  constructor(
    public authService: AuthService,
    private fireAuth: Auth,
    private fireDb: Database,
    private toastr: ToastrService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    // Listen to authentication state changes
    onAuthStateChanged(this.fireAuth, (user) => {
      this.ngZone.run(() => {
        if (user) {
          this.currentUser = user;
          console.log('Current user:', this.currentUser);
        } else {
          this.currentUser = null;
        }
      });
    });
  }

  ngOnInit() {
    // Component initialization
  }

  ngAfterViewInit() {
    // Ensure view is initialized
  }

  ngOnDestroy() {
    this.cleanupChatSubscription();
  }

  private cleanupChatSubscription() {
    if (this.chatRef) {
      off(this.chatRef);
      this.chatRef = null;
    }

    // Note: We don't clear message here anymore since we're using drafts
    // The draft system will handle message state
    this.chats = [];
  }

  startChatParent(uid: string) {
    // Save current draft before switching
    if (this.toUser && this.message.trim()) {
      this.messageDrafts.set(this.toUser.uid, this.message);
    }

    // Clean up previous chat subscription
    this.cleanupChatSubscription();

    // Reset chat state
    this.chats = [];
    this.chatRefNode = `chats/${this.currentUser!.uid}****${uid}`;
    this.oppChatRefNode = `chats/${uid}****${this.currentUser!.uid}`;
    this.isInitialLoad = true;

    this.authService.getUserById(uid).subscribe({
      next: (user) => {
        this.toUser = user;
        console.log('Chat partner:', this.toUser);

        // Load draft for new chat
        this.message = this.messageDrafts.get(uid) || '';

        this.loadChat();
      },
      error: (err) => {
        console.error('Error getting user:', err);
        this.toastr.error('Error in starting chat');
      },
    });
  }

  loadChat() {
    if (!this.chatRefNode) {
      console.error('Chat reference node not set');
      return;
    }

    this.chatRef = ref(this.fireDb, this.chatRefNode);

    onValue(
      this.chatRef,
      (snapshot) => {
        this.ngZone.run(() => {
          const data = snapshot.val();
          console.log('Snapshot data:', data);

          if (data && Object.keys(data).length > 0) {
            const newMessages = this.processMessagesData(data);
            this.handleNewMessages(newMessages);
          } else {
            this.chats = [];
            this.isInitialLoad = false;
            console.log('No messages found in chat');
          }
        });
      },
      (error) => {
        console.error('Error loading chat:', error);
        this.toastr.error('Error loading chat messages');
      }
    );
  }

  private loadOppositeChat() {
    this.cleanupChatSubscription();
    this.chatRef = ref(this.fireDb, this.oppChatRefNode);

    onValue(
      this.chatRef,
      (snapshot) => {
        this.ngZone.run(() => {
          const oppData = snapshot.val();
          console.log('Opposite chat data:', oppData);

          if (oppData && Object.keys(oppData).length > 0) {
            const newMessages = this.processMessagesData(oppData);
            this.handleNewMessages(newMessages);
            this.chatRefNode = this.oppChatRefNode; // Switch to this reference for new messages
          } else {
            this.chats = [];
            this.isInitialLoad = false;
            console.log('No messages found in either chat reference');
          }
        });
      },
      (error) => {
        console.error('Error loading opposite chat:', error);
      }
    );
  }

  private handleNewMessages(newMessages: Message[]) {
    const previousLength = this.chats.length;
    const wasAtBottom = this.isScrolledToBottom();

    // Check if we have new messages
    const hasNewMessages = newMessages.length > previousLength;

    // Update the messages array
    this.chats = newMessages;

    // Determine if we should scroll to bottom
    this.shouldScrollToBottom =
      this.isInitialLoad || wasAtBottom || hasNewMessages;

    if (this.isInitialLoad) {
      this.isInitialLoad = false;
    }

    // Trigger change detection and scroll after view update
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.shouldScrollToBottom) {
        this.scrollToBottom();
      }
    }, 0);

    console.log('Processed messages:', this.chats);
  }

  private processMessagesData(data: any): Message[] {
    const messages: Message[] = [];

    // Handle the nested structure from your Firebase data
    Object.keys(data).forEach((outerKey) => {
      const outerValue = data[outerKey];
      messages.push({
        id: outerKey,
        message: outerValue.message,
        from: outerValue.from,
        to: outerValue.to,
        date: outerValue.date || outerValue.timestamp || '',
        timestamp: outerValue.date || outerValue.timestamp,
      } as Message);
    });

    // Sort messages by timestamp
    messages.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return (
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      return 0;
    });

    return messages;
  }

  sendMessage(event: SubmitEvent) {
    event.preventDefault();

    if (this.message.trim() === '') {
      return;
    }

    if (!this.currentUser || !this.toUser) {
      this.toastr.error('Chat not properly initialized');
      return;
    }

    console.log('Sending message:', this.message);

    const messageToSend: Message = {
      message: this.message.trim(),
      from: this.currentUser.uid,
      to: this.toUser.uid,
      date: new Date().toString(),
      timestamp: new Date().toString(),
    } as Message;
const senderRef = ref(this.fireDb, this.chatRefNode);
    const receiverRef = ref(this.fireDb, this.oppChatRefNode);
    // Only write to one chat reference since both users share the same reference
    const chatRef = ref(this.fireDb, this.chatRefNode);

    console.log('Sending to references:', {
      senderRef: this.chatRefNode,
      receiverRef: this.oppChatRefNode,
    });


    // Set flag to scroll to bottom after sending
    this.shouldScrollToBottom = true;

    Promise.all([
      push(senderRef, messageToSend),
      push(receiverRef, messageToSend),
    ])
      .then(() => {
        console.log('Message sent successfully');
        this.toastr.success('Message sent');
        this.message = '';

        // Clear the draft for this user since message was sent
        if (this.toUser) {
          this.messageDrafts.delete(this.toUser.uid);
        }

        // The Firebase listener will automatically update the UI
      })
      .catch((err) => {
        console.error('Error sending message:', err);
        this.toastr.error('Error in sending message');
      });
  }

  private isScrolledToBottom(): boolean {
    if (!this.messageBox?.nativeElement) return true;

    const element = this.messageBox.nativeElement;
    const threshold = 50; // 50px threshold for "near bottom"

    return (
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - threshold
    );
  }

  private scrollToBottom(): void {
    if (!this.messageBox?.nativeElement) return;

    try {
      const element = this.messageBox.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    // Format as HH:mm or any desired format
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
