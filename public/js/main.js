const API_URL = '/api';

// DOM Elements
const apartmentGrid = document.getElementById('apartment-grid');
const searchInput = document.getElementById('search-input');
let allApartments = [];
let currentMode = 'guest'; // default mode
let currentUser = null; // store current logged in username
let submittedInquiries = []; // store inquiries
let facilitiesData = {}; // store facilities status per block

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
    // Status Filter Dropdown
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            const val = e.target.value;
            // Change text color of the select based on selected value
            if (val === 'Available') e.target.style.color = '#27ae60';
            else if (val === 'Occupied') e.target.style.color = '#ff4757';
            else if (val === 'Maintenance') e.target.style.color = '#f1c40f';
            else e.target.style.color = 'var(--text-dark)';

            if (val === 'all') {
                renderApartments(allApartments);
            } else {
                filterByStatus(val);
            }
        });
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

// Initial Load logic
window.onload = () => {
    fetchApartments();
    
    // Check if the URL is /admin
    if (window.location.pathname === '/admin') {
        openLoginModal('admin');
    } else {
        // Default to guest mode
        const savedRole = localStorage.getItem('userRole');
        const savedUser = localStorage.getItem('currentUser');
        
        if (savedRole && savedUser) {
            currentUser = savedUser;
            selectRole(savedRole);
        } else {
            selectRole('guest');
        }
    }
};

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
                        <button class="btn-teal" style="flex: 1.5; padding: 0.6rem; font-size: 0.8rem;" onclick="openAllotModal('${apt._id}', '${apt.occupantName || ''}', '${apt.status}', '${apt.allotmentDate || ''}', '${apt.facultyId || ''}')">MANAGE</button>
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
    const hamburgerFacilitiesBtn = document.getElementById('hamburger-facilities-btn');
    const inquiryBtn = document.getElementById('floating-inquiry-btn');
    const hamburgerIcon = document.getElementById('hamburger-menu-icon');
    const myAptLink = document.getElementById('my-apt-link');
    const myAptSection = document.getElementById('my-apartment');
    const adminDashboard = document.getElementById('admin-dashboard');
    const mapSection = document.getElementById('campus-map-section');
    const quickFeatures = document.getElementById('quick-features');
    
    if (mode === 'admin') {
        if (adminDashboard) adminDashboard.style.display = 'block';
        if (mapSection) mapSection.style.display = 'none';
        if (quickFeatures) quickFeatures.style.display = 'none';
        
        addBtn.style.display = 'block';
        hamburgerInquiriesBtn.style.display = 'flex';
        hamburgerFacilitiesBtn.style.display = 'flex';
        inquiryBtn.style.display = 'none';
        if (hamburgerIcon) hamburgerIcon.style.display = 'block';
        if (myAptLink) myAptLink.style.display = 'none';
        if (myAptSection) myAptSection.style.display = 'none';
        
        refreshAdminDashboard();
        fetchActivities();
    } else if (mode === 'user') {
        if (adminDashboard) adminDashboard.style.display = 'none';
        if (mapSection) mapSection.style.display = 'block';
        if (quickFeatures) quickFeatures.style.display = 'none';

        addBtn.style.display = 'none';
        hamburgerInquiriesBtn.style.display = 'none';
        hamburgerFacilitiesBtn.style.display = 'none';
        inquiryBtn.style.display = 'flex';
        if (hamburgerIcon) hamburgerIcon.style.display = 'none';
        if (myAptLink) myAptLink.style.display = 'block';
        if (myAptSection) {
            myAptSection.style.display = 'block';
            renderMyApartment();
        }
    } else {
        if (adminDashboard) adminDashboard.style.display = 'none';
        if (mapSection) mapSection.style.display = 'block';
        if (quickFeatures) quickFeatures.style.display = 'block';

        addBtn.style.display = 'none';
        hamburgerInquiriesBtn.style.display = 'none';
        hamburgerFacilitiesBtn.style.display = 'none';
        inquiryBtn.style.display = 'flex';
        if (hamburgerIcon) hamburgerIcon.style.display = 'none';
        if (myAptLink) myAptLink.style.display = 'none';
        if (myAptSection) myAptSection.style.display = 'none';
    }
    
    // Re-render apartments to show/hide admin buttons
    renderApartments(allApartments);
}

async function refreshAdminDashboard() {
    try {
        // 1. Fetch Stats
        const statsRes = await fetch(`${API_URL}/stats`);
        const stats = await statsRes.json();
        
        // 2. Fetch Faculty Count
        const facRes = await fetch(`${API_URL}/faculty`);
        const faculties = await facRes.json();

        // 3. Update Stat Cards
        document.getElementById('stat-total').innerText = stats.total || 0;
        document.getElementById('stat-occupied').innerText = stats.occupied || 0;
        document.getElementById('stat-vacant').innerText = stats.available || 0;
        document.getElementById('stat-faculty').innerText = faculties.length || 0;

        const occPct = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
        const vacPct = stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0;
        
        document.getElementById('stat-occupied-pct').innerText = `${occPct}% Occupied`;
        document.getElementById('stat-vacant-pct').innerText = `${vacPct}% Vacant`;

        // 4. Update Donut Chart
        const donut = document.getElementById('occupancy-donut');
        if (donut) {
            donut.style.background = `conic-gradient(var(--teal-main) 0% ${occPct}%, #eee ${occPct}% 100%)`;
            document.getElementById('donut-pct').innerText = `${occPct}%`;
        }
        document.getElementById('legend-occupied').innerText = stats.occupied || 0;
        document.getElementById('legend-vacant').innerText = stats.available || 0;

        // 5. Populate Units Snapshot (First 5)
        const aptRes = await fetch(`${API_URL}/apartments`);
        const apartments = await aptRes.json();
        const snapshotBody = document.getElementById('snapshot-table-body');
        
        if (snapshotBody) {
            snapshotBody.innerHTML = apartments.slice(0, 5).map(a => `
                <tr>
                    <td style="font-weight: 700;">Unit ${a.apartmentNumber}</td>
                    <td>${a.type}</td>
                    <td>${a.block}</td>
                    <td>
                        <span style="color: ${a.status === 'Occupied' ? '#27ae60' : '#ff4757'}; font-weight: 600;">
                            ${a.status}
                        </span>
                    </td>
                    <td style="color: #666;">${a.occupantName || '—'}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Error refreshing dashboard:', err);
    }
}

async function fetchActivities() {
    try {
        const res = await fetch(`${API_URL}/activities`);
        const activities = await res.json();
        renderActivities(activities);
    } catch (err) {
        console.error('Error fetching activities:', err);
    }
}

function renderActivities(activities) {
    const dashboardList = document.getElementById('activities-list');
    const modalList = document.getElementById('full-activities-list');
    
    if (!dashboardList) return;

    const html = activities.length === 0 
        ? '<p style="color: #999; font-size: 0.85rem; text-align: center;">No recent activities.</p>'
        : activities.map(act => `
            <div style="display: flex; gap: 1rem; align-items: flex-start;">
                <div style="background: ${act.color}15; padding: 0.5rem; border-radius: 50%; display: flex;">
                    <img src="${act.icon}" width="20" height="20" />
                </div>
                <div>
                    <p style="font-size: 0.85rem; margin: 0; color: #333;">${act.description}</p>
                    <span style="font-size: 0.75rem; color: #999;">${formatRelativeTime(new Date(act.createdAt))}</span>
                </div>
            </div>
        `).join('');

    dashboardList.innerHTML = activities.length === 0 
        ? html 
        : activities.slice(0, 5).map(act => `
            <div style="display: flex; gap: 1rem; align-items: flex-start;">
                <div style="background: ${act.color}15; padding: 0.5rem; border-radius: 50%; display: flex;">
                    <img src="${act.icon}" width="20" height="20" />
                </div>
                <div>
                    <p style="font-size: 0.85rem; margin: 0; color: #333;">${act.description}</p>
                    <span style="font-size: 0.75rem; color: #999;">${formatRelativeTime(new Date(act.createdAt))}</span>
                </div>
            </div>
        `).join('');

    if (modalList) {
        modalList.innerHTML = html;
    }
}

function openActivitiesModal() {
    showModal('activitiesModal');
    fetchActivities(); // Refresh
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleDateString();
}

async function renderMyApartment() {
    const container = document.getElementById('my-apt-container');
    if (!currentUser) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Please log in to view your details.</p>';
        return;
    }

    // Find apartment where facultyId matches currentUser
    const myApt = allApartments.find(apt => 
        (apt.facultyId || '').toLowerCase() === currentUser.toLowerCase()
    );

    if (!myApt) {
        container.innerHTML = `
            <div style="background: #fff; padding: 3rem; border-radius: 15px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <img src="https://img.icons8.com/ios/100/008080/info.png" style="margin-bottom: 1rem;" />
                <h3 style="color: var(--teal-main);">No Allotment Found</h3>
                <p style="color: var(--text-light);">We couldn't find an apartment assigned to "${currentUser}". <br> If you believe this is an error, please contact the Admin.</p>
            </div>
        `;
        return;
    }

    // Fetch inventory for this apartment
    const invRes = await fetch(`${API_URL}/inventory/${myApt._id}`);
    const inventory = await invRes.json();
    
    // Get facilities for this block
    const facilities = facilitiesData[myApt.block] || { water: 'Available', electricity: 'Available', internet: 'Available', parking: 'Available' };

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; flex-wrap: wrap;">
            <!-- Unit Card -->
            <div style="background: #fff; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem;">
                    <div>
                        <p style="color: var(--flash-teal); font-weight: 700; font-size: 0.75rem;">${myApt.block.toUpperCase()}</p>
                        <h2 style="font-size: 2rem;">Unit ${myApt.apartmentNumber}</h2>
                    </div>
                    <span class="status-label status-Occupied">ALLOTTED</span>
                </div>
                
                <div style="margin-bottom: 2rem;">
                    <p style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 0.5rem;">AMENITIES INCLUDED</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${(myApt.amenities || []).map(a => `<span style="background: var(--teal-light); color: var(--teal-main); font-size: 0.7rem; padding: 0.3rem 0.8rem; border-radius: 50px; font-weight: 600;">${a}</span>`).join('')}
                    </div>
                </div>

                <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 10px;">
                    <p style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.2rem;">REGISTERED OCCUPANT</p>
                    <h3 style="color: var(--teal-main);">${myApt.occupantName}</h3>
                    <p style="font-size: 0.8rem; color: #999; margin-top: 0.5rem;">Allotted on: ${new Date(myApt.allotmentDate).toLocaleDateString()}</p>
                </div>
            </div>

            <!-- Facilities & Inventory Card -->
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <!-- Facilities -->
                <div style="background: #fff; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px;">
                        <img src="https://img.icons8.com/ios-filled/50/008080/settings.png" width="24" />
                        Facility Status
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        ${Object.entries(facilities).map(([key, status]) => `
                            <div style="padding: 1rem; background: #f9f9f9; border-radius: 8px;">
                                <p style="font-size: 0.7rem; color: #999; text-transform: uppercase;">${key}</p>
                                <strong style="color: ${status === 'Available' ? '#2ecc71' : '#e74c3c'}; font-size: 0.9rem;">${status}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Inventory -->
                <div style="background: #fff; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px;">
                        <img src="https://img.icons8.com/ios-filled/50/008080/box.png" width="24" />
                        Unit Inventory
                    </h3>
                    ${inventory.length === 0 ? '<p style="color: #999; font-size: 0.85rem;">No inventory items recorded.</p>' : `
                        <ul style="list-style: none; padding: 0;">
                            ${inventory.map(item => `
                                <li style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #eee;">
                                    <div>
                                        <strong style="font-size: 0.9rem;">${item.itemName}</strong>
                                        <p style="font-size: 0.75rem; color: #999;">Qty: ${item.quantity}</p>
                                    </div>
                                    <span style="font-size: 0.75rem; color: ${item.condition === 'Damaged' ? '#ff4757' : '#2ecc71'};">${item.condition}</span>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>
            </div>
        </div>
    `;
}

function selectRole(role) {
    localStorage.setItem('userRole', role); // Save role to persist across reloads
    changeMode(role);
    
    // Update Navbar Buttons
    const loginBtn = document.getElementById('nav-login-btn');
    const logoutBtn = document.getElementById('nav-logout-btn');
    
    if (role === 'guest') {
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    } else {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
    }
    
    document.body.style.overflow = 'auto'; // restore scrolling
}

function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = '/'; // Reset to guest home
}

function openLoginModal(role) {
    document.getElementById('login-role').value = role;
    document.getElementById('login-title').innerText = role === 'admin' ? 'Admin Login' : 'User Login';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-form').reset();
    showModal('loginModal');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.getElementById('login-role').value;
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        if (res.ok) {
            const data = await res.json();
            currentUser = username;
            localStorage.setItem('currentUser', username);
            localStorage.setItem('userRole', data.role);
            
            hideModal('loginModal');
            
            if (data.firstLogin) {
                showModal('changePasswordModal');
            } else {
                selectRole(data.role);
            }
        } else {
            const err = await res.json();
            document.getElementById('login-error').innerText = err.message || 'Login failed';
            document.getElementById('login-error').style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        alert('Connection error');
    }
});

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    
    if (newPass !== confirmPass) {
        alert('Passwords do not match');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/faculty/change-password`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facultyId: currentUser, newPassword: newPass })
        });

        if (res.ok) {
            alert('Password updated successfully!');
            hideModal('changePasswordModal');
            selectRole('user');
        }
    } catch (err) {
        alert('Error updating password');
    }
});

document.getElementById('add-faculty-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${API_URL}/faculty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            alert('Faculty account created successfully!');
            hideModal('addFacultyModal');
            openTenantsPage(); // Refresh table
            fetchActivities(); // Refresh activities
        } else {
            const err = await res.json();
            alert(err.message);
        }
    } catch (err) {
        alert('Error creating account');
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

function openAllotModal(id, name, status, date, facultyId) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-faculty-id').value = facultyId && facultyId !== 'undefined' ? facultyId : '';
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
            fetchActivities(); // Refresh activities
        } else {
            const errData = await res.json();
            alert('Failed to add apartment: ' + (errData.message || 'Unknown error'));
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
            fetchActivities(); // Refresh activities
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

// Facilities Management Logic
const facilitiesConfig = [
    { key: 'water', label: 'Water Supply', icon: 'https://img.icons8.com/ios-filled/50/4a90e2/water.png' },
    { key: 'electricity', label: 'Electricity', icon: 'https://img.icons8.com/ios-filled/50/4a90e2/flash-on.png' },
    { key: 'internet', label: 'Internet', icon: 'https://img.icons8.com/ios-filled/50/4a90e2/wifi--v1.png' },
    { key: 'parking', label: 'Parking', icon: 'https://img.icons8.com/ios-filled/50/4a90e2/parking.png' }
];

function openFacilitiesModal() {
    renderFacilitiesForm();
    showModal('facilitiesModal');
}

function renderFacilitiesForm() {
    const block = document.getElementById('facility-block-select').value;
    const list = document.getElementById('facilities-list');
    
    // Initialize if empty
    if (!facilitiesData[block]) {
        facilitiesData[block] = { water: 'Available', electricity: 'Available', internet: 'Available', parking: 'Available' };
    }
    
    const data = facilitiesData[block];
    
    list.innerHTML = facilitiesConfig.map(f => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #f9f9f9; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <img src="${f.icon}" width="20" />
                <span style="font-weight: 600; font-size: 0.95rem;">${f.label}</span>
            </div>
            <select id="fac-${f.key}" style="padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd; font-weight: 600; color: ${data[f.key] === 'Available' ? '#2ecc71' : (data[f.key] === 'Under Maintenance' ? '#e67e22' : '#e74c3c')};">
                <option value="Available" ${data[f.key] === 'Available' ? 'selected' : ''}>Available</option>
                <option value="Under Maintenance" ${data[f.key] === 'Under Maintenance' ? 'selected' : ''}>Under Maintenance</option>
                <option value="Unavailable" ${data[f.key] === 'Unavailable' ? 'selected' : ''}>Unavailable</option>
            </select>
        </div>
    `).join('');
    
    // Add event listeners to select elements to change their color dynamically
    facilitiesConfig.forEach(f => {
        const select = document.getElementById(`fac-${f.key}`);
        select.addEventListener('change', (e) => {
            const val = e.target.value;
            e.target.style.color = val === 'Available' ? '#2ecc71' : (val === 'Under Maintenance' ? '#e67e22' : '#e74c3c');
        });
    });
}

function saveFacilities() {
    const block = document.getElementById('facility-block-select').value;
    
    facilitiesConfig.forEach(f => {
        facilitiesData[block][f.key] = document.getElementById(`fac-${f.key}`).value;
    });
    
    alert(`Facilities status for ${block} updated successfully!`);
    hideModal('facilitiesModal');
}

// Management Pages Logic
async function openTenantsPage() {
    hideAllAdminPages();
    document.getElementById('tenantsPage').style.display = 'block';
    const res = await fetch(`${API_URL}/faculty`);
    const faculties = await res.json();
    const container = document.getElementById('tenants-table-container');
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Faculty ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${faculties.map(f => `
                    <tr>
                        <td style="font-weight: 700;">${f.facultyId}</td>
                        <td>${f.name}</td>
                        <td>${f.role}</td>
                        <td>${f.department}</td>
                        <td>
                            <span style="color: #27ae60; font-weight: 600;">
                                Active
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function openGlobalInventory() {
    hideAllAdminPages();
    document.getElementById('globalInventoryPage').style.display = 'block';
    const res = await fetch(`${API_URL}/inventory`);
    const items = await res.json();
    const container = document.getElementById('global-inventory-table-container');
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Condition</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(i => `
                    <tr>
                        <td style="font-weight: 600;">${i.itemName}</td>
                        <td>${i.quantity}</td>
                        <td>
                            <span style="color: ${i.condition === 'Good' ? '#27ae60' : '#ff4757'}; font-weight: 600;">
                                ${i.condition}
                            </span>
                        </td>
                        <td>
                            <button class="action-icon-btn" onclick="editItem('${i._id}', '${i.itemName}', '${i.quantity}', '${i.condition}')">
                                <img src="https://img.icons8.com/ios-glyphs/24/008080/edit.png" width="18"/>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function openManageApartments() {
    hideAllAdminPages();
    document.getElementById('manageApartmentsPage').style.display = 'block';
    const res = await fetch(`${API_URL}/apartments`);
    const apartments = await res.json();
    const container = document.getElementById('apartments-table-container');
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Unit No.</th>
                    <th>Block</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Occupant</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${apartments.map(a => `
                    <tr>
                        <td style="font-weight: 700;">Unit ${a.apartmentNumber}</td>
                        <td>${a.block}</td>
                        <td>${a.type}</td>
                        <td>
                            <span style="color: ${a.status === 'Occupied' ? '#27ae60' : '#ff4757'}; font-weight: 600;">
                                ${a.status}
                            </span>
                        </td>
                        <td>${a.occupantName || '—'}</td>
                        <td style="display: flex; gap: 0.5rem;">
                            <button class="action-icon-btn" title="Manage Allotment" onclick="openAllotModal('${a._id}', '${a.apartmentNumber}', '${a.occupantName || ''}', '${a.facultyId || ''}', '${a.status}', '${(a.allotmentDate || '').split('T')[0]}')">
                                <img src="https://img.icons8.com/ios-glyphs/24/008080/key.png" width="18"/>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function hideAllAdminPages() {
    const pages = ['tenantsPage', 'globalInventoryPage', 'manageApartmentsPage', 'admin-dashboard', 'campus-map-section'];
    pages.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function showAdminDashboard() {
    hideAllAdminPages();
    document.getElementById('admin-dashboard').style.display = 'block';
    refreshAdminDashboard();
}
