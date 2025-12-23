// CASA 60 - Script de commande
// Configuration WhatsApp
const WHATSAPP_NUMBER = '2250586000041';

// État du panier
let cart = JSON.parse(localStorage.getItem('casa60_cart')) || [];

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initMenuTabs();
  initOrderType();
  updateCartUI();
});

// Navigation scroll effect
function initNavigation() {
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// Menu tabs
function initMenuTabs() {
  const tabs = document.querySelectorAll('.menu-tab');
  const sections = document.querySelectorAll('.menu-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      // Update tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update sections
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetId) {
          section.classList.add('active');
        }
      });
    });
  });
}

// Order type toggle
function initOrderType() {
  const orderType = document.getElementById('orderType');
  const addressGroup = document.getElementById('addressGroup');

  if (orderType && addressGroup) {
    orderType.addEventListener('change', () => {
      if (orderType.value === 'livraison') {
        addressGroup.style.display = 'block';
      } else {
        addressGroup.style.display = 'none';
      }
    });
  }
}

// Add item to cart
function addToCart(itemId) {
  const itemElement = document.querySelector(`[data-id="${itemId}"]`);
  if (!itemElement) return;

  const name = itemElement.dataset.name;
  const price = parseInt(itemElement.dataset.price);

  const existingItem = cart.find(item => item.id === itemId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: itemId,
      name: name,
      price: price,
      quantity: 1
    });
  }

  saveCart();
  updateCartUI();
  showToast(`${name} ajouté au panier`, 'success');
}

// Remove item from cart
function removeFromCart(itemId) {
  cart = cart.filter(item => item.id !== itemId);
  saveCart();
  updateCartUI();
}

// Update item quantity
function updateQuantity(itemId, change) {
  const item = cart.find(item => item.id === itemId);
  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    removeFromCart(itemId);
  } else {
    saveCart();
    updateCartUI();
  }
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem('casa60_cart', JSON.stringify(cart));
}

// Calculate cart total
function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Format price
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F';
}

// Update cart UI
function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  const cartContent = document.getElementById('cartContent');
  const orderForm = document.getElementById('orderForm');

  // Update cart count
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems > 0 ? totalItems : '';

  // Update cart content
  if (cart.length === 0) {
    cartContent.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <p>Votre panier est vide</p>
      </div>
    `;
    orderForm.style.display = 'none';
  } else {
    let cartHTML = '<ul class="cart-items">';

    cart.forEach(item => {
      cartHTML += `
        <li class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${formatPrice(item.price)} × ${item.quantity}</div>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
          </div>
        </li>
      `;
    });

    cartHTML += '</ul>';
    cartHTML += `
      <div class="cart-total">
        <span>Total</span>
        <span class="cart-total-amount">${formatPrice(getCartTotal())}</span>
      </div>
    `;

    cartContent.innerHTML = cartHTML;
    orderForm.style.display = 'block';
  }
}

// Open cart modal
function openCart() {
  const modal = document.getElementById('cartModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close cart modal
function closeCart() {
  const modal = document.getElementById('cartModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeCart();
  }
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeCart();
  }
});

// Send order via WhatsApp
function sendOrder(e) {
  e.preventDefault();

  const clientName = document.getElementById('clientName').value.trim();
  const clientPhone = document.getElementById('clientPhone').value.trim();
  const orderType = document.getElementById('orderType').value;
  const clientAddress = document.getElementById('clientAddress').value.trim();
  const clientNotes = document.getElementById('clientNotes').value.trim();

  if (!clientName || !clientPhone) {
    showToast('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

  if (cart.length === 0) {
    showToast('Votre panier est vide', 'error');
    return;
  }

  // Build order message
  let message = `🍽️ *NOUVELLE COMMANDE CASA 60*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `👤 *Client:* ${clientName}\n`;
  message += `📞 *Téléphone:* ${clientPhone}\n`;
  message += `📦 *Type:* ${getOrderTypeLabel(orderType)}\n`;

  if (orderType === 'livraison' && clientAddress) {
    message += `📍 *Adresse:* ${clientAddress}\n`;
  }

  message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `🛒 *DÉTAIL DE LA COMMANDE:*\n\n`;

  cart.forEach(item => {
    message += `• ${item.name}\n`;
    message += `   ${item.quantity} × ${formatPrice(item.price)} = ${formatPrice(item.price * item.quantity)}\n\n`;
  });

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 *TOTAL: ${formatPrice(getCartTotal())}*\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (clientNotes) {
    message += `\n📝 *Notes:* ${clientNotes}\n`;
  }

  message += `\n_Commande passée via le site CASA 60_`;

  // Encode message for WhatsApp URL
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  // Open WhatsApp
  window.open(whatsappUrl, '_blank');

  // Clear cart after order
  cart = [];
  saveCart();
  updateCartUI();
  closeCart();

  // Reset form
  document.getElementById('clientName').value = '';
  document.getElementById('clientPhone').value = '';
  document.getElementById('clientAddress').value = '';
  document.getElementById('clientNotes').value = '';

  showToast('Commande envoyée ! Vérifiez WhatsApp', 'success');
}

// Get order type label
function getOrderTypeLabel(type) {
  const labels = {
    'livraison': '🚗 Livraison',
    'surplace': '🪑 Sur place',
    'emporter': '📦 À emporter'
  };
  return labels[type] || type;
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;

    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
