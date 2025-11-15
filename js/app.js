import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, doc, setDoc, getDoc, getDocs, query, where, serverTimestamp, updateDoc, arrayUnion } from './firebase-config.js';

class EightifyApp {
    constructor() {
        this.currentUser = null;
        this.currentActivity = null;
        this.timerInterval = null;
        this.startTime = null;
        this.elapsedSeconds = 0;
        this.userCircles = []; // Menyimpan data circle user
        this.todayData = {
            productive: 0,
            personal: 0,
            sleep: 0,
            activities: []
        };
        
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupEventListeners();
        this.setupAuthListener();
        this.setupDailyReset();
        this.updateUI();
        this.updateStats();
    }

    setupEventListeners() {
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleMenu());
        document.getElementById('googleLoginBtn').addEventListener('click', () => this.handleGoogleLogin());
        
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

        // Diperbarui untuk menangani link dinamis
        document.getElementById('navMenuList').addEventListener('click', (e) => {
            if (e.target.tagName === 'A') {
                e.preventDefault();
                const page = e.target.dataset.page;
                const circleId = e.target.dataset.circleId; // Ambil circleId
                this.navigateTo(page, circleId); // Kirim circleId ke navigateTo
                this.toggleMenu();
            }
        });

        document.getElementById('createCircleBtn').addEventListener('click', () => this.createCircle());
    }

    setupAuthListener() {
        onAuthStateChanged(auth, async (user) => {
            this.currentUser = user;
            if (user) {
                document.getElementById('username').textContent = user.displayName || 'User';
                if (user.photoURL) {
                    document.getElementById('userAvatar').src = user.photoURL;
                }
                document.getElementById('googleLoginBtn').textContent = 'Sign Out';
                
                await this.updateUserProfile(user); 
                await this.loadUserData();
                await this.renderUserCirclesInNav(); // Muat circle di nav setelah login
            } else {
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
                this.resetNavMenu(); // Hapus circle dari nav saat logout
            }
        });
    }

    async updateUserProfile(user) {
        if (!user) return;
        const userDocRef = doc(db, 'users', user.uid);
        try {
            await setDoc(userDocRef, {
                displayName: user.displayName,
                photoURL: user.photoURL,
                uid: user.uid
            }, { merge: true });
        } catch (error) {
            console.error("Error updating user profile:", error);
        }
    }

    async handleGoogleLogin() {
        if (this.currentUser) {
            await signOut(auth);
            this.todayData = { productive: 0, personal: 0, sleep: 0, activities: [] };
            this.updateUI();
            this.updateStats();
        } else {
            try {
                await signInWithPopup(auth, googleProvider);
            } catch (error) {
                console.error('Login error:', error);
                this.showToast('Login failed. Please try again.');
            }
        }
    }

    toggleMenu() {
        document.getElementById('menuToggle').classList.toggle('active');
        document.getElementById('sidenav').classList.toggle('active');
    }

    // UPDATED navigateTo untuk menerima circleId
    navigateTo(page, circleId = null) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(page).classList.add('active');
        
        // Update link aktif di navigasi
        document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));
        let activeLink;
        if (page === 'circle' && circleId) {
            activeLink = document.querySelector(`.nav-menu a[data-circle-id="${circleId}"]`);
        } else {
            activeLink = document.querySelector(`.nav-menu a[data-page="${page}"]`);
        }
        if (activeLink) {
            activeLink.classList.add('active');
        }

        if (page === 'statistics') {
            this.renderStatistics();
        } else if (page === 'circle') {
            this.loadCircle(circleId); // Kirim circleId ke loadCircle
        }
    }

    // ... (Fungsi showActivityModal, hideActivityModal, startActivity, startTimer, updateTimerDisplay, stopActivity, updateUI, updateStats, renderPieChart, renderLegend, renderStatistics, setupDailyReset, resetDaily, getTodayDate, saveToLocalStorage, loadFromLocalStorage, saveToFirebase, loadUserData ... tetap sama) ...
    
    // SISAKAN FUNGSI-FUNGSI DI ATAS (DARI showActivityModal... s/d loadUserData)
    // KITA AKAN MODIFIKASI FUNGSI SETELAH INI

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
            const circleId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const inviteCode = Math.random().toString(36).substr(2, 8).toUpperCase();

            await setDoc(doc(db, 'circles', circleId), {
                name: name,
                description: document.getElementById('circleDescription').value.trim(),
                inviteCode: inviteCode,
                createdBy: this.currentUser.uid,
                members: [this.currentUser.uid],
                createdAt: serverTimestamp()
            });

            await setDoc(doc(db, 'users', this.currentUser.uid, 'circles', circleId), {
                joinedAt: serverTimestamp(),
                name: name
            });

            this.showToast(`Circle created! Invite code: ${inviteCode}`);
            document.getElementById('circleName').value = '';
            document.getElementById('circleDescription').value = '';
            
            await this.renderUserCirclesInNav(); // REFRESH NAVIGASI
            this.navigateTo('circle', circleId); // Langsung buka circle yang baru dibuat
        } catch (error) {
            console.error('Error creating circle:', error);
            this.showToast('Failed to create circle');
        }
    }

    async joinCircle() {
        if (!this.currentUser) {
            this.showToast('Please sign in to join a circle');
            return;
        }

        const code = prompt('Enter invite code:');
        if (!code) return;

        try {
            const q = query(collection(db, 'circles'), where('inviteCode', '==', code.toUpperCase()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                this.showToast('Invalid invite code');
                return;
            }

            const circleDoc = querySnapshot.docs[0];
            const circleId = circleDoc.id;
            const circleData = circleDoc.data();

            if (circleData.members.includes(this.currentUser.uid)) {
                this.showToast('You are already in this circle');
                return;
            }

            await updateDoc(doc(db, 'circles', circleId), {
                members: arrayUnion(this.currentUser.uid)
            });

            await setDoc(doc(db, 'users', this.currentUser.uid, 'circles', circleId), {
                joinedAt: serverTimestamp(),
                name: circleData.name
            });

            this.showToast(`Successfully joined ${circleData.name}!`);
            await this.renderUserCirclesInNav(); // REFRESH NAVIGASI
            this.navigateTo('circle', circleId); // Langsung buka circle yang baru di-join
        } catch (error) {
            console.error('Error joining circle:', error);
            this.showToast('Failed to join circle');
        }
    }

    // UPDATED loadCircle untuk menerima circleId spesifik
    async loadCircle(circleId = null) {
        const circleContentEl = document.getElementById('circleContent');
        if (!this.currentUser) {
            circleContentEl.innerHTML = `<p class="empty-state">Please sign in to view your circle.</p>`;
            return;
        }

        circleContentEl.innerHTML = `<p class="empty-state">Loading circle data...</p>`;

        try {
            let circleToLoadId = circleId;

            // Jika tidak ada circleId spesifik (misal dari link lama), muat circle pertama
            if (!circleToLoadId) {
                const userCirclesCol = collection(db, 'users', this.currentUser.uid, 'circles');
                const userCirclesSnap = await getDocs(userCirclesCol);

                if (userCirclesSnap.empty) {
                    circleContentEl.innerHTML = `
                        <p class="empty-state">You haven't joined a circle yet.</p>
                        <button class="join-circle-btn" id="joinCircleBtn">Join a Circle</button>
                    `;
                    document.getElementById('joinCircleBtn').addEventListener('click', () => this.joinCircle());
                    return;
                }
                circleToLoadId = userCirclesSnap.docs[0].id; // Ambil circle pertama
            }

            const circleDocSnap = await getDoc(doc(db, 'circles', circleToLoadId));
            if (!circleDocSnap.exists()) {
                this.showToast('Error: Circle data not found.');
                return;
            }

            const circleData = circleDocSnap.data();
            const memberUIDs = circleData.members;
            const today = this.getTodayDate();

            const memberDataPromises = memberUIDs.map(async (uid) => {
                const userDocRef = doc(db, 'users', uid);
                const dayDocRef = doc(db, 'users', uid, 'days', today);
                
                const [userSnap, daySnap] = await Promise.all([
                    getDoc(userDocRef),
                    getDoc(dayDocRef)
                ]);

                const userData = userSnap.exists() ? userSnap.data() : { displayName: 'Unknown User', photoURL: 'assets/default-avatar.svg' };
                const dayData = daySnap.exists() ? daySnap.data() : { productive: 0, personal: 0, sleep: 0, activities: [] };

                return { ...userData, ...dayData };
            });

            const allMembersData = await Promise.all(memberDataPromises);

            const activityFeed = allMembersData
                .flatMap(member => 
                    (member.activities || []).map(act => ({ ...act, userName: member.displayName }))
                )
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10);

            const leaderboard = [...allMembersData]
                .sort((a, b) => b.productive - a.productive)
                .slice(0, 3);

            // Kirim seluruh objek circleData ke renderCircleLayout
            this.renderCircleLayout(circleContentEl, circleData);
            this.renderCircleMembers(document.getElementById('circleMembersList'), allMembersData);
            this.renderActivityFeed(document.getElementById('circleActivityFeed'), activityFeed);
            this.renderLeaderboard(document.getElementById('circleLeaderboard'), leaderboard);

        } catch (error) {
            console.error('Error loading circle:', error);
            this.showToast('Failed to load circle data');
            circleContentEl.innerHTML = `<p class="empty-state">Failed to load circle data. Please try again.</p>`;
        }
    }

    // UPDATED renderCircleLayout untuk fungsionalitas invite
    renderCircleLayout(container, circleData) {
        container.innerHTML = `
            <div class="circle-header">
                <h1>${circleData.name}</h1>
                <button class="invite-btn" id="inviteCircleBtn">Invite Members</button>
            </div>
            <div class="circle-grid">
                <div class="circle-main">
                    <section id="circleMembersSection">
                        <h2>Circle Members</h2>
                        <div id="circleMembersList"></div>
                    </section>
                    <section id="circleActivitySection">
                        <h2>Activity Feed</h2>
                        <div class="activity-feed-list" id="circleActivityFeed"></div>
                    </section>
                </div>
                <div class="circle-sidebar">
                    <section id="circleLeaderboardSection">
                        <h2>Weekly Leaderboard</h2>
                        <div class="leaderboard-widget" id="circleLeaderboard"></div>
                    </section>
                </div>
            </div>
        `;
        
        // Buat tombol invite berfungsi
        document.getElementById('inviteCircleBtn').addEventListener('click', () => {
            prompt('Share this invite code with your team:', circleData.inviteCode);
        });
    }

    // ... (Fungsi renderCircleMembers, renderActivityFeed, renderLeaderboard, formatTimeAgo ... tetap sama) ...
    
    // SISAKAN FUNGSI-FUNGSI DI ATAS (renderCircleMembers, renderActivityFeed, renderLeaderboard, formatTimeAgo)

    // NEW FUNCTION untuk render circle di navigasi
    async renderUserCirclesInNav() {
        if (!this.currentUser) return;

        // Hapus link circle lama
        document.querySelectorAll('.nav-circle-link').forEach(link => link.remove());

        const navMenuList = document.getElementById('navMenuList');
        const createCircleNav = document.getElementById('createCircleNav');
        
        const circlesCol = collection(db, 'users', this.currentUser.uid, 'circles');
        const circlesSnap = await getDocs(circlesCol);

        this.userCircles = []; // Reset array
        circlesSnap.docs.forEach(doc => {
            const circle = { id: doc.id, name: doc.data().name };
            this.userCircles.push(circle);

            const li = document.createElement('li');
            li.className = 'nav-circle-link'; // Kelas untuk identifikasi
            
            // Buat link dengan data-circle-id
            li.innerHTML = `<a href="#circle" data-page="circle" data-circle-id="${circle.id}">${circle.name}</a>`;
            
            // Sisipkan sebelum tombol "Create New Circle"
            navMenuList.insertBefore(li, createCircleNav);
        });
    }

    // NEW FUNCTION untuk reset navigasi saat logout
    resetNavMenu() {
        document.querySelectorAll('.nav-circle-link').forEach(link => link.remove());
        this.userCircles = [];
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
