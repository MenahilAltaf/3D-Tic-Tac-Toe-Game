/* =====================================================
   TRIAD — leaderboard.js
   Renders the leaderboard table from sample data merged
   with any real results saved by the game, plus search,
   column sorting, and a top-3 quick filter.
   ===================================================== */

(() => {
  'use strict';

  // Fake sample data so the leaderboard looks alive before anyone has played
  const SAMPLE_DATA = [
    { name: 'Aria Chen', score: 187, moves: 5, time: '00:42', date: '2026-06-28' },
    { name: 'Marcus Webb', score: 172, moves: 6, time: '00:55', date: '2026-06-27' },
    { name: 'Sofia Reyes', score: 165, moves: 6, time: '01:03', date: '2026-06-30' },
    { name: 'Kenji Watanabe', score: 158, moves: 7, time: '01:10', date: '2026-06-25' },
    { name: 'Priya Nair', score: 149, moves: 7, time: '01:18', date: '2026-06-29' },
    { name: 'Diego Alvarez', score: 141, moves: 8, time: '01:24', date: '2026-06-22' },
    { name: 'Lena Fischer', score: 136, moves: 5, time: '01:31', date: '2026-06-24' },
    { name: 'Omar Haddad', score: 129, moves: 8, time: '01:40', date: '2026-06-20' },
    { name: 'Yuki Tanaka', score: 118, moves: 9, time: '01:52', date: '2026-06-18' },
    { name: 'Grace Kim', score: 104, moves: 9, time: '02:05', date: '2026-06-15' },
  ];

  let allEntries = [];
  let sortKey = 'score';
  let sortDir = 'desc';
  let filterMode = 'all'; // 'all' | 'top3'
  let searchTerm = '';

  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('board-body');
    if (!tbody) return; // only run on the leaderboard page

    loadEntries();
    bindSearch();
    bindSort();
    bindFilters();
    render();
  });

  function loadEntries() {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem('triad_leaderboard')) || [];
    } catch (e) {
      saved = [];
    }
    // Mark real (locally saved) entries so we can badge them as "You"
    const savedMarked = saved.map((e) => ({ ...e, isYou: true }));
    allEntries = [...savedMarked, ...SAMPLE_DATA];
  }

  function bindSearch() {
    const input = document.getElementById('board-search');
    if (!input) return;
    input.addEventListener('input', () => {
      searchTerm = input.value.trim().toLowerCase();
      render();
    });
  }

  function bindFilters() {
    document.querySelectorAll('.rank-filter button').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rank-filter button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        filterMode = btn.dataset.filter;
        render();
      });
    });
  }

  function bindSort() {
    document.querySelectorAll('.board-table th[data-key]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (sortKey === key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = key;
          sortDir = key === 'name' ? 'asc' : 'desc';
        }
        updateSortArrows();
        render();
      });
    });
    updateSortArrows();
  }

  function updateSortArrows() {
    document.querySelectorAll('.board-table th[data-key] .arrow').forEach((a) => (a.textContent = ''));
    const activeTh = document.querySelector(`.board-table th[data-key="${sortKey}"] .arrow`);
    if (activeTh) activeTh.textContent = sortDir === 'asc' ? '▲' : '▼';
  }

  function getFilteredSorted() {
    let list = allEntries.filter((e) => e.name.toLowerCase().includes(searchTerm));

    list.sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'name' || sortKey === 'date' || sortKey === 'time') {
        av = String(av);
        bv = String(bv);
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    if (filterMode === 'top3') list = list.slice(0, 3);
    return list;
  }

  function initials(name) {
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  }

  function render() {
    const tbody = document.getElementById('board-body');
    const list = getFilteredSorted();

    if (!list.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="6">No players match your search yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map((entry, i) => {
      const rankClass = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
      return `
        <tr>
          <td class="rank-cell ${rankClass}">#${i + 1}</td>
          <td>
            <div class="player-cell">
              <span class="player-avatar">${initials(entry.name)}</span>
              ${entry.name}
              ${entry.isYou ? '<span class="you-badge">YOU</span>' : ''}
            </div>
          </td>
          <td class="score-cell">${entry.score}</td>
          <td class="mono-cell">${entry.moves}</td>
          <td class="mono-cell">${entry.time}</td>
          <td class="mono-cell">${entry.date}</td>
        </tr>
      `;
    }).join('');
  }
})();
