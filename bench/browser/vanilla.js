// Hand-written vanilla implementation: the DOM output must match library.js exactly.
window.impl = (() => {
    const tbody = document.getElementById('tbody');
    let rows = [];
    let nextId = 1;
    let selected = null;

    const makeRow = () => {
        const id = nextId++;
        const tr = document.createElement('tr');
        const tdId = document.createElement('td');
        tdId.className = 'id';
        tdId.textContent = String(id);
        const tdLabel = document.createElement('td');
        tdLabel.className = 'label';
        tdLabel.textContent = `row ${id}`;
        const tdAct = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'rm';
        btn.textContent = 'x';
        tdAct.appendChild(btn);
        tr.append(tdId, tdLabel, tdAct);
        return { id, tr, tdLabel, label: `row ${id}` };
    };

    return {
        create(n) {
            const frag = document.createDocumentFragment();
            for (let i = 0; i < n; i++) {
                const row = makeRow();
                rows.push(row);
                frag.appendChild(row.tr);
            }
            tbody.appendChild(frag);
        },
        update() {
            for (let i = 0; i < rows.length; i += 10) {
                const row = rows[i];
                row.label += ' !!!';
                row.tdLabel.textContent = row.label;
            }
        },
        select(i) {
            if (selected) selected.tr.classList.remove('sel');
            selected = rows[i];
            selected.tr.classList.add('sel');
        },
        swap() {
            const a = rows[1], b = rows[rows.length - 2];
            rows[1] = b;
            rows[rows.length - 2] = a;
            const aNext = a.tr.nextSibling;
            tbody.insertBefore(a.tr, b.tr);
            tbody.insertBefore(b.tr, aNext);
        },
        remove(i) {
            const [row] = rows.splice(i, 1);
            if (selected === row) selected = null;
            row.tr.remove();
        },
        clear() {
            rows = [];
            selected = null;
            tbody.replaceChildren();
        },
        count: () => rows.length,
    };
})();
