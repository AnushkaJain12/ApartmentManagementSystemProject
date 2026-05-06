const API_URL = "/api";

const apartmentGrid = document.getElementById("apartment-grid");
const searchInput = document.getElementById("search-input");

let allApartments = [];
let currentMode = "guest";
let currentUser = null;
let facilitiesData = JSON.parse(localStorage.getItem("facilitiesData")) || {};

let currentFilters = {
  term: "",
  status: "all",
  block: "all",
};

window.addEventListener("scroll", () => {
  const nav = document.querySelector(".glass-nav");
  const sections = document.querySelectorAll("header, section");
  const navLinks = document.querySelectorAll(".nav-links a");

  if (window.scrollY > 50) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }

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

document.addEventListener("DOMContentLoaded", () => {
  const savedRole = localStorage.getItem("userRole");
  if (savedRole) {
    selectRole(savedRole);
  } else {
    showDashboard();
  }

  const statusFilter = document.getElementById("status-filter");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentFilters.status = e.target.value;

      if (currentFilters.status === "Available")
        e.target.style.color = "#27ae60";
      else if (currentFilters.status === "Occupied")
        e.target.style.color = "#ff4757";
      else if (currentFilters.status === "Maintenance")
        e.target.style.color = "#f1c40f";
      else e.target.style.color = "var(--text-dark)";

      applyFilters();
    });
  }

  getUnits();

  const mobileMenu = document.getElementById("mobile-menu");
  const navLinksContainer = document.getElementById("nav-links");

  if (mobileMenu) {
    mobileMenu.addEventListener("click", () => {
      navLinksContainer.classList.toggle("active");
      mobileMenu.classList.toggle("is-active");
    });
  }

  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinksContainer.classList.remove("active");
      mobileMenu.classList.remove("is-active");
    });
  });
});

window.onload = () => {
  if (window.location.pathname === "/admin") {
    openLoginModal("admin");
  } else {
    const savedRole = localStorage.getItem("userRole");
    const savedUser = localStorage.getItem("currentUser");

    if (savedRole && savedUser) {
      currentUser = savedUser;
      selectRole(savedRole);
    } else {
      selectRole("guest");
    }
  }
};

async function getUnits() {
  try {
    const res = await fetch(`${API_URL}/apartments`);
    allApartments = await res.json();
    applyFilters();
  } catch (err) {
    console.error("Error fetching apartments:", err);
  }
}

function showUnits(apartments) {
  if (apartments.length === 0) {
    apartmentGrid.innerHTML =
      '<div class="no-data">No residences found matching your criteria.</div>';
    return;
  }

  apartmentGrid.innerHTML = apartments
    .map(
      (apt) => `
        <div class="apt-card">
            <div class="card-img">
                <span class="status-label status-${apt.status}">${apt.status}</span>
            </div>
            <div class="card-content">
                <p style="color: var(--flash-teal); font-weight: 700; font-size: 0.7rem; margin-bottom: 0.5rem;">${apt.block.toUpperCase()}</p>
                <h3>Unit ${apt.apartmentNumber}</h3>
                <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1rem;">${apt.type} • Capacity ${apt.capacity} People</p>

                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem;">
                    ${(apt.amenities || [])
                      .map(
                        (amenity) => `
                        <span style="background: var(--teal-light); color: var(--teal-main); font-size: 0.65rem; padding: 0.2rem 0.6rem; border-radius: 50px; font-weight: 600;">${amenity.toUpperCase()}</span>
                    `,
                      )
                      .join("")}
                </div>

                ${
                  currentMode === "admin" && apt.status === "Occupied"
                    ? `
                    <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <p style="font-size: 0.75rem; color: var(--text-light);">ALLOTTED TO</p>
                        <strong style="color: var(--teal-main);">${apt.occupantName}</strong>
                    </div>
                `
                    : ""
                }

                <div style="display: flex; gap: 0.5rem;">
                    ${
                      currentMode === "admin"
                        ? `
                        <button class="btn-teal" style="flex: 1.5; padding: 0.6rem; font-size: 0.8rem;" onclick="openAllotModal('${apt._id}', '${apt.occupantName || ""}', '${apt.status}', '${apt.allotmentDate || ""}', '${apt.facultyId || ""}')">MANAGE</button>
                        <button class="btn-teal" style="flex: 1; padding: 0.6rem; font-size: 0.8rem; background: var(--teal-dark);" onclick="openInventoryModal('${apt._id}', '${apt.apartmentNumber}')">ITEMS</button>
                        <button style="border: 1px solid #ddd; background: transparent; padding: 0.6rem; border-radius: 4px; cursor: pointer;" onclick="deleteUnit('${apt._id}')">
                            <img src="https://img.icons8.com/ios/50/ff4757/delete-forever.png" width="18"/>
                        </button>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
    `,
    )
    .join("");
}

function applyFilters() {
  let filtered = allApartments;

  if (currentFilters.term) {
    const term = currentFilters.term.toLowerCase();
    filtered = filtered.filter((apt) => {
      const aptNum = (apt.apartmentNumber || "").toLowerCase();
      const block = (apt.block || "").toLowerCase();
      const occupant = (apt.occupantName || "").toLowerCase();
      return (
        aptNum.includes(term) || block.includes(term) || occupant.includes(term)
      );
    });
  }

  if (currentFilters.status !== "all") {
    filtered = filtered.filter((apt) => apt.status === currentFilters.status);
  }

  if (currentFilters.block !== "all") {
    filtered = filtered.filter((apt) => apt.block === currentFilters.block);
  }

  showUnits(filtered);
}

function filterByBlock(blockName) {
  currentFilters.block = blockName;
  applyFilters();
  document.getElementById("inventory").scrollIntoView({ behavior: "smooth" });
}

function filterByStatus(status) {
  currentFilters.status = status;
  applyFilters();
  document.getElementById("inventory").scrollIntoView({ behavior: "smooth" });
}

function showAllApartments() {
  currentFilters = { term: "", status: "all", block: "all" };
  if (searchInput) searchInput.value = "";

  const statusFilter = document.getElementById("status-filter");
  if (statusFilter) {
    statusFilter.value = "all";
    statusFilter.style.color = "var(--text-dark)";
  }
  applyFilters();
  document.getElementById("inventory").scrollIntoView({ behavior: "smooth" });
}

function changeMode(mode) {
  currentMode = mode;

  const addBtn = document.getElementById("add-unit-btn");
  const hamburgerInquiriesBtn = document.getElementById(
    "hamburger-inquiries-btn",
  );
  const hamburgerFacilitiesBtn = document.getElementById(
    "hamburger-facilities-btn",
  );
  const inquiryBtn = document.getElementById("floating-inquiry-btn");
  const hamburgerIcon = document.getElementById("hamburger-menu-icon");
  const myAptLink = document.getElementById("my-apt-link");
  const myAptSection = document.getElementById("my-apartment");
  const adminDashboard = document.getElementById("admin-dashboard");
  const mapSection = document.getElementById("campus-map-section");
  const quickFeatures = document.getElementById("quick-features");
  const inventorySection = document.getElementById("inventory");
  const categoriesSection = document.getElementById("categories-section");
  const heroSearchBar = document.getElementById("hero-search-bar");

  if (mode === "admin") {
    if (adminDashboard) adminDashboard.style.display = "block";
    if (mapSection) mapSection.style.display = "none";
    if (quickFeatures) quickFeatures.style.display = "none";

    addBtn.style.display = "block";
    hamburgerInquiriesBtn.style.display = "flex";
    hamburgerFacilitiesBtn.style.display = "flex";
    inquiryBtn.style.display = "none";
    if (hamburgerIcon) hamburgerIcon.style.display = "block";
    if (myAptLink) myAptLink.style.display = "none";
    if (myAptSection) myAptSection.style.display = "none";
    if (inventorySection) inventorySection.style.display = "block";
    if (categoriesSection) categoriesSection.style.display = "flex";
    if (heroSearchBar) heroSearchBar.style.display = "none";

    loadAdminDashboard();
    loadActivities();
  } else if (mode === "user") {
    if (adminDashboard) adminDashboard.style.display = "none";
    if (mapSection) mapSection.style.display = "block";
    if (quickFeatures) quickFeatures.style.display = "none";

    addBtn.style.display = "none";
    hamburgerInquiriesBtn.style.display = "none";
    hamburgerFacilitiesBtn.style.display = "none";
    inquiryBtn.style.display = "flex";
    if (hamburgerIcon) hamburgerIcon.style.display = "none";
    if (myAptLink) myAptLink.style.display = "block";
    if (myAptSection) {
      myAptSection.style.display = "block";
      showMyApartment();
    }
    if (inventorySection) inventorySection.style.display = "none";
    if (categoriesSection) categoriesSection.style.display = "none";
    if (heroSearchBar) heroSearchBar.style.display = "none";
  } else {
    if (adminDashboard) adminDashboard.style.display = "none";
    if (mapSection) mapSection.style.display = "block";
    if (quickFeatures) quickFeatures.style.display = "block";

    addBtn.style.display = "none";
    hamburgerInquiriesBtn.style.display = "none";
    hamburgerFacilitiesBtn.style.display = "none";
    inquiryBtn.style.display = "flex";
    if (hamburgerIcon) hamburgerIcon.style.display = "none";
    if (myAptLink) myAptLink.style.display = "none";
    if (myAptSection) myAptSection.style.display = "none";
    if (inventorySection) inventorySection.style.display = "block";
    if (categoriesSection) categoriesSection.style.display = "flex";
    if (heroSearchBar) heroSearchBar.style.display = "flex";
  }

  applyFilters();
}

async function loadAdminDashboard() {
  try {
    const statsRes = await fetch(`${API_URL}/stats`);
    const stats = await statsRes.json();

    const facRes = await fetch(`${API_URL}/faculty`);
    const facultyList = await facRes.json();

    document.getElementById("stat-total").innerText = stats.total || 0;
    document.getElementById("stat-occupied").innerText = stats.occupied || 0;
    document.getElementById("stat-vacant").innerText = stats.available || 0;
    document.getElementById("stat-faculty").innerText = facultyList.length || 0;

    const occupiedPct =
      stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;
    const vacantPct =
      stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0;

    document.getElementById("stat-occupied-pct").innerText =
      `${occupiedPct}% Occupied`;
    document.getElementById("stat-vacant-pct").innerText =
      `${vacantPct}% Vacant`;

    const donut = document.getElementById("occupancy-donut");
    if (donut) {
      donut.style.background = `conic-gradient(var(--teal-main) 0% ${occupiedPct}%, #eee ${occupiedPct}% 100%)`;
      document.getElementById("donut-pct").innerText = `${occupiedPct}%`;
    }
    document.getElementById("legend-occupied").innerText = stats.occupied || 0;
    document.getElementById("legend-vacant").innerText = stats.available || 0;

    const aptRes = await fetch(`${API_URL}/apartments`);
    const apartments = await aptRes.json();
    const snapshotBody = document.getElementById("snapshot-table-body");

    if (snapshotBody) {
      snapshotBody.innerHTML = apartments
        .slice(0, 5)
        .map(
          (a) => `
                <tr>
                    <td style="font-weight: 700;">Unit ${a.apartmentNumber}</td>
                    <td>${a.type}</td>
                    <td>${a.block}</td>
                    <td>
                        <span style="color: ${a.status === "Occupied" ? "#27ae60" : "#ff4757"}; font-weight: 600;">
                            ${a.status}
                        </span>
                    </td>
                    <td style="color: #666;">${a.occupantName || "—"}</td>
                </tr>
            `,
        )
        .join("");
    }
  } catch (err) {
    console.error("Error loading dashboard:", err);
  }
}

function refreshAdminDashboard() {
  loadAdminDashboard();
}

async function loadActivities() {
  try {
    const res = await fetch(`${API_URL}/activities`);
    const activities = await res.json();
    showActivities(activities);
  } catch (err) {
    console.error("Error fetching activities:", err);
  }
}

function fetchActivities() {
  loadActivities();
}

function showActivities(activities) {
  const dashboardList = document.getElementById("activities-list");
  const modalList = document.getElementById("full-activities-list");

  if (!dashboardList) return;

  function makeActivityItem(act) {
    return `
            <div style="display: flex; gap: 1rem; align-items: flex-start;">
                <div style="background: ${act.color}15; padding: 0.5rem; border-radius: 50%; display: flex;">
                    <img src="${act.icon}" width="20" height="20" />
                </div>
                <div>
                    <p style="font-size: 0.85rem; margin: 0; color: #333;">${act.description}</p>
                    <span style="font-size: 0.75rem; color: #999;">${getRelativeTime(new Date(act.createdAt))}</span>
                </div>
            </div>
        `;
  }

  if (activities.length === 0) {
    dashboardList.innerHTML =
      '<p style="color: #999; font-size: 0.85rem; text-align: center;">No recent activities.</p>';
  } else {
    dashboardList.innerHTML = activities
      .slice(0, 5)
      .map(makeActivityItem)
      .join("");
  }

  if (modalList) {
    modalList.innerHTML =
      activities.length === 0
        ? '<p style="color: #999; font-size: 0.85rem; text-align: center;">No recent activities.</p>'
        : activities.map(makeActivityItem).join("");
  }
}

function openActivitiesModal() {
  showModal("activitiesModal");
  loadActivities();
}

function getRelativeTime(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}

function formatRelativeTime(date) {
  return getRelativeTime(date);
}

async function showMyApartment() {
  const container = document.getElementById("my-apt-container");
  if (!currentUser) {
    container.innerHTML =
      '<p style="text-align: center; padding: 2rem;">Please log in to view your details.</p>';
    return;
  }

  const res = await fetch(`${API_URL}/apartments`);
  allApartments = await res.json();

  const myApt = allApartments.find(
    (apt) => (apt.facultyId || "").toLowerCase() === currentUser.toLowerCase(),
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

  const invRes = await fetch(`${API_URL}/inventory/${myApt._id}`);
  const inventory = await invRes.json();

  facilitiesData = JSON.parse(localStorage.getItem("facilitiesData")) || {};
  const facilities = facilitiesData[myApt.block] || {
    water: "Available",
    electricity: "Available",
    internet: "Available",
    parking: "Available",
  };

  container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; flex-wrap: wrap;">
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
                        ${(myApt.amenities || []).map((a) => `<span style="background: var(--teal-light); color: var(--teal-main); font-size: 0.7rem; padding: 0.3rem 0.8rem; border-radius: 50px; font-weight: 600;">${a}</span>`).join("")}
                    </div>
                </div>

                <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 10px;">
                    <p style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 0.2rem;">REGISTERED OCCUPANT</p>
                    <h3 style="color: var(--teal-main);">${myApt.occupantName}</h3>
                    <p style="font-size: 0.8rem; color: #999; margin-top: 0.5rem;">Allotted on: ${new Date(myApt.allotmentDate).toLocaleDateString()}</p>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 2rem;">
                <div style="background: #fff; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px;">
                        <img src="https://img.icons8.com/ios-filled/50/008080/settings.png" width="24" />
                        Facility Status
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        ${Object.entries(facilities)
                          .map(
                            ([key, status]) => `
                            <div style="padding: 1rem; background: #f9f9f9; border-radius: 8px;">
                                <p style="font-size: 0.7rem; color: #999; text-transform: uppercase;">${key}</p>
                                <strong style="color: ${status === "Available" ? "#2ecc71" : "#e74c3c"}; font-size: 0.9rem;">${status}</strong>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>

                <div style="background: #fff; padding: 2rem; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <h3 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px;">
                        <img src="https://img.icons8.com/ios-filled/50/008080/box.png" width="24" />
                        Unit Inventory
                    </h3>
                    ${
                      inventory.length === 0
                        ? '<p style="color: #999; font-size: 0.85rem;">No inventory items recorded.</p>'
                        : `
                        <ul style="list-style: none; padding: 0;">
                            ${inventory
                              .map(
                                (item) => `
                                <li style="display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px solid #eee;">
                                    <div>
                                        <strong style="font-size: 0.9rem;">${item.itemName}</strong>
                                        <p style="font-size: 0.75rem; color: #999;">Qty: ${item.quantity}</p>
                                    </div>
                                    <span style="font-size: 0.75rem; color: ${item.condition === "Damaged" ? "#ff4757" : "#2ecc71"};">${item.condition}</span>
                                </li>
                            `,
                              )
                              .join("")}
                        </ul>
                    `
                    }
                </div>
            </div>
        </div>
    `;
}

function renderMyApartment() {
  showMyApartment();
}

function selectRole(role) {
  localStorage.setItem("userRole", role);
  changeMode(role);

  const loginBtn = document.getElementById("nav-login-btn");
  const logoutBtn = document.getElementById("nav-logout-btn");

  if (role === "guest") {
    if (loginBtn) loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
  } else {
    if (loginBtn) loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";
  }

  document.body.style.overflow = "auto";
}

function logout() {
  localStorage.removeItem("userRole");
  localStorage.removeItem("currentUser");
  currentUser = null;
  window.location.href = "/";
}

function openLoginModal(role) {
  document.getElementById("login-role").value = role;
  document.getElementById("login-title").innerText =
    role === "admin" ? "Admin Login" : "User Login";
  document.getElementById("login-error").style.display = "none";
  document.getElementById("login-form").reset();
  showModal("loginModal");
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const role = document.getElementById("login-role").value;
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = username;
      localStorage.setItem("currentUser", username);
      localStorage.setItem("userRole", data.role);
      hideModal("loginModal");

      if (data.firstLogin) {
        showModal("changePasswordModal");
      } else {
        selectRole(data.role);
      }
    } else {
      const err = await res.json();
      document.getElementById("login-error").innerText =
        err.message || "Login failed";
      document.getElementById("login-error").style.display = "block";
    }
  } catch (err) {
    console.error(err);
    alert("Connection error");
  }
});

document
  .getElementById("change-password-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPass = document.getElementById("new-password").value;
    const confirmPass = document.getElementById("confirm-password").value;

    if (newPass !== confirmPass) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/faculty/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facultyId: currentUser, newPassword: newPass }),
      });

      if (res.ok) {
        alert("Password updated successfully!");
        hideModal("changePasswordModal");
        selectRole("user");
      }
    } catch (err) {
      alert("Error updating password");
    }
  });

searchInput.addEventListener("input", (e) => {
  currentFilters.term = e.target.value;
  applyFilters();
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("inventory").scrollIntoView({ behavior: "smooth" });
  }
});

function scrollToResults() {
  document.getElementById("inventory").scrollIntoView({ behavior: "smooth" });
}

function showModal(id) {
  document.getElementById(id).style.display = "block";
  document.body.classList.add("no-scroll");
  if (id === "addModal") {
    updateTypeOptions();
  }
}

function hideModal(id) {
  document.getElementById(id).style.display = "none";
  document.body.classList.remove("no-scroll");
}

function closeAllModals() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((m) => (m.style.display = "none"));
  document.body.classList.remove("no-scroll");
}

function updateTypeOptions() {
  const blockSelect = document.getElementById("add-apt-block-select");
  const typeSelect = document.getElementById("add-apt-type-select");
  if (!blockSelect || !typeSelect) return;

  const block = blockSelect.value;
  let options = [];

  if (block === "Professor Housing") {
    options = ["3BHK"];
  } else if (block === "Associate Professor Housing") {
    options = ["2BHK", "3BHK"];
  } else if (block === "Assistant Professor Housing") {
    options = ["1BHK", "2BHK"];
  } else {
    options = ["1BHK", "2BHK", "3BHK"];
  }

  typeSelect.innerHTML = options
    .map((opt) => `<option value="${opt}">${opt}</option>`)
    .join("");
}

function openAllotModal(id, name, status, date, facultyId) {
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-faculty-id").value =
    facultyId && facultyId !== "undefined" ? facultyId : "";
  document.getElementById("edit-status").value = status;

  const facultyInput = document.getElementById("edit-faculty-id");
  const dateInput = document.getElementById("edit-allot-date");
  const facultyGroup = facultyInput.closest(".form-group");
  const dateGroup = dateInput.closest(".form-group");

  if (status === "Available" || status === "Maintenance") {
    facultyGroup.style.display = "none";
    dateGroup.style.display = "none";
  } else {
    facultyGroup.style.display = "block";
    dateGroup.style.display = "block";
  }

  if (date && date !== "null" && date !== "undefined") {
    const d = new Date(date);
    dateInput.value = d.toISOString().split("T")[0];
  } else {
    dateInput.value = "";
  }

  showModal("allotModal");
}

function openSidebar() {
  document.getElementById("inquiry-sidebar").classList.add("open");
}

function closeSidebar() {
  document.getElementById("inquiry-sidebar").classList.remove("open");
}

function toggleHamburger() {
  const drawer = document.getElementById("hamburger-drawer");
  if (drawer.style.left === "0px") {
    drawer.style.left = "-400px";
  } else {
    drawer.style.left = "0px";
  }
}

async function openInventoryModal(aptId, aptNum) {
  document.getElementById("inv-apt-id").value = aptId;
  document.getElementById("inv-apartment-desc").innerText =
    `Managing items for Unit ${aptNum}`;
  showModal("inventoryModal");
  loadInventoryItems(aptId);
}

async function loadInventoryItems(aptId) {
  const res = await fetch(`${API_URL}/inventory/${aptId}`);
  const items = await res.json();
  const list = document.getElementById("item-list");

  if (items.length === 0) {
    list.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: #999;">No items registered for this unit.</p>';
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
                    ${items
                      .map(
                        (item) => `
                        <tr style="border-bottom: 1px solid #eee; font-size: 0.9rem;">
                            <td style="padding: 1rem; font-weight: 600;">${item.itemName}</td>
                            <td style="padding: 1rem;">${item.quantity}</td>
                            <td style="padding: 1rem;">
                                <span style="color: ${item.condition === "Damaged" ? "#ff4757" : item.condition === "New" ? "var(--flash-teal)" : "var(--text-dark)"}">
                                    ${item.condition}
                                </span>
                            </td>
                            <td style="padding: 1rem; display: flex; gap: 0.5rem;">
                                <button onclick="openEditItem('${item._id}', '${item.itemName}', ${item.quantity}, '${item.condition}', '${item.apartmentId}')" style="background: none; border: none; cursor: pointer;">
                                    <img src="https://img.icons8.com/ios/50/008080/edit.png" width="16"/>
                                </button>
                                <button onclick="removeItem('${item._id}', '${item.apartmentId}')" style="background: none; border: none; cursor: pointer;">
                                    <img src="https://img.icons8.com/ios/50/ff4757/delete-forever.png" width="16"/>
                                </button>
                            </td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
    `;
}

function fetchInventory(aptId) {
  loadInventoryItems(aptId);
}

async function removeItem(id, aptId) {
  if (!confirm("Remove this item?")) return;
  await fetch(`${API_URL}/inventory/${id}`, { method: "DELETE" });
  loadInventoryItems(aptId);
}

function deleteItem(id, aptId) {
  removeItem(id, aptId);
}

function openEditItem(id, name, qty, cond, aptId) {
  document.getElementById("edit-item-id").value = id;
  document.getElementById("edit-item-apt-id").value = aptId;
  document.getElementById("edit-item-name").value = name;
  document.getElementById("edit-item-qty").value = qty;
  document.getElementById("edit-item-cond").value = cond;
  showModal("editItemModal");
}

function editItem(id, name, qty, cond, aptId) {
  openEditItem(id, name, qty, cond, aptId);
}

async function viewHistory() {
  const id = document.getElementById("edit-id").value;
  const res = await fetch(`${API_URL}/apartments`);
  const allApts = await res.json();
  const apt = allApts.find((a) => a._id === id);

  const list = document.getElementById("history-list");

  if (!apt.allotmentHistory || apt.allotmentHistory.length === 0) {
    list.innerHTML =
      '<p style="padding: 2rem; color: #999; text-align: center;">No previous allotment records found.</p>';
  } else {
    list.innerHTML = apt.allotmentHistory
      .reverse()
      .map(
        (h) => `
            <div style="background: #f9f9f9; padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid var(--teal-main);">
                <strong style="color: var(--teal-main); display: block;">${h.occupantName}</strong>
                <p style="font-size: 0.8rem; color: var(--text-light);">
                    Allotted: ${new Date(h.allotmentDate).toLocaleDateString()} <br>
                    Vacated: ${new Date(h.vacatedDate).toLocaleDateString()}
                </p>
            </div>
        `,
      )
      .join("");
  }
  showModal("historyModal");
}

function checkUnitNumber() {
  const unitInput = document.getElementById("add-apt-num-input");
  const blockInput = document.getElementById("add-apt-block-select");
  const errorMsg = document.getElementById("unit-error");

  if (!unitInput || !blockInput || !errorMsg) return;

  const unitVal = unitInput.value;
  const blockVal = blockInput.value;

  if (unitVal.trim() === "") {
    errorMsg.style.display = "none";
    return;
  }

  const alreadyExists = allApartments.some(
    (a) => a.apartmentNumber == unitVal && a.block === blockVal,
  );
  if (alreadyExists) {
    errorMsg.style.display = "block";
  } else {
    errorMsg.style.display = "none";
  }
}

document
  .getElementById("add-apartment-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const unitVal = document.getElementById("add-apt-num-input").value;
    const blockVal = document.getElementById("add-apt-block-select").value;

    const alreadyExists = allApartments.some(
      (a) => a.apartmentNumber == unitVal && a.block === blockVal,
    );
    if (alreadyExists) {
      alert(
        "Cannot register unit. This unit number already exists in the selected block!",
      );
      return;
    }

    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((value, key) => {
      if (key === "amenities") {
        if (!data[key]) data[key] = [];
        data[key].push(value);
      } else {
        data[key] = value;
      }
    });

    data.capacity = data.type === "3BHK" ? 6 : data.type === "2BHK" ? 4 : 2;
    data.floor = 0;

    try {
      const res = await fetch(`${API_URL}/apartments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        hideModal("addModal");
        getUnits();
        loadActivities();
      } else {
        const errData = await res.json();
        alert(
          "Failed to add apartment: " + (errData.message || "Unknown error"),
        );
      }
    } catch (err) {
      alert("Error adding apartment");
    }
  });

document.getElementById("edit-faculty-id").addEventListener("input", (e) => {
  const statusSelect = document.getElementById("edit-status");
  const dateInput = document.getElementById("edit-allot-date");

  if (e.target.value.trim() !== "") {
    statusSelect.value = "Occupied";
    statusSelect.dispatchEvent(new Event("change"));

    if (!dateInput.value) {
      dateInput.value = new Date().toISOString().split("T")[0];
    }
  }
});

document.getElementById("edit-status").addEventListener("change", (e) => {
  const facultyInput = document.getElementById("edit-faculty-id");
  const dateInput = document.getElementById("edit-allot-date");
  const facultyGroup = facultyInput.closest(".form-group");
  const dateGroup = dateInput.closest(".form-group");

  if (e.target.value === "Available" || e.target.value === "Maintenance") {
    facultyInput.value = "";
    dateInput.value = "";
    facultyGroup.style.display = "none";
    dateGroup.style.display = "none";
  } else {
    facultyGroup.style.display = "block";
    dateGroup.style.display = "block";
  }
});

document.getElementById("allot-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const { id, ...data } = Object.fromEntries(formData.entries());

  try {
    const res = await fetch(`${API_URL}/apartments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      hideModal("allotModal");
      getUnits();
      loadActivities();
    } else {
      const errData = await res.json();
      alert(
        "Failed to update allotment: " + (errData.message || "Unknown error"),
      );
    }
  } catch (err) {
    alert("Error updating allotment");
  }
});

document
  .getElementById("add-item-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (/\d/.test(data.itemName)) {
      alert(
        "Item name is not proper. Please enter a proper name without numbers.",
      );
      return;
    }

    data.quantity = parseInt(data.quantity);

    try {
      const res = await fetch(`${API_URL}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        e.target.reset();
        hideModal("addItemModal");
        loadInventoryItems(data.apartmentId);
      } else {
        const errData = await res.json();
        alert("Failed to add item: " + (errData.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Connection error. Is the server running?");
    }
  });

document
  .getElementById("edit-item-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const { itemId, apartmentId, ...data } = Object.fromEntries(
      formData.entries(),
    );

    if (/\d/.test(data.itemName)) {
      alert(
        "Item name is not proper. Please enter a proper name without numbers.",
      );
      return;
    }

    data.quantity = parseInt(data.quantity);

    try {
      const res = await fetch(`${API_URL}/inventory/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        hideModal("editItemModal");
        loadInventoryItems(apartmentId);
      } else {
        const errData = await res.json();
        alert("Failed to update item: " + (errData.message || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error updating item");
    }
  });

async function deleteUnit(id) {
  if (!confirm("Delete this unit?")) return;
  await fetch(`${API_URL}/apartments/${id}`, { method: "DELETE" });
  getUnits();
}

function deleteApartment(id) {
  deleteUnit(id);
}

document.getElementById("inquiry-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  data.date = new Date().toLocaleString();

  let inquiries = JSON.parse(localStorage.getItem("submittedInquiries")) || [];
  inquiries.push(data);
  localStorage.setItem("submittedInquiries", JSON.stringify(inquiries));

  alert("Thank you! Your inquiry has been sent to the Admin.");
  closeSidebar();
  e.target.reset();
});

function hideAllAdminPages() {
  const pages = ["admin-dashboard", "campus-map-section"];
  pages.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}

function showAdminDashboard() {
  hideAllAdminPages();
  document.getElementById("admin-dashboard").style.display = "block";
  loadAdminDashboard();
}
