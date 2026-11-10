// ultra-light.js implementation with identical DOM output to vanilla.js.
// Written the way the library is meant to be used: UltraComponent + state subscriptions.
window.impl = (() => {
    const { UltraComponent, ultraState, ultraReplaceChildren } = window.UltraLight;
    const tbody = document.getElementById('tbody');
    let rows = [];
    let nextId = 1;
    const [getSel, setSel, subSel] = ultraState(0);

    const makeRow = () => {
        const id = nextId++;
        const [getLabel, setLabel, subLabel] = ultraState(`row ${id}`);
        const tr = UltraComponent({
            component: '<tr></tr>',
            trigger: [{
                subscriber: subSel,
                triggerFunction: node => { node.classList.toggle('sel', getSel() === id); },
            }],
            children: [
                UltraComponent({ component: '<td></td>', className: ['id'], children: [String(id)] }),
                UltraComponent({
                    component: '<td></td>',
                    className: ['label'],
                    trigger: [{
                        subscriber: subLabel,
                        triggerFunction: node => { node.textContent = getLabel(); },
                    }],
                }),
                UltraComponent({
                    component: '<td></td>',
                    children: [UltraComponent({ component: '<button></button>', className: ['rm'], children: ['x'] })],
                }),
            ],
        });
        return { id, tr, getLabel, setLabel };
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
                rows[i].setLabel(rows[i].getLabel() + ' !!!');
            }
        },
        select(i) { setSel(rows[i].id); },
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
            row.tr._cleanup?.();
            row.tr.remove();
        },
        clear() {
            rows = [];
            ultraReplaceChildren(tbody);
        },
        count: () => rows.length,
    };
})();
