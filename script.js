let cy;
let selectionOrder = []; // Очередь выбора узлов

// ----------------------------------------------------------------
// Интеграция опросника
// ----------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
    QuestionnaireUI.start((answers, result) => {
        QuestionnaireUI.destroy();
        document.getElementById('graph-container').style.display = 'block';
        renderGraphFromPlan(result);
    });
});

const NODE_PADDING = 20;
const TEXT_MAX_WIDTH = 120;
const FONT_SIZE = 12;
const CHAR_WIDTH = 7;    // Средняя ширина символа при font-size 12px
const LINE_HEIGHT = 16;  // Высота строки при font-size 12px
const MIN_NODE_WIDTH = 60;
const MIN_NODE_HEIGHT = 40;

/**
 * Разбивает текст на строки с учётом максимальной ширины.
 * Возвращает массив строк.
 */
function wrapText(text, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (testLine.length * CHAR_WIDTH > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [''];
}

/**
 * Вычисляет ширину и высоту узла по его label.
 */
function calcNodeSize(label) {
    const lines = wrapText(label, TEXT_MAX_WIDTH);
    const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
    const textWidth = longestLine.length * CHAR_WIDTH;
    const textHeight = lines.length * LINE_HEIGHT;

    return {
        w: Math.max(MIN_NODE_WIDTH, textWidth + NODE_PADDING * 2),
        h: Math.max(MIN_NODE_HEIGHT, textHeight + NODE_PADDING * 2),
    };
}

// Быстрый старт с пустым графом — заменён на запуск опросника выше

/**
 * Преобразует результат BuildingPlanner в граф Cytoscape и отрисовывает его.
 * Показывает сводку в панели управления.
 */
function renderGraphFromPlan(planResult) {
    const { graph, summary, detailedPlan } = planResult;
    const nodes = [];
    const edges = [];
    const ids = new Set();

    const add = (id, type) => {
        if (!ids.has(id)) {
            nodes.push({ data: { id, label: id, type } });
            ids.add(id);
        }
    };

    for (const actionName of Object.keys(graph)) {
        const g = graph[actionName];
        add(actionName, 'action');
        (g.init_states || []).forEach(s => {
            add(s, 'state');
            edges.push({ data: { id: `${s}->${actionName}`, source: s, target: actionName } });
        });
        (g.final_states || []).forEach(s => {
            add(s, 'state');
            edges.push({ data: { id: `${actionName}->${s}`, source: actionName, target: s } });
        });
    }

    renderGraph({ nodes, edges });

    // Сводка
    const summaryBar = document.getElementById('summary-bar');
    if (summaryBar) {
        summaryBar.innerHTML = `
            <span class="summary-item">⏱️ <b>${summary.total_time_days}</b> дней</span>
            <span class="summary-item">💰 <b>${summary.total_cost_million_rub}</b> млн руб.</span>
            <span class="summary-item">📋 Фаз: <b>${Object.keys(detailedPlan).length}</b></span>
            <span class="summary-item">🔵 Действий: <b>${Object.keys(graph).length}</b></span>
        `;
    }
}

function renderGraph(elements) {
    // Предварительно рассчитываем размеры для каждого узла
    if (elements.nodes) {
        for (const node of elements.nodes) {
            const size = calcNodeSize(node.data.label || '');
            node.data._w = size.w;
            node.data._h = size.h;
        }
    }

    if (cy) cy.destroy();
    cy = cytoscape({
        container: document.getElementById('cy'),
        elements: elements,
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'text-wrap': 'wrap',
                    'text-max-width': TEXT_MAX_WIDTH + 'px',
                    'font-size': FONT_SIZE + 'px',
                    'padding': '0px',
                    'border-width': 2,
                    'border-color': '#007bff',
                    'background-color': '#fff',
                    'shape': 'rectangle',
                    'width': 'data(_w)',
                    'height': 'data(_h)',
                }
            },
            {
                selector: 'node[type="action"]',
                style: {
                    'shape': 'round-rectangle',
                    'background-color': '#e6f7ff',
                }
            },
            {
                selector: 'node[type="state"]',
                style: {
                    'shape': 'ellipse',
                    'background-color': '#f6ffed',
                    'border-color': '#52c41a',
                }
            },
            {
                selector: 'edge',
                style: {
                    'width': 2,
                    'line-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'target-arrow-color': '#ccc',
                    'curve-style': 'bezier',
                }
            },
            {
                selector: ':selected',
                style: {
                    'border-width': 4,
                    'border-color': '#ffc107',
                }
            }
        ],
        layout: { name: 'dagre', rankDir: 'TB' }
    });

    // Отслеживание порядка выбора
    cy.on('select', 'node', function(evt){
        const id = evt.target.id();
        if (!selectionOrder.includes(id)) selectionOrder.push(id);
    });

    cy.on('unselect', 'node', function(evt){
        const id = evt.target.id();
        selectionOrder = selectionOrder.filter(item => item !== id);
    });

    cy.on('dblclick', 'node', function(event) {
        const node = event.target;
        const oldId = node.id();
        const newLabel = prompt('Введите новое название:', node.data('label'));
        if (newLabel && newLabel !== node.data('label')) {
            if (newLabel !== oldId && cy.getElementById(newLabel).length > 0) {
                alert("Узел с таким именем уже существует!");
                return;
            }
            node.data('label', newLabel);
            node.data('id', newLabel);

            // Пересчитываем размер после переименования
            const size = calcNodeSize(newLabel);
            node.data('_w', size.w);
            node.data('_h', size.h);

            const index = selectionOrder.indexOf(oldId);
            if (index !== -1) {
                selectionOrder[index] = newLabel;
            }
        }
    });
}

// Логика кнопки связи по порядку нажатия
document.getElementById('addLinkButton').addEventListener('click', () => {
    if (selectionOrder.length < 2) {
        alert("Выберите сначала узел-источник, а затем узел-цель.");
        return;
    }

    const sourceId = selectionOrder[0];
    const targetId = selectionOrder[1];

    const sourceNode = cy.getElementById(sourceId);
    const targetNode = cy.getElementById(targetId);

    if (sourceNode.length === 0 || targetNode.length === 0) {
        alert("Один из выбранных узлов был удален. Пожалуйста, выберите узлы заново.");
        cy.elements().unselect();
        selectionOrder = [];
        return;
    }

    if (sourceNode.data('type') === targetNode.data('type')) {
        alert("Нельзя связывать узлы одного типа (нужно: Объект -> Действие или Действие -> Объект).");
    } else {
        const edgeId = `${sourceId}->${targetId}`;
        if (cy.getElementById(edgeId).length === 0) {
            cy.add({ group: 'edges', data: { id: edgeId, source: sourceId, target: targetId } });
        }
    }

    cy.elements().unselect();
    selectionOrder = [];
});

function addNode(type) {
    const typeLabel = type === 'action' ? 'действия' : 'объекта';
    const name = prompt(`Имя ${typeLabel}:`);
    if (!name) return;
    if (cy.getElementById(name).length > 0) {
        alert("Узел с таким именем уже существует!");
        return;
    }
    const size = calcNodeSize(name);
    cy.add({
        group: 'nodes',
        data: { id: name, label: name, type: type, _w: size.w, _h: size.h },
        position: { x: 100, y: 100 },
    });
}

document.getElementById('addActionButton').addEventListener('click', () => addNode('action'));
document.getElementById('addStateButton').addEventListener('click', () => addNode('state'));

document.getElementById('saveButton').addEventListener('click', () => {
    let name = prompt("Имя проекта:", "model") || "project";
    const output = {};
    cy.nodes('[type="action"]').forEach(node => {
        output[node.data('label')] = {
            init_states: node.incomers('edge').sources().map(n => n.data('label')),
            final_states: node.outgoers('edge').targets().map(n => n.data('label'))
        };
    });
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.json`;
    a.click();
});

document.getElementById('runLayoutButton').addEventListener('click', () => cy.layout({ name: 'dagre', rankDir: 'TB' }).run());

// Кнопка «Новый проект» — возврат к опроснику
document.getElementById('newProjectButton').addEventListener('click', () => {
    if (cy) { cy.destroy(); cy = null; }
    document.getElementById('graph-container').style.display = 'none';
    document.getElementById('summary-bar').innerHTML = '';
    const app = document.getElementById('app');
    app.innerHTML = '';
    QuestionnaireUI.start((answers, result) => {
        QuestionnaireUI.destroy();
        document.getElementById('graph-container').style.display = 'block';
        renderGraphFromPlan(result);
    });
});

document.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement.tagName !== 'INPUT') {
        const selected = cy.elements(':selected');
        selected.nodes().forEach(node => {
            const id = node.id();
            selectionOrder = selectionOrder.filter(item => item !== id);
        });
        selected.remove();
    }
});

// Загрузка файла
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('fileName').textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
        const json = JSON.parse(e.target.result);
        const nodes = [], edges = [], ids = new Set();
        const add = (id, type) => {
            if (!ids.has(id)) { nodes.push({ data: { id, label: id, type } }); ids.add(id); }
        };
        for (const act in json) {
            add(act, 'action');
            (json[act].init_states || []).forEach(s => { add(s, 'state'); edges.push({ data: { id: `${s}->${act}`, source: s, target: act } }); });
            (json[act].final_states || []).forEach(s => { add(s, 'state'); edges.push({ data: { id: `${act}->${s}`, source: act, target: s } }); });
        }
        renderGraph({ nodes, edges });
    };
    reader.readAsText(file);
});
