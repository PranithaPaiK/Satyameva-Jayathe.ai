// Law Library Management
class LawLibrary {
    constructor() {
        this.laws = this.initializeLaws();
        this.searchResults = [];
        this.currentFilter = { category: '', act: '' };
    }

    initializeLaws() {
        // Mock comprehensive law database
        return [
            {
                id: 'ipc-420',
                title: 'Section 420 - Cheating',
                act: 'Indian Penal Code',
                category: 'criminal',
                section: '420',
                description: 'Whoever cheats and thereby dishonestly induces the person deceived to deliver any property to any person to whom it is delivered, or to consent or refrain from doing any act which he knows that he is bound by law to do, shall be punished with imprisonment of either description for a term which may extend to seven years, and shall also be liable to fine.',
                simplified: 'This law punishes people who cheat others to take their money or property through false promises or deception.',
                keywords: ['cheating', 'deception', 'fraud', 'dishonest inducement', 'property delivery'],
                recentViews: 156
            },
            {
                id: 'ipc-302',
                title: 'Section 302 - Murder',
                act: 'Indian Penal Code',
                category: 'criminal',
                section: '302',
                description: 'Whoever commits murder shall be punished with death, or imprisonment for life, and shall also be liable to fine.',
                simplified: 'This law defines murder and its punishment - death penalty or life imprisonment.',
                keywords: ['murder', 'homicide', 'killing', 'death', 'life imprisonment'],
                recentViews: 234
            },
            {
                id: 'hindu-marriage-5',
                title: 'Hindu Marriage Act - Section 5',
                act: 'Hindu Marriage Act',
                category: 'family',
                section: '5',
                description: 'Conditions for a Hindu marriage - The parties must be Hindus, not within prohibited degrees of relationship, must be of sound mind, and must give valid consent.',
                simplified: 'This law specifies who can marry under Hindu law and what conditions must be met for a valid marriage.',
                keywords: ['hindu marriage', 'valid marriage', 'consent', 'prohibited relationships', 'sound mind'],
                recentViews: 89
            },
            {
                id: 'contract-10',
                title: 'Indian Contract Act - Section 10',
                act: 'Indian Contract Act',
                category: 'civil',
                section: '10',
                description: 'What agreements are contracts - All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.',
                simplified: 'This law defines what makes an agreement a valid contract - free consent, lawful purpose, and competent parties.',
                keywords: ['contract', 'agreement', 'free consent', 'lawful consideration', 'competent parties'],
                recentViews: 167
            },
            {
                id: 'crpc-2',
                title: 'Code of Criminal Procedure - Section 2',
                act: 'Code of Criminal Procedure',
                category: 'criminal',
                section: '2',
                description: 'Police to report cognizable offenses - Every information relating to the commission of a cognizable offense shall be recorded in writing and signed by the informant, and the substance thereof shall be entered in a book to be kept by such officer.',
                simplified: 'This law requires police to record and sign written complaints for serious crimes.',
                keywords: ['police report', 'cognizable offense', 'written complaint', 'FIR', 'information recording'],
                recentViews: 198
            },
            {
                id: 'evidence-3',
                title: 'Indian Evidence Act - Section 3',
                act: 'Indian Evidence Act',
                category: 'civil',
                section: '3',
                description: 'Facts which need not be proved - Facts which the Court presumes or which are admitted by the parties need not be proved, and facts which are judicially noticeable need not be proved.',
                simplified: 'This law states that certain facts don\'t need to be proven in court because they are obvious or already admitted.',
                keywords: ['judicial notice', 'admitted facts', 'presumed facts', 'evidence burden', 'proof not required'],
                recentViews: 145
            },
            {
                id: 'constitution-21',
                title: 'Constitution of India - Article 21',
                act: 'Constitution of India',
                category: 'constitutional',
                section: '21',
                description: 'Protection of life and personal liberty - No person shall be deprived of his life or personal liberty except according to procedure established by law.',
                simplified: 'This fundamental right protects citizens from arbitrary arrest and detention except according to legal procedure.',
                keywords: ['right to life', 'personal liberty', 'due process', 'arrest procedure', 'fundamental right'],
                recentViews: 312
            }
        ];
    }

    searchLaws() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const act = document.getElementById('actFilter').value;

        if (!searchTerm) {
            alert('Please enter a search term');
            return;
        }

        // Filter laws based on search and filters
        this.searchResults = this.laws.filter(law => {
            const matchesSearch = !searchTerm || 
                law.title.toLowerCase().includes(searchTerm) ||
                law.description.toLowerCase().includes(searchTerm) ||
                law.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));

            const matchesCategory = !category || law.category === category;
            const matchesAct = !act || law.act.toLowerCase().includes(act.toLowerCase());

            return matchesSearch && matchesCategory && matchesAct;
        });

        this.displaySearchResults();
    }

    displaySearchResults() {
        const resultsDiv = document.getElementById('searchResults');
        const lawsDiv = document.getElementById('lawResults');
        const countDiv = document.getElementById('resultCount');

        resultsDiv.classList.remove('hidden');
        countDiv.textContent = `Found ${this.searchResults.length} results`;

        lawsDiv.innerHTML = this.searchResults.map(law => `
            <div class="law-card bg-white rounded-lg shadow p-6 cursor-pointer" onclick="showLawDetail('${law.id}')">
                <div class="flex items-start justify-between mb-4">
                    <div>
                        <h4 class="font-semibold text-gray-800 text-lg">${law.title}</h4>
                        <p class="text-sm text-gray-600 mb-2">${law.act} - Section ${law.section}</p>
                        <p class="text-sm text-gray-700">${law.description.substring(0, 200)}...</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs text-gray-500">${law.recentViews} views</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mt-3">
                    ${law.keywords.slice(0, 3).map(keyword => 
                        `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${keyword}</span>`
                    ).join('')}
                </div>
            </div>
        `).join('');
    }

    browseCategory(category) {
        this.currentFilter.category = category;
        this.searchResults = this.laws.filter(law => law.category === category);
        this.displaySearchResults();
        
        // Update filter display
        document.getElementById('categoryFilter').value = category;
        document.getElementById('actFilter').value = '';
    }

    clearFilters() {
        this.currentFilter = { category: '', act: '' };
        this.searchResults = [];
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('actFilter').value = '';
        document.getElementById('searchResults').classList.add('hidden');
    }

    showLawDetail(lawId) {
        const law = this.laws.find(l => l.id === lawId);
        if (!law) return;

        const modal = document.getElementById('lawDetailModal');
        const titleDiv = document.getElementById('lawTitle');
        const contentDiv = document.getElementById('lawContent');
        const explanationDiv = document.getElementById('lawExplanation');
        const relatedDiv = document.getElementById('relatedLaws');

        titleDiv.textContent = law.title;
        contentDiv.textContent = law.description;
        explanationDiv.textContent = law.simplified;

        // Find related laws
        const relatedLaws = this.laws.filter(l => 
            l.id !== lawId && (
                l.category === law.category || 
                l.act === law.act ||
                l.keywords.some(keyword => law.keywords.includes(keyword))
            )
        ).slice(0, 3);

        relatedDiv.innerHTML = relatedLaws.map(relatedLaw => `
            <div class="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition" onclick="showLawDetail('${relatedLaw.id}')">
                <h5 class="font-semibold text-gray-800">${relatedLaw.title}</h5>
                <p class="text-sm text-gray-600">${relatedLaw.act} - ${relatedLaw.section}</p>
            </div>
        `).join('');

        modal.classList.remove('hidden');
    }

    closeLawDetail() {
        document.getElementById('lawDetailModal').classList.add('hidden');
    }

    addToCase() {
        alert('Law added to your current case for reference');
        this.closeLawDetail();
    }

    printLaw() {
        window.print();
    }

    loadPopularLaws() {
        const popularDiv = document.getElementById('popularLaws');
        
        // Sort by recent views and get top 6
        const popularLaws = [...this.laws]
            .sort((a, b) => b.recentViews - a.recentViews)
            .slice(0, 6);

        popularDiv.innerHTML = popularLaws.map(law => `
            <div class="bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition" onclick="showLawDetail('${law.id}')">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-gray-800">${law.title}</h4>
                    <span class="text-xs text-gray-500">${law.recentViews} views</span>
                </div>
                <p class="text-sm text-gray-600">${law.act}</p>
            </div>
        `).join('');
    }
}

// Initialize law library
let lawLibrary = null;

window.addEventListener('DOMContentLoaded', () => {
    lawLibrary = new LawLibrary();
    lawLibrary.loadPopularLaws();
});

// Export functions
window.searchLaws = () => lawLibrary.searchLaws();
window.browseCategory = (category) => lawLibrary.browseCategory(category);
window.clearFilters = () => lawLibrary.clearFilters();
window.showLawDetail = (lawId) => lawLibrary.showLawDetail(lawId);
window.closeLawDetail = () => lawLibrary.closeLawDetail();
window.addToCase = () => lawLibrary.addToCase();
window.printLaw = () => lawLibrary.printLaw();
