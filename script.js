/******************************
 * STORAGE KEYS & STATE
 ******************************/
const STORAGE_PROFILES = 'jastip_profiles';       // Array of profiles
const STORAGE_CURRENT = 'jastip_current_profile'; // ID of current profile

let profiles = JSON.parse(localStorage.getItem(STORAGE_PROFILES) || '[]');
let currentProfileId = localStorage.getItem(STORAGE_CURRENT) || null;

let PRODUCTS = [];
let currentCategory = '';
let cart = JSON.parse(localStorage.getItem("jastip_cart") || "{}");

// DOM references
const productsEl = document.getElementById('products');
const cartDrawer = document.getElementById('cartdrawer');
const cartCount = document.getElementById('cartcount');
const subtitleEl = document.getElementById('subtitleEl');
const heroDescEl = document.getElementById('heroDesc');
const waLink = document.getElementById('waLink');
const logoEl = document.getElementById('logoEl');
const logoPreview = document.getElementById('logoPreview');

/******************************
 * HELPERS
 ******************************/
function formatRp(v) {
  if (isNaN(v)) return 'Rp0';
  return 'Rp' + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function uid() {
  return 'p_' + Math.random().toString(36).slice(2, 9);
}

function saveProfiles() {
  localStorage.setItem(STORAGE_PROFILES, JSON.stringify(profiles));
}

function setCurrentProfile(id) {
  currentProfileId = id;
  if (id) localStorage.setItem(STORAGE_CURRENT, id);
  else localStorage.removeItem(STORAGE_CURRENT);
}

function getCurrentProfile() {
  return profiles.find(p => p.id === currentProfileId) || null;
}

/******************************
 * MODAL CONTROLS & PROFILE UI
 ******************************/
function openSetupModal() {
  renderProfilesList();
  const modal = document.getElementById('setupModal');
  modal.style.display = 'flex';
}

function closeSetupModal() {
  const modal = document.getElementById('setupModal');
  modal.style.display = 'none';
}

function renderProfilesList() {
  const listEl = document.getElementById('profilesList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (profiles.length === 0) {
    listEl.innerHTML =
      '<div class="small">Belum ada profil — buat profil baru dengan mengisi form di bawah.</div>';
    fillFormWithProfile(null);
    return;
  }

  profiles.forEach(p => {
    const div = document.createElement('div');
    div.className = 'profile-item';
    div.innerHTML = `
      <div class="logo-preview" style="width:44px;height:44px">
        ${p.logo ? `<img width="44px" src="${p.logo}" alt="${p.name}">` : 'JS'}
      </div>
      <div style="flex:1">
        <div class="profile-name">${p.name}</div>
        <div class="profile-meta">${p.sheet ? p.sheet : ''}</div>
      </div>
      <div>
        <button class="btn-ghost" onclick="useProfile('${p.id}')">Pakai</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  // Fill form with current profile if exists
  const current = getCurrentProfile();
  fillFormWithProfile(current);
}

function useProfile(id) {
  const p = profiles.find(x => x.id === id);
  if (!p) return;
  setCurrentProfile(id);
  applySetup(p);
  closeSetupModal();
  loadProducts();
}

function fillFormWithProfile(p) {
  document.getElementById('inputNama').value = p ? p.name : '';
  document.getElementById('inputDeskripsi').value = p ? p.desc : '';
  document.getElementById('inputWA').value = p ? p.wa : '';
  document.getElementById('inputSheet').value = p ? p.sheet : '';
  document.getElementById('inputAccent').value =
    p && p.theme ? p.theme.accent || '#2f8f4a' : '#2f8f4a';
  document.getElementById('inputBg').value =
    p && p.theme ? p.theme.bg || '#f7f9f8' : '#f7f9f8';
  document.getElementById('inputCard').value =
    p && p.theme ? p.theme.card || '#ffffff' : '#ffffff';

  if (p && p.logo) {
    logoPreview.innerHTML = `<img src="${p.logo}" alt="logo" style="width:100%;height:100%;object-fit:cover">`;
  } else {
    logoPreview.textContent = 'JS';
  }
}

/******************************
 * SAVE / DELETE PROFILE
 ******************************/
function validateSheetUrl(u) {
  try {
    if (!u) return false;
    const ok1 = u.includes('/spreadsheets/d/');
    const ok2 = u.includes('export?format=csv');
    return ok1 && ok2;
  } catch (e) {
    return false;
  }
}

// Handle logo file upload
document.getElementById('inputLogo').addEventListener('change', function (e) {
  const f = e.target.files[0];
  if (!f) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    logoPreview.innerHTML = `<img src="${ev.target.result}" alt="logo" style="width:100%;height:100%;object-fit:cover">`;
    document.getElementById('setupModal').dataset.logoData = ev.target.result;
  };
  reader.readAsDataURL(f);
});

function saveProfile() {
  const name = document.getElementById('inputNama').value.trim();
  const desc = document.getElementById('inputDeskripsi').value.trim();
  const wa = document.getElementById('inputWA').value.trim();
  const sheet = document.getElementById('inputSheet').value.trim();
  const accent = document.getElementById('inputAccent').value;
  const bg = document.getElementById('inputBg').value;
  const card = document.getElementById('inputCard').value;
  const logoData = document.getElementById('setupModal').dataset.logoData || null;

  if (!name || !desc || !wa || !sheet) {
    alert('Semua field (Nama, Deskripsi, WA, Sheet) wajib diisi.');
    return;
  }
  if (!validateSheetUrl(sheet)) {
    alert('Link Google Sheet tidak valid. Pastikan berformat export?format=csv dan berisi /spreadsheets/d/.');
    return;
  }

  // create or update profile
  let profile;
  if (currentProfileId) {
    profile = profiles.find(p => p.id === currentProfileId);
    if (profile) {
      profile.name = name;
      profile.desc = desc;
      profile.wa = wa;
      profile.sheet = sheet;
      profile.theme = { accent, bg, card };
      if (logoData) profile.logo = logoData;
    }
  }

  if (!profile) {
    profile = {
      id: uid(),
      name,
      desc,
      wa,
      sheet,
      theme: { accent, bg, card },
      logo: logoData || null,
      created: Date.now()
    };
    profiles.push(profile);
    setCurrentProfile(profile.id);
  }

  saveProfiles();
  applySetup(profile);
  renderProfilesList();
  closeSetupModal();
  loadProducts();
  delete document.getElementById('setupModal').dataset.logoData;
}

function deleteCurrentProfile() {
  if (!currentProfileId) {
    alert('Pilih profil untuk dihapus (klik "Pakai" di daftar profil lalu buka pengaturan lagi).');
    return;
  }
  const ok = confirm('Yakin hapus profil ini? Tindakan ini tidak bisa dibatalkan.');
  if (!ok) return;

  profiles = profiles.filter(p => p.id !== currentProfileId);
  saveProfiles();
  setCurrentProfile(null);
  applyDefaultTheme();
  renderProfilesList();
  closeSetupModal();
  productsEl.innerHTML = '';
}

function resetProfiles() {
  if (!confirm('Reset semua profil dan pengaturan?')) return;

  profiles = [];
  saveProfiles();
  setCurrentProfile(null);
  applyDefaultTheme();
  renderProfilesList();
  closeSetupModal();
  productsEl.innerHTML = '';
  alert('Semua profil direset.');
}
