const API_URL = '/api';

// DOM Elements
const apartmentGrid = document.getElementById('apartment-grid');
const searchInput = document.getElementById('search-input');
let allApartments = [];
let currentMode = 'guest'; // default mode
let submittedInquiries = []; // store inquiries

// Scroll Effect for Navbar
window.addEventListener('scroll', () => {
    const nav = document.querySelector('.glass-nav');
    const sections = document.querySelectorAll('header, section');
    const navLinks = document.querySelectorAll('.nav-links a');

    // Sticky Nav background
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }

    // ScrollSpy: Highlight active link
    let current = "";
    sections.forEach((section) => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - sectionHeight / 3) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach((link) => {
        link.classList.remove("active");
        if (link.getAttribute("href").includes(current)) {
            link.classList.add("active");
        }
    });
});

// Load Data
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for saved role to persist across reloads
    const savedRole = localStorage.getItem('userRole');
    if (savedRole) {
        selectRole(savedRole);
    } else {
        // Show dashboard initially and prevent scrolling
        showDashboard();
    }
    fetchApartments();

    // Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinksContainer = document.getElementById('nav-links');

    if (mobileMenu) {
        mobileMenu.addEventListener('click', () => {
            navLinksContainer.classList.toggle('active');
            mobileMenu.classList.toggle('is-active');
        });
    }

    // Close mobile menu when a link is clicked
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinksContainer.classList.remove('active');
            mobileMenu.classList.remove('is-active');
        });
    });
});

// Fetch All Apartments
async function fetchApartments() {
    try {
        const res = await fetch(`${API_URL}/apartments`);
        allApartments = await res.json();
        renderApartments(allApartments);
    } catch (err) {
        console.error('Error fetching apartments:', err);
    }
}

// Render Apartments
function renderApartments(apartments) {
    if (apartments.length === 0) {
        apartmentGrid.innerHTML = '<div class="no-data">No residences found matching your criteria.</div>';
        return;
    }

    apartmentGrid.innerHTML = apartments.map(apt => `
        <div class="apt-card">
            <div class="card-img">
                <span class="status-label status-${apt.status}">${apt.status}</span>
            </div>
            <div class="card-content">
                <p style="color: var(--flash-teal); font-weight: 700; font-size: 0.7rem; margin-bottom: 0.5rem;">${apt.block.toUpperCase()}</p>
                <h3>Unit ${apt.apartmentNumber}</h3>
                <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1rem;">${apt.type} • Capacity ${apt.capacity} People</p>
                
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
                    ${(apt.amenities || []).map(amenity => `
                        <span style="background: var(--teal-light); color: var(--teal-main); font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 50px; font-weight: 600;">${amenity.toUpperCase()}</span>
                    `).join('')}
                </div>

                ${(currentMode === 'admin' && apt.status === 'Occupied') ? `
                    <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <p style="font-size: 0.75rem; color: var(--text-light);">ALLOTTED TO</p>
                        <strong style="color: var(--teal-main);">${apt.occupantName}</strong>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 0.5rem;">
                    ${currentMode === 'admin' ? `
                        <button class="btn-teal" style="flex: 1.5; padding: 0.6rem; font-size: 0.8rem;" onclick="openAllotModal('${apt._id}', '${apt.occupantName || ''}', '${apt.status}', '${apt.allotmentDate || ''}')">MANAGE</button>
                        <button class="btn-teal" style="flex: 1; padding: 0.6rem; font-size: 0.8rem; background: var(--teal-dark);" onclick="openInventoryModal('${apt._id}', '${apt.apartmentNumber}')">ITEMS</button>
                        <button style="border: 1px solid #ddd; background: transparent; padding: 0.6rem; border-radius: 4px; cursor: pointer;" onclick="deleteApartment('${apt._id}')">
                            <img src="https://img.icons8.com/ios/50/ff4757/delete-forever.png" width="18"/>
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Filter by Block (from icons)
function filterByBlock(blockName) {
    const filtered = allApartments.filter(apt => apt.block === blockName);
    renderApartments(filtered);
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

function filterByStatus(status) {
    const filtered = allApartments.filter(apt => apt.status === status);
    renderApartments(filtered);
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

function showAllApartments() {
    renderApartments(allApartments);
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

// Mode Selector Logic
function changeMode(mode) {
    currentMode = mode;
    const addBtn = document.getElementById('add-unit-btn');
    const hamburgerInquiriesBtn = document.getElementById('hamburger-inquiries-btn');
    const inquiryBtn = document.getElementById('floating-inquiry-btn');
    
    if (mode === 'admin') {
        addBtn.style.display = 'block';
        hamburgerInquiriesBtn.style.display = 'flex';
        inquiryBtn.style.display = 'none';
    } else {
        addBtn.style.display = 'none';
        hamburgerInquiriesBtn.style.display = 'none';
        inquiryBtn.style.display = 'flex'; // show floating inquiry button
    }
    
    // Re-render apartments to show/hide admin buttons
    renderApartments(allApartments);
}

// Dashboard & Login Logic
function showDashboard() {
    localStorage.removeItem('userRole'); // Reset if changing role
    document.getElementById('dashboard-overlay').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // prevent scrolling behind
}

function selectRole(role) {
    localStorage.setItem('userRole', role); // Save role to persist across reloads
    changeMode(role);
    document.getElementById('dashboard-overlay').style.display = 'none';
    document.body.style.overflow = 'auto'; // restore scrolling
}

function openLoginModal(role) {
    document.getElementById('login-role').value = role;
    document.getElementById('login-title').innerText = role === 'admin' ? 'Admin Login' : 'User Login';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-form').reset();
    showModal('loginModal');
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const role = document.getElementById('login-role').value;
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    
    // Simple mock authentication
    if ((role === 'admin' && user === 'admin' && pass === 'admin') ||
        (role === 'user' && user === 'user' && pass === 'user')) {
        hideModal('loginModal');
        selectRole(role);
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
});

// Search Logic
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allApartments.filter(apt => {
        const aptNum = (apt.apartmentNumber || '').toLowerCase();
        const block = (apt.block || '').toLowerCase();
        const occupant = (apt.occupantName || '').toLowerCase();
        
        return aptNum.includes(term) || block.includes(term) || occupant.includes(term);
    });
    renderApartments(filtered);
});

// Auto-scroll on Enter
searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        scrollToResults();
    }
});

function scrollToResults() {
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

// Modal Helpers
function showModal(id) { 
    document.getElementById(id).style.display = 'block'; 
    document.body.classList.add('no-scroll');
}
function hideModal(id) { 
    document.getElementById(id).style.display = 'none'; 
    document.body.classList.remove('no-scroll');
}

function openAllotModal(id, name, status, date) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = name && name !== 'undefined' ? name : '';
    document.getElementById('edit-status').value = status;
    
    // Format date for input type="date" (YYYY-MM-DD)
    if (date && date !== 'null' && date !== 'undefined') {
        const d = new Date(date);
        const formatted = d.toISOString().split('T')[0];
        document.getElementById('edit-allot-date').value = formatted;
    } else {
        document.getElementById('edit-allot-date').value = '';
    }
    
    showModal('allotModal');
}

function openSidebar() {
    document.getElementById('inquiry-sidebar').classList.add('open');
}

function closeSidebar() {
    document.getElementById('inquiry-sidebar').classList.remove('open');
}

function toggleHamburger() {
    const drawer = document.getElementById('hamburger-drawer');
    if (drawer.style.left === '0px') {
        drawer.style.left = '-400px';
    } else {
        drawer.style.left = '0px';
    }
}

// Inventory Logic
async function openInventoryModal(aptId, aptNum) {
    document.getElementById('inv-apt-id').value = aptId;
    document.getElementById('inv-apartment-desc').innerText = `Managing items for Unit ${aptNum}`;
    showModal('inventoryModal');
    fetchInventory(aptId);
}

async function fetchInventory(aptId) {
    const res = await fetch(`${API_URL}/inventory/${aptId}`);
    const items = await res.json();
    const list = document.getElementById('item-list');
    
    if (items.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 2rem; color: #999;">No items registered for this unit.</p>';
        return;
    }

    list.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; min-width: 500px; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid #eee; font-size: 0.8rem; color: var(--text-light);">
                        <th style="padding: 1rem;">ITEM NAME</th>
                        <th style="padding: 1rem;">QTY</th>
                        <th style="padding: 1rem;">CONDITION</th>
                        <th style="padding: 1rem;">ACTION</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                            <td style="padding: 1rem; font-weight: 600;">${item.itemName}</td>
                            <td style="padding: 1rem;">${item.quantity}</td>
                            <td style="padding: 1rem;">
                                <span style="color: ${item.condition === 'Damaged' ? '#ff4757' : (item.condition === 'New' ? 'var(--flash-teal)' : 'var(--text-dark)')}">
                                    ${item.condition}
                                </span>
                            </td>
                            <td style="padding: 1rem; display: flex; gap: 0.5rem;">
                                <button onclick="editItem('${item._id}', '${item.itemName}', ${item.quantity}, '${item.condition}', '${item.apartmentId}')" style="background: none; border: none; cursor: pointer;">
                                    <img src="https://img.icons8.com/ios/50/008080/edit.png" width="16"/>
                                </button>
                                <button onclick="deleteItem('${item._id}', '${item.apartmentId}')" style="background: none; border: none; cursor: pointer;">
                                    <img src="https://img.icons8.com/ios/50/ff4757/delete-forever.png" width="16"/>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function deleteItem(id, aptId) {
    if (!confirm('Remove this item?')) return;
    await fetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
    fetchInventory(aptId);
}

function editItem(id, name, qty, cond, aptId) {
    document.getElementById('edit-item-id').value = id;
    document.getElementById('edit-item-apt-id').value = aptId;
    document.getElementById('edit-item-name').value = name;
    document.getElementById('edit-item-qty').value = qty;
    document.getElementById('edit-item-cond').value = cond;
    showModal('editItemModal');
}

async function viewHistory() {
    const id = document.getElementById('edit-id').value;
    const res = await fetch(`${API_URL}/apartments`);
    const all = await res.json();
    const apt = all.find(a => a._id === id);
    
    const list = document.getElementById('history-list');
    if (!apt.allotmentHistory || apt.allotmentHistory.length === 0) {
        list.innerHTML = '<p style="padding: 2rem; color: #999; text-align: center;">No previous allotment records found.</p>';
    } else {
        list.innerHTML = apt.allotmentHistory.reverse().map(h => `
            <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid var(--teal-main);">
                <strong style="color: var(--teal-main); display: block;">${h.occupantName}</strong>
                <p style="font-size: 0.8rem; color: var(--text-light);">
                    Allotted: ${new Date(h.allotmentDate).toLocaleDateString()} <br>
                    Vacated: ${new Date(h.vacatedDate).toLocaleDateString()}
                </p>
            </div>
        `).join('');
    }
    showModal('historyModal');
}

// Forms
document.getElementById('add-apartment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((value, key) => {
        if (key === 'amenities') {
            if (!data[key]) data[key] = [];
            data[key].push(value);
        } else {
            data[key] = value;
        }
    });

    data.capacity = data.type === '3BHK' ? 6 : (data.type === '2BHK' ? 4 : 2);
    data.floor = 0; // Default

    try {
        const res = await fetch(`${API_URL}/apartments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            hideModal('addModal');
            fetchApartments();
        }
    } catch (err) {
        alert('Error adding apartment');
    }
});

document.getElementById('edit-name').addEventListener('input', (e) => {
    const statusSelect = document.getElementById('edit-status');
    const dateInput = document.getElementById('edit-allot-date');
    if (e.target.value.trim() !== '') {
        statusSelect.value = 'Occupied';
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    } else {
        statusSelect.value = 'Available';
        dateInput.value = '';
    }
});

document.getElementById('edit-status').addEventListener('change', (e) => {
    const nameInput = document.getElementById('edit-name');
    const dateInput = document.getElementById('edit-allot-date');
    if (e.target.value === 'Available' || e.target.value === 'Maintenance') {
        nameInput.value = '';
        dateInput.value = '';
    }
});

document.getElementById('allot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const { id, ...data } = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/apartments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            hideModal('allotModal');
            fetchApartments();
        }
    } catch (err) {
        alert('Error updating allotment');
    }
});

document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Ensure quantity is a number
    data.quantity = parseInt(data.quantity);

    try {
        const res = await fetch(`${API_URL}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            e.target.reset(); // Clear the form
            hideModal('addItemModal');
            fetchInventory(data.apartmentId);
        } else {
            const errData = await res.json();
            alert('Failed to add item: ' + (errData.message || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
        alert('Connection error. Is the server running?');
    }
});

document.getElementById('edit-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const { itemId, apartmentId, ...data } = Object.fromEntries(formData.entries());
    
    data.quantity = parseInt(data.quantity);

    try {
        const res = await fetch(`${API_URL}/inventory/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (res.ok) {
            hideModal('editItemModal');
            fetchInventory(apartmentId);
        } else {
            const errData = await res.json();
            alert('Failed to update item: ' + (errData.message || 'Unknown error'));
        }
    } catch (err) {
        console.error(err);
        alert('Error updating item');
    }
});

async function deleteApartment(id) {
    if (!confirm('Delete this unit?')) return;
    await fetch(`${API_URL}/apartments/${id}`, { method: 'DELETE' });
    fetchApartments();
}

document.getElementById('inquiry-form').addEventListener('submit', (e) => {
    e.preventDefault();
    // Simulate sending inquiry to admin
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    data.date = new Date().toLocaleString();
    submittedInquiries.push(data);
    
    console.log("Inquiry sent to Admin:", data);
    alert('Thank you! Your inquiry has been sent to the Admin. You will receive a reply at ' + data.email);
    
    closeSidebar();
    e.target.reset();
});

function openAdminInquiries() {
    const list = document.getElementById('admin-inquiries-list');
    
    if (submittedInquiries.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No inquiries received yet.</p>';
    } else {
        list.innerHTML = submittedInquiries.map(inq => `
            <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 10px; margin-bottom: 1rem; border-left: 4px solid var(--teal-main);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong style="color: var(--teal-main); font-size: 1.1rem;">${inq.name}</strong>
                    <span style="font-size: 0.8rem; color: #999;">${inq.date}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.5rem;">
                    <strong>Email:</strong> <a href="mailto:${inq.email}" style="color: var(--flash-teal); text-decoration: none;">${inq.email}</a><br>
                    ${inq.phone ? `<strong>Phone:</strong> ${inq.phone}<br>` : ''}
                    ${inq.apartment ? `<strong>Apartment Interest:</strong> ${inq.apartment}` : ''}
                </p>
                <div style="background: #fff; padding: 1rem; border-radius: 5px; border: 1px solid #eee; margin-top: 1rem;">
                    <p style="font-size: 0.9rem; line-height: 1.5;">${inq.message}</p>
                </div>
            </div>
        `).join('');
    }
    
    showModal('adminInquiriesModal');
}
