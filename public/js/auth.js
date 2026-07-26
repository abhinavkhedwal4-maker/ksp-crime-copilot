// Auth State Management
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.init();
  }

  init() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        const roleData = getUserRole(user.email);
        this.userRole = roleData;
        
        // Store in session storage
        sessionStorage.setItem('ksp_user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: roleData.role,
          district: roleData.district,
          displayName: user.displayName || user.email
        }));
        
        // Redirect if on login page
        if (window.location.pathname.includes('login.html')) {
          window.location.href = '/dashboard.html';
        }
      } else {
        this.currentUser = null;
        this.userRole = null;
        sessionStorage.removeItem('ksp_user');
        
        // Redirect to login if on protected page
        if (!window.location.pathname.includes('login.html')) {
          window.location.href = '/login.html';
        }
      }
      
      // Update UI
      this.updateUI();
    });
  }

  updateUI() {
    const userInfoElements = document.querySelectorAll('[data-user-info]');
    userInfoElements.forEach(el => {
      if (this.currentUser) {
        el.innerHTML = `
          <span>${this.currentUser.email}</span>
          <span class="role-badge ${this.userRole?.role.toLowerCase()}">${this.userRole?.role}</span>
          ${this.userRole?.district !== 'All Districts' ? 
            `<span class="district-badge">📍 ${this.userRole?.district}</span>` : ''}
        `;
      }
    });
  }

  async login(email, password) {
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      let message = error.message;
      if (error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Use one of the demo credentials or verify the Firebase account.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'User not found. Please check your email or use a demo account.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Wrong password. Please try again.';
      }
      return { success: false, error: message, code: error.code };
    }
  }

  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);
      return { success: true, user: result.user };
    } catch (error) {
      let message = error.message;
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Google sign-in was canceled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Please allow popups for this site to sign in with Google.';
      }
      return { success: false, error: message, code: error.code };
    }
  }

  async logout() {
    try {
      await auth.signOut();
      sessionStorage.clear();
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  getCurrentUser() {
    const stored = sessionStorage.getItem('ksp_user');
    return stored ? JSON.parse(stored) : null;
  }
}

const authManager = new AuthManager();