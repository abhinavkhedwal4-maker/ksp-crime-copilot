// Page Router & Auth Guard
class Router {
  constructor() {
    this.currentPage = window.location.pathname.split('/').pop();
    this.protectedPages = ['index.html', 'dashboard.html', 'chat.html', 'map.html', 'network.html'];
    this.init();
  }

  init() {
    // Check authentication
    const user = authManager.getCurrentUser();
    
    if (this.protectedPages.includes(this.currentPage) && !user) {
      window.location.href = '/login.html';
      return;
    }

    // Setup logout handlers
    document.querySelectorAll('.logout-btn').forEach(btn => {
      btn.addEventListener('click', () => authManager.logout());
    });

    // Update navigation active state
    this.updateNavState();
  }

  updateNavState() {
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href');
      if (href === this.currentPage || (this.currentPage === 'index.html' && href === 'dashboard.html')) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
}

const router = new Router();