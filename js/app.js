import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, getDoc, getDocs, query, where, serverTimestamp, updateDoc, arrayUnion } from './firebase-config.js';

class EightifyApp {
    constructor() {
        this.currentUser = null;
        this.currentActivity = null;
        this.timerInterval = null;
        this.startTime = null;
        this.elapsedSeconds = 0;
        this.todayData = {
            productive: 0,
            personal: 0,
            sleep: 0,
            activities: []
        };
        
        this.init();
    }

    init() {
        // Hapus loadFromLocalStorage() dari sini. Kita akan memuat data setelah status auth diketahui.
        this.setupEventListeners();
        this.setupAuthListener(); // Auth listener akan menangani pemuatan data
        this.setupDailyReset();
        this.updateUI();
        this.updateStats();
    }

    setupEventListeners() {
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleMenu());
        document.getElementById('googleLoginBtn').addEventListener('click', () => this.handleGoogleLogin());
        
        // PERBAIKAN: Hubungkan tombol 'Change Avatar'
        document.getElementById('changeAvatarBtn').addEventListener('click', () => this.changeAvatar());

        document.querySelectorAll('.start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                if (this.currentActivity) {
                    this.stopActivity();
                } else {
                    this.showActivityModal(category);
                }
            });
        });

        document.getElementById('modalCancel').addEventListener('click', () => this.hideActivityModal());
        document.getElementById('modalStart').addEventListener('click', () => this.startActivity());
        document.getElementById('activityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startActivity();
        });

        document.querySelectorAll('.nav-menu a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.dataset.page;
                this.navigateTo(page);
                this.toggleMenu();
            });
        });

        document.getElementById('createCircleBtn').addEventListener('click', () => this.createCircle());
        
        // Pindahkan listener joinCircleBtn ke setupEventListeners agar selalu ada
        // Kita akan menanganinya di loadCircle() juga untuk konten dinamis
        const joinBtn = document.getElementById('joinCircleBtn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.joinCircle());
        }
    }

    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                document.getElementById('username').textContent = user.displayName || 'User';
                if (user.photoURL) {
                    document.getElementById('userAvatar').src = user.photoURL;
                }
                document.getElementById('googleLoginBtn').textContent = 'Sign Out';
                
                // PERBAIKAN: Muat data dari Firebase saat login
                await this.loadUserData();

            } else {
                this.currentUser = null;
                document.getElementById('username').textContent = 'Guest User';
                document.getElementById('userAvatar').src = 'assets/default-avatar.svg';
                document.getElementById('googleLoginBtn').innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 18 18">
                        <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                        <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                        <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                        <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
                    </svg>
                    Sign in with Google
                `;
                
                // PERBAIKAN: Muat data dari sessionStorage untuk Guest
                // Ini sesuai dengan Req 17/25 (data sementara)
                this.loadFromSessionStorage();
            }
            // Muat ulang UI/Stats setelah status data jelas
            this.updateUI();
            this.updateStats();
        });
    }

    async handleGoogleLogin() {
        if (this.currentUser) {
            await signOut(auth);
            // PERBAIKAN: Reset data saat logout, auth listener akan memuat data guest
            this.todayData = { productive: 0, personal: 0, sleep: 0, activities: [] };
            this.updateUI();
            this.updateStats();
        } else {
            try {
                await signInWithPopup(auth, googleProvider);
                // Data akan dimuat oleh setupAuthListener
            } catch (error) {
                console.error('Login error:', error);
                this.showToast('Login failed. Please try again.');
            }
        }
    }
    
    // PERBAIKAN: Fungsi baru untuk tombol avatar
    changeAvatar() {
        // Prompt tidak merinci cara kerja ini (mis. upload file).
        // Jadi, kita tampilkan notifikasi placeholder.
        this.showToast('Change Avatar feature coming soon!');
    }

    toggleMenu() {
        document.getElementById('menuToggle').classList.toggle('active');
        document.getElementById('sidenav').classList.toggle('active');
    }

    navigateTo(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(page).classList.add('active');
        document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));
        
        const activeLink = document.querySelector(`[data-page="${page}"]`);
        if (activeLink) activeLink.classList.add('active');

        if (page === 'statistics') {
            this.renderStatistics();
        } else if (page === 'circle') {
            this.loadCircle();
        }
    }

    showActivityModal(category) {
        this.selectedCategory = category;
        document.getElementById('activityModal').classList.add('active');
        document.getElementById('activityInput').value = '';
        document.getElementById('activityInput').focus();
    }

    hideActivityModal() {
        document.getElementById('activityModal').classList.remove('active');
    }

    startActivity() {
        const activityName = document.getElementById('activityInput').value.trim();
        if (!activityName) {
            this.showToast('Please enter an activity name');
            return;
        }

        this.currentActivity = {
            name: activityName,
            category: this.selectedCategory,
            startTime: Date.now()
        };

        this.startTime = Date.now();
        this.elapsedSeconds = 0;
        this.startTimer();
        this.hideActivityModal();
        this.updateUI();
        
        const btn = document.querySelector(`.start-btn[data-category="${this.selectedCategory}"]`);
        btn.textContent = 'Stop';
        btn.classList.add('active');
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
            this.updateTimerDisplay();
        }, 1000);
    }

    updateTimerDisplay() {
        const hours = Math.floor(this.elapsedSeconds / 3600);
        const minutes = Math.floor((this.elapsedSeconds % 3600) / 60);
        const seconds = this.elapsedSeconds % 60;
        
        const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = timeString;
        
        if (this.currentActivity) {
            const elapsed = Math.floor(this.elapsedSeconds / 60);
            document.getElementById('activityElapsed').textContent = `${elapsed} min`;
        }

        const circumference = 565.48;
        const totalSeconds = 8 * 3600;
        const categorySeconds = this.todayData[this.currentActivity?.category] || 0;
        const progress = ((categorySeconds + this.elapsedSeconds) / totalSeconds) * circumference;
        document.getElementById('timerProgress').style.strokeDashoffset = circumference - progress;
    }

    stopActivity() {
        if (!this.currentActivity) return;

        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        
        const activity = {
            name: this.currentActivity.name,
            category: this.currentActivity.category,
            duration: duration,
            timestamp: this.currentActivity.startTime,
            date: this.getTodayDate()
        };

        this.todayData.activities.push(activity);
        this.todayData[this.currentActivity.category] += duration;

        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.currentActivity = null;
        this.elapsedSeconds = 0;
        
        document.getElementById('timerDisplay').textContent = '00:00:00';
        document.querySelectorAll('.start-btn').forEach(btn => {
            btn.textContent = 'Start';
            btn.classList.remove('active');
        });
        
        // PERBAIKAN: Logika penyimpanan yang benar
        if (this.currentUser) {
            this.saveToFirebase(); // Simpan online jika login
        } else {
            this.saveToSessionStorage(); // Simpan sementara jika guest
        }
        
        this.updateUI();
        this.updateStats();
        this.showToast('Nice job! Activity saved ✨'); // Req 31
    }

    updateUI() {
        if (this.currentActivity) {
            document.getElementById('currentActivity').style.display = 'block';
            document.getElementById('activityName').textContent = this.currentActivity.name;
        } else {
            document.getElementById('currentActivity').style.display = 'none';
        }

        ['productive', 'personal', 'sleep'].forEach(category => {
            const hours = (this.todayData[category] / 3600).toFixed(1);
            document.getElementById(`${category}Time`).textContent = `${hours}h`;
            
            const percentage = (this.todayData[category] / (8 * 3600)) * 100;
            document.getElementById(`${category}Progress`).style.width = `${Math.min(percentage, 100)}%`;
        });
    }

    updateStats() {
        const total = this.todayData.productive + this.todayData.personal + this.todayData.sleep;
        const empty = Math.max(0, (24 * 3600) - total);

        const data = {
            productive: this.todayData.productive,
            personal: this.todayData.personal,
            sleep: this.todayData.sleep,
            empty: empty // Req 14
        };

        this.renderPieChart(data);
    }

    renderPieChart(data) {
        const canvas = document.getElementById('pieChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const total = Object.values(data).reduce((a, b) => a + b, 0);
        if (total === 0) return;

        const colors = {
            productive: '#5B9BD5',
            personal: '#ED7D31',
            sleep: '#70AD47',
            empty: '#E5E5E5'
        };

        let startAngle = -Math.PI / 2;

        Object.entries(data).forEach(([category, value]) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[category];
            ctx.fill();

            startAngle += sliceAngle;
        });

        this.renderLegend(data, colors);
    }

    renderLegend(data, colors) {
        const legend = document.getElementById('chartLegend');
        if (!legend) return;
        
        legend.innerHTML = '';

        Object.entries(data).forEach(([category, seconds]) => {
            const hours = (seconds / 3600).toFixed(1);
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-color" style="background: ${colors[category]}"></div>
                <span>${category.charAt(0).toUpperCase() + category.slice(1)}: ${hours}h</span>
            `;
            legend.appendChild(item);
        });
    }

    renderStatistics() {
        const activityList = document.getElementById('activityList');
        
        if (this.todayData.activities.length === 0) {
            activityList.innerHTML = '<p class="empty-state">No activities recorded yet.</p>';
            return;
        }

        activityList.innerHTML = '';
        const sortedActivities = [...this.todayData.activities].reverse();

        sortedActivities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const time = new Date(activity.timestamp);
            const duration = Math.floor(activity.duration / 60);
            
            item.innerHTML = `
                <div class="activity-info">
                    <h4>${activity.name}</h4>
                    <p>${activity.category} • ${time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                </div>
                <div class="activity-duration">${duration} min</div>
            `;
            activityList.appendChild(item);
        });
    }

    setupDailyReset() {
        setInterval(() => {
            const now = new Date();
            const lastReset = localStorage.getItem('lastReset'); // Pakai localStorage untuk penanda reset
            const today = this.getTodayDate();

            if (lastReset !== today) {
                this.resetDaily();
            }
        }, 60000);
    }

    resetDaily() {
        this.todayData = { productive: 0, personal: 0, sleep: 0, activities: [] };
        localStorage.setItem('lastReset', this.getTodayDate());
        
        // PERBAIKAN: Hapus data sesi lama, simpan data baru (kosong)
        if (this.currentUser) {
            this.saveToFirebase(); // Simpan data kosong ke Firebase untuk hari baru
        } else {
            this.saveToSessionStorage(); // Simpan data kosong ke sessionStorage
        }
        
        this.updateUI();
        this.updateStats();
        this.showToast('New day started! 🌅');
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    // PERBAIKAN: Ubah nama menjadi saveToSessionStorage
    saveToSessionStorage() {
        sessionStorage.setItem('eightifyData', JSON.stringify(this.todayData));
    }

    // PERBAIKAN: Ubah nama menjadi loadFromSessionStorage
    loadFromSessionStorage() {
        const data = sessionStorage.getItem('eightifyData');
        const lastReset = localStorage.getItem('lastReset'); // Tetap cek lastReset
        const today = this.getTodayDate();

        if (data && lastReset === today) {
            this.todayData = JSON.parse(data);
        } else {
            this.resetDaily(); // Reset jika hari baru atau tidak ada data sesi
        }
    }

    async saveToFirebase() {
        if (!this.currentUser) return;

        try {
            const today = this.getTodayDate();
            const userDoc = doc(db, 'users', this.currentUser.uid, 'days', today);
            await setDoc(userDoc, {
                ...this.todayData,
                updatedAt: serverTimestamp()
            }, { merge: true }); // Gunakan merge untuk jaga-jaga
        } catch (error) {
            console.error('Error saving to Firebase:', error);
        }
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const today = this.getTodayDate();
            const userDoc = doc(db, 'users', this.currentUser.uid, 'days', today);
            const docSnap = await getDoc(userDoc);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.todayData = {
                    productive: data.productive || 0,
                    personal: data.personal || 0,
                    sleep: data.sleep || 0,
                    activities: data.activities || []
                };
            } else {
                // Hari baru untuk pengguna ini, reset data
                this.todayData = { productive: 0, personal: 0, sleep: 0, activities: [] };
            }
            this.updateUI();
            this.updateStats();
        } catch (error) {
            console.error('Error loading from Firebase:', error);
        }
    }

    async createCircle() {
        if (!this.currentUser) {
            this.showToast('Please sign in to create a circle');
            return;
        }

        const name = document.getElementById('circleName').value.trim();
        if (!name) {
            this.showToast('Please enter a circle name');
            return;
        }

        try {
            const circleRef = doc(collection(db, 'circles'));
            const circleId = circleRef.id;
            const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();

            await setDoc(circleRef, {
                name: name,
                description: document.getElementById('circleDescription').value.trim(),
                inviteCode: inviteCode,
                createdBy: this.currentUser.uid,
                members: [this.currentUser.uid], // Langsung tambahkan pembuat sebagai anggota
                createdAt: serverTimestamp()
            });

            // Tambahkan circle ke data user
            const userCircleRef = doc(db, 'users', this.currentUser.uid);
            await setDoc(userCircleRef, {
                circles: arrayUnion(circleId)
            }, { merge: true });


            this.showToast(`Circle created! Invite code: ${inviteCode}`);
            document.getElementById('circleName').value = '';
            document.getElementById('circleDescription').value = '';
            this.navigateTo('circle');
        } catch (error) {
            console.error('Error creating circle:', error);
            this.showToast('Failed to create circle');
        }
    }

    // PERBAIKAN: Implementasi joinCircle (Req 18)
    async joinCircle() {
        if (!this.currentUser) {
            this.showToast('Please sign in to join a circle');
            return;
        }

        const code = prompt('Enter invite code:');
        if (!code || code.trim() === '') return;

        try {
            // Cari circle dengan invite code
            const q = query(collection(db, 'circles'), where("inviteCode", "==", code.trim().toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                this.showToast('Invalid invite code');
                return;
            }

            const circleDoc = querySnapshot.docs[0];
            const circleId = circleDoc.id;

            // Tambahkan user ke member list circle
            await updateDoc(doc(db, 'circles', circleId), {
                members: arrayUnion(this.currentUser.uid)
            });

            // Tambahkan circle ke data user
            const userRef = doc(db, 'users', this.currentUser.uid);
            await setDoc(userRef, {
                circles: arrayUnion(circleId)
            }, { merge: true });

            this.showToast(`Successfully joined "${circleDoc.data().name}"!`);
            this.navigateTo('circle'); // Refresh halaman circle

        } catch (error) {
            console.error('Error joining circle:', error);
            this.showToast('Failed to join circle');
        }
    }

    // PERBAIKAN: Implementasi loadCircle (Req 19, 20)
    async loadCircle() {
        const contentEl = document.getElementById('circleContent');
        if (!this.currentUser) {
            contentEl.innerHTML = `
                <p class="empty-state">Please sign in to join a circle.</p>
            `;
            return;
        }

        // Cek apakah user tergabung di circle
        const userRef = doc(db, 'users', this.currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (!userData || !userData.circles || userData.circles.length === 0) {
            contentEl.innerHTML = `
                <p class="empty-state">You haven't joined a circle yet.</p>
                <button class"join-circle-btn" id="joinCircleBtnDynamic">Join a Circle</button>
            `;
            document.getElementById('joinCircleBtnDynamic').addEventListener('click', () => this.joinCircle());
            return;
        }

        // Ambil data circle pertama yang dia ikuti (untuk simplifikasi)
        const circleId = userData.circles[0];
        const circleRef = doc(db, 'circles', circleId);
        const circleSnap = await getDoc(circleRef);

        if (!circleSnap.exists()) {
             contentEl.innerHTML = `<p class="empty-state">Circle data not found.</p>`;
             return;
        }

        const circleData = circleSnap.data();
        const memberIds = circleData.members || [];
        const today = this.getTodayDate();

        contentEl.innerHTML = `
            <h2>${circleData.name}</h2>
            <p>${circleData.description}</p>
            <p><strong>Invite Code:</strong> ${circleData.inviteCode}</p>
            <h3>Members</h3>
            <div id="memberList">Loading member data...</div>
            <h3>Activity Feed (Req 20)</h3>
            <div id="activityFeed">Loading feed...</div>
        `;
        
        // Ambil data harian semua member (Req 19)
        const memberPromises = memberIds.map(async (uid) => {
            const memberDayRef = doc(db, 'users', uid, 'days', today);
            const memberDaySnap = await getDoc(memberDayRef);
            
            // Ambil data profile user (untuk nama/foto)
            const memberProfileRef = doc(db, 'users', uid);
            const memberProfileSnap = await getDoc(memberProfileRef);
            const profileName = memberProfileSnap.data()?.displayName || 'Member'; // Perlu profil user
            
            if (memberDaySnap.exists()) {
                return { ...memberDaySnap.data(), name: profileName };
            }
            return { productive: 0, personal: 0, sleep: 0, activities: [], name: profileName };
        });

        const membersData = await Promise.all(memberPromises);
        
        // Render Member List (Req 19)
        const memberListEl = document.getElementById('memberList');
        memberListEl.innerHTML = '';
        membersData.forEach(member => {
            const el = document.createElement('div');
            el.className = 'member-item';
            // Ini bisa diganti dengan 3 bar seperti di prompt
            el.innerHTML = `
                <strong>${member.name}</strong>
                <p>Prod: ${(member.productive / 3600).toFixed(1)}h | 
                   Pers: ${(member.personal / 3600).toFixed(1)}h | 
                   Sleep: ${(member.sleep / 3600).toFixed(1)}h</p>
            `;
            memberListEl.appendChild(el);
        });

        // Render Activity Feed (Req 20)
        const activityFeedEl = document.getElementById('activityFeed');
        activityFeedEl.innerHTML = '';
        const allActivities = membersData.flatMap(member => 
            member.activities.map(act => ({ ...act, userName: member.name }))
        );
        
        // Urutkan berdasarkan timestamp terbaru
        allActivities.sort((a, b) => b.timestamp - a.timestamp);
        
        allActivities.slice(0, 10).forEach(act => { // Ambil 10 aktivitas terbaru
            const el = document.createElement('div');
            el.className = 'feed-item';
            el.innerHTML = `
                <p><strong>${act.userName}</strong> finished: ${act.name} (${Math.floor(act.duration/60)} min)</p>
            `;
            activityFeedEl.appendChild(el);
        });

        if (allActivities.length === 0) {
            activityFeedEl.innerHTML = '<p class="empty-state">No activity from members today.</p>';
        }
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

new EightifyApp();
