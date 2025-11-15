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

    // ==========================================================
    // INI BAGIAN YANG DIPERBAIKI
    // ==========================================================
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

        document.getElementById('navMenuList').addEventListener('click', (e) => {
            const link = e.target.closest('a'); 
            if (!link) return; 

            e.preventDefault();
            const page = link.dataset.page;
            const circleId = link.dataset.circleId;
            const action = link.dataset.action; 

            if (page) {
                // Ini untuk navigasi halaman (Home, Statistics, nama circle, Create)
                this.navigateTo(page, circleId);
                this.toggleMenu(); // <-- toggleMenu HANYA jalan kalau pindah halaman
            } else if (action === 'join-circle') {
                // Ini untuk tombol 'Join Circle'
                // Biarkan menu tetap terbuka saat prompt muncul
                this.joinCircle(); 
            }
        });

        document.getElementById('createCircleBtn').addEventListener('click', () => this.createCircle());
    }
    // ==========================================================
    // AKHIR DARI BAGIAN YANG DIPERBAIKI
    // ==========================================================

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
                await this.renderUserCirclesInNav(); 
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
                this.resetNavMenu(); 
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

    navigateTo(page, circleId = null) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pageElement = document.getElementById(page);
        if (pageElement) {
            pageElement.classList.add('active');
        } else {
            console.error(`Page with id "${page}" not found.`);
            document.getElementById('home').classList.add('active');
            page = 'home';
        }
        
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
            this.loadCircle(circleId); 
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
        
        const timerProgress = document.getElementById('timerProgress');
        if (timerProgress) {
             timerProgress.style.strokeDashoffset = circumference - Math.min(progress, circumference);
        }
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
        
        this.saveToLocalStorage();
        if (this.currentUser) {
            this.saveToFirebase();
        }
        
        this.updateUI();
        this.updateStats();
        this.showToast('Nice job! Activity saved ✨');
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
        if (total === 0) {
            const canvas = document.getElementById('pieChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            const legend = document.getElementById('chartLegend');
            if (legend) legend.innerHTML = '';
            return;
        }
        const empty = Math.max(0, (24 * 3600) - total);

        const data = {
            productive: this.todayData.productive,
            personal: this.todayData.personal,
            sleep: this.todayData.sleep,
            empty: empty
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
            if (value <= 0) return;
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
            if (category === 'empty' && seconds === 0) return;
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
            activityList.innerHTML = '<p class.empty-state">No activities recorded yet.</p>';
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
            const lastReset = localStorage.getItem('lastReset');
            const today = this.getTodayDate();

            if (lastReset !== today) {
                this.resetDaily();
            }
        }, 60000);
    }

    resetDaily() {
        this.todayData = { productive: 0, personal: 0, sleep: 0, activities: [] };
        localStorage.setItem('lastReset', this.getTodayDate());
        this.saveToLocalStorage();
        this.updateUI();
        this.updateStats();
        this.showToast('New day started! 🌅');
    }

    getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

    saveToLocalStorage() {
        localStorage.setItem('eightifyData', JSON.stringify(this.todayData));
        localStorage.setItem('lastReset', this.getTodayDate());
    }

    loadFromLocalStorage() {
        const data = localStorage.getItem('eightifyData');
        const lastReset = localStorage.getItem('lastReset');
        const today = this.getTodayDate();

        if (data && lastReset === today) {
            this.todayData = JSON.parse(data);
        } else {
            this.resetDaily();
        }
    }

    async saveToFirebase() {
        if (!this.currentUser) return;

        try {
            const today = this.getTodayDate();
            const userDoc = doc(db, 'users', this.currentUser.uid, 'days', today);
            await setDoc(userDoc, {
                productive: this.todayData.productive,
                personal: this.todayData.personal,
                sleep: this.todayData.sleep,
                activities: this.todayData.activities,
                updatedAt: serverTimestamp()
            });
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
                this.saveToFirebase(); 
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
            
            await this.renderUserCirclesInNav(); 
            this.navigateTo('circle', circleId); 
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
        if (!code) return; // User menekan 'Cancel'

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
            await this.renderUserCirclesInNav(); 
            this.navigateTo('circle', circleId); 
            this.toggleMenu(); // Tutup menu setelah berhasil join
        } catch (error) {
            console.error('Error joining circle:', error);
            this.showToast('Failed to join circle');
        }
    }

    async loadCircle(circleId = null) {
        const circleContentEl = document.getElementById('circleContent');
        if (!this.currentUser) {
            circleContentEl.innerHTML = `<p class.empty-state">Please sign in to view your circle.</p>`;
            return;
        }

        circleContentEl.innerHTML = `<p class="empty-state">Loading circle data...</p>`;

        try {
            let circleToLoadId = circleId;

            if (!circleToLoadId) {
                const userCirclesCol = collection(db, 'users', this.currentUser.uid, 'circles');
                const userCirclesSnap = await getDocs(userCirclesCol);

                if (userCirclesSnap.empty) {
                    circleContentEl.innerHTML = `
                        <p class="empty-state">You haven't joined a circle yet.</p>
                        <button class="join-circle-btn" id="joinCircleBtn">Join a Circle</button>
                    `;
                    // Hati-hati, joinCircleBtn di sini mungkin tidak punya listener
                    // Tapi kita sudah punya di nav, jadi ini oke
                    document.getElementById('joinCircleBtn').addEventListener('click', () => this.joinCircle());
                    return;
                }
                circleToLoadId = userCirclesSnap.docs[0].id; 
            }

            const circleDocSnap = await getDoc(doc(db, 'circles', circleToLoadId));
            if (!circleDocSnap.exists()) {
                this.showToast('Error: Circle data not found.');
                await this.renderUserCirclesInNav();
                this.navigateTo('home'); 
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
        
        document.getElementById('inviteCircleBtn').addEventListener('click', () => {
            prompt('Share this invite code with your team:', circleData.inviteCode);
        });
    }

    renderCircleMembers(container, members) {
        if (!members || members.length === 0) {
            container.innerHTML = `<p class="empty-state">No members to show.</p>`;
            return;
        }

        container.innerHTML = members.map(member => {
            const productiveH = (member.productive / 3600).toFixed(1);
            const personalH = (member.personal / 3600).toFixed(1);
            const sleepH = (member.sleep / 3600).toFixed(1);
            
            const productiveP = Math.min((member.productive / (8 * 3600)) * 100, 100);
            const personalP = Math.min((member.personal / (8 * 3600)) * 100, 100);
            const sleepP = Math.min((member.sleep / (8 * 3600)) * 100, 100);

            return `
            <div class="circle-member-card">
                <div class="member-header">
                    <img src="${member.photoURL || 'assets/default-avatar.svg'}" alt="Avatar" class="member-avatar">
                    <div class="member-info">
                        <h4>${member.displayName}</h4>
                    </div>
                </div>
                <div class="member-stats"> 
                    <div class="stat-item">
                        <span>Productive</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${productiveP}%; background: var(--productive);"></div>
                        </div>
                        <span class="stat-time">${productiveH}h</span>
                    </div>
                    <div class="stat-item">
                        <span>Personal</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${personalP}%; background: var(--personal);"></div>
                        </div>
                        <span class="stat-time">${personalH}h</span>
                    </div>
                    <div class="stat-item">
                        <span>Sleep</span>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${sleepP}%; background: var(--sleep);"></div>
                        </div>
                        <span class="stat-time">${sleepH}h</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    renderActivityFeed(container, activities) {
        if (!activities || activities.length === 0) {
            container.innerHTML = `<p class="empty-state">No recent activity.</p>`;
            return;
        }

        container.innerHTML = activities.map(act => {
            const durationMin = Math.floor(act.duration / 60);
            const timeAgo = this.formatTimeAgo(act.timestamp);

            return `
            <div class."feed-item">
                <div class="feed-icon">✓</div>
                <div class="feed-info">
                    <p><b>${act.userName}</b> finished: ${act.name} (${durationMin}m)</p>
                    <span>${timeAgo}</span>
                </div>
            </div>
            `;
        }).join('');
    }

    renderLeaderboard(container, leaderboard) {
        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = `<p class="empty-state">No data for leaderboard.</p>`;
            return;
        }

        container.innerHTML = `
        <div class="leaderboard-list">
            ${leaderboard.map((member, index) => {
                const productiveH = (member.productive / 3600).toFixed(1);
                return `
                <div class="leaderboard-item">
                    <span class="leaderboard-rank">#${index + 1}</span>
                    <img src="${member.photoURL || 'assets/default-avatar.svg'}" alt="Avatar" class="member-avatar" style="width: 35px; height: 35px;">
                    <div class="leaderboard-info">
                        <p>${member.displayName}</p>
                    </div>
                    <span class="leaderboard-time">${productiveH}h</span>
                </div>
                `;
            }).join('')}
        </div>
        `;
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }

    async renderUserCirclesInNav() {
        if (!this.currentUser) return;

        document.querySelectorAll('.nav-circle-link').forEach(link => link.remove());

        const navMenuList = document.getElementById('navMenuList');
        const createCircleNav = document.getElementById('createCircleNav');
        
        const circlesCol = collection(db, 'users', this.currentUser.uid, 'circles');
        const circlesSnap = await getDocs(circlesCol);

        this.userCircles = []; 
        circlesSnap.docs.forEach(doc => {
            const circle = { id: doc.id, name: doc.data().name };
            this.userCircles.push(circle);

            const li = document.createElement('li');
            li.className = 'nav-circle-link'; 
            
            li.innerHTML = `<a href="#circle" data-page="circle" data-circle-id="${circle.id}">${circle.name}</a>`;
            
            navMenuList.insertBefore(li, createCircleNav);
        });
    }

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
