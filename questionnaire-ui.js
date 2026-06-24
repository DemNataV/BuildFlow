// =========================================================================
// UI опросника — пошаговый сбор данных перед построением графа
// =========================================================================

const QuestionnaireUI = (() => {
    'use strict';

    // Состояние опроса
    let answers = {};
    let currentStep = 0;
    let onCompleteCallback = null;

    // Массив шагов: каждый шаг — { render(container, answers): void, next(answers): boolean }
    const steps = [];

// ----------------------------------------------------------------
// Определение шагов опросника
// ----------------------------------------------------------------

function registerStep(title, renderFn, validateFn, shouldShowFn) {
    steps.push({ title, render: renderFn, validate: validateFn, shouldShow: shouldShowFn || (() => true) });
}

    // Шаг 1: Базовая информация
    registerStep(
        'Основная информация',
        (container) => {
            container.innerHTML = `
                <label>Что строите?</label>
                <select id="q-building-type">
                    <option value="Дом">Дом</option>
                    <option value="Баня">Баня</option>
                    <option value="Гараж">Гараж</option>
                </select>
                <label>Общая площадь (м²)</label>
                <input type="number" id="q-area" min="1" value="100">
                <label>Количество этажей</label>
                <select id="q-floors">
                    <option value="1">1</option>
                    <option value="2" selected>2</option>
                    <option value="3">3</option>
                </select>
                <label>Количество спален</label>
                <input type="number" id="q-bedrooms" min="1" value="3">
            `;
        },
        () => {
            answers.building_type = document.getElementById('q-building-type').value;
            answers.total_area = parseFloat(document.getElementById('q-area').value) || 0;
            answers.floors = parseInt(document.getElementById('q-floors').value, 10) || 1;
            answers.bedrooms = parseInt(document.getElementById('q-bedrooms').value, 10) || 1;
            return answers.total_area > 0;
        }
    );

    // Шаг 2: Участок
    registerStep(
        'Участок',
        (container) => {
            container.innerHTML = `
                <label>У вас есть участок?</label>
                <select id="q-has-land">
                    <option value="да">Да</option>
                    <option value="нет">Нет</option>
                </select>
                <div id="q-land-details" style="padding-left: 0;">
                    <label>Регион</label>
                    <select id="q-region">
                        <option value="москва">Москва</option>
                        <option value="спб">СПб</option>
                        <option value="краснодар">Краснодар</option>
                        <option value="новосибирск">Новосибирск</option>
                        <option value="другой">Другой</option>
                    </select>
                </div>
            `;
            // Показывать/скрывать детали участка в зависимости от выбора
            const sel = container.querySelector('#q-has-land');
            const details = container.querySelector('#q-land-details');
            const toggle = () => {
                details.style.display = sel.value === 'да' ? 'block' : 'none';
            };
            sel.addEventListener('change', toggle);
            toggle();
        },
        () => {
            answers.has_land = document.getElementById('q-has-land').value === 'да';
            if (answers.has_land) {
                answers.region = document.getElementById('q-region').value;
            } else {
                answers.region = 'другой';
            }
            return true;
        }
    );

    // Шаг 3: Геология (только если есть участок)
    registerStep(
        'Геология участка',
        null, // будет переопределён ниже
        () => true,
        (a) => a.has_land === true
    );
    // Переопределяем рендер и валидацию для шага 3
    steps[2].render = (container) => {
        container.innerHTML = `
            <label>Проводили геологию?</label>
            <select id="q-has-geology">
                <option value="да">Да</option>
                <option value="нет">Нет</option>
            </select>
            <div id="q-geology-details" style="padding-left: 0;">
                <label>Тип грунта</label>
                <select id="q-ground-type">
                    <option value="Скала">Скала</option>
                    <option value="Песок">Песок</option>
                    <option value="Супесь">Супесь</option>
                    <option value="Суглинок">Суглинок</option>
                    <option value="Глина">Глина</option>
                    <option value="Торф">Торф</option>
                </select>
            </div>
        `;
        const sel = container.querySelector('#q-has-geology');
        const details = container.querySelector('#q-geology-details');
        const toggle = () => {
            details.style.display = sel.value === 'да' ? 'block' : 'none';
        };
        sel.addEventListener('change', toggle);
        toggle();
    };
    steps[2].validate = () => {
        const hasGeology = document.getElementById('q-has-geology').value === 'да';
        answers.has_geology = hasGeology;
        if (hasGeology) {
            const ground = document.getElementById('q-ground-type').value;
            answers.ground_type = ground;
            if (['Скала', 'Песок', 'Супесь'].includes(ground)) {
                answers.foundation_type = 'Ленточный';
            } else if (['Суглинок', 'Глина'].includes(ground)) {
                answers.foundation_type = 'Свайный';
            } else if (ground === 'Торф') {
                answers.foundation_type = 'Плитный';
            }
        } else {
            answers.ground_type = 'Неизвестен';
            answers.foundation_type = 'Свайный (рекомендация)';
        }
        return true;
    };
    // Шаг 4: Коммуникации
    registerStep(
        'Коммуникации',
        (container) => {
            container.innerHTML = `
                <label>Есть центральный водопровод?</label>
                <select id="q-central-water">
                    <option value="да">Да</option>
                    <option value="нет">Нет</option>
                </select>
                <label>Есть центральная канализация?</label>
                <select id="q-central-sewer">
                    <option value="да">Да</option>
                    <option value="нет">Нет</option>
                </select>
                <label>Есть магистральный газ?</label>
                <select id="q-gas">
                    <option value="да">Да</option>
                    <option value="нет">Нет</option>
                </select>
            `;
        },
        () => {
            answers.has_central_water = document.getElementById('q-central-water').value === 'да';
            answers.has_central_sewer = document.getElementById('q-central-sewer').value === 'да';
            answers.need_gas = document.getElementById('q-gas').value === 'да';

            answers.need_well = !answers.has_central_water;
            answers.need_septic = !answers.has_central_sewer;
            return true;
        }
    );

    // Шаг 5: Конструктив
    registerStep(
        'Конструктив и отделка',
        (container) => {
            container.innerHTML = `
                <label>Тип стен</label>
                <select id="q-wall-type">
                    <option value="Кирпич">Кирпич</option>
                    <option value="Газобетон">Газобетон</option>
                    <option value="Брус">Брус</option>
                    <option value="Каркас">Каркас</option>
                </select>
                <label>Тип кровли</label>
                <select id="q-roof-type">
                    <option value="Скатная">Скатная</option>
                    <option value="Мансардная">Мансардная</option>
                    <option value="Плоская">Плоская</option>
                </select>
                <label>Отделка</label>
                <select id="q-finishing">
                    <option value="Черновая">Черновая</option>
                    <option value="Под_ключ">Под ключ</option>
                </select>
            `;
        },
        () => {
            answers.wall_type = document.getElementById('q-wall-type').value;
            answers.roof_type = document.getElementById('q-roof-type').value;
            answers.need_roof_insulation = answers.roof_type === 'Мансардная';
            answers.finishing_type = document.getElementById('q-finishing').value;
            return true;
        }
    );

    // ----------------------------------------------------------------
    // Управляющая логика
    // ----------------------------------------------------------------

function findNextVisibleStep(fromIndex, dir) {
    let idx = fromIndex + dir;
    while (idx >= 0 && idx < steps.length) {
        if (steps[idx].shouldShow(answers)) return idx;
        idx += dir;
    }
    // Если не нашли — остаёмся на месте или идём к концу
    return dir > 0 ? steps.length : -1;
}

function renderStep(index) {
    const container = document.getElementById('questionnaire-steps');
    const titleEl = document.getElementById('questionnaire-title');
    const btnPrev = document.getElementById('q-btn-prev');
    const btnNext = document.getElementById('q-btn-next');

    if (index < 0 || index >= steps.length) return;

    const step = steps[index];
    titleEl.textContent = `Шаг ${index + 1} из ${steps.length}: ${step.title}`;
    container.innerHTML = '';
    step.render(container);

    // Показать/скрыть кнопки
    btnPrev.style.display = index === 0 ? 'none' : 'inline-block';
    btnNext.textContent = index === steps.length - 1 ? '✅ Построить граф' : 'Далее →';
}

function nextStep() {
    const step = steps[currentStep];
    if (!step.validate()) {
        alert('Заполните все поля корректно.');
        return;
    }

    if (currentStep === steps.length - 1) {
        // Конец — генерируем план
        finishQuestionnaire();
        return;
    }

    const next = findNextVisibleStep(currentStep, 1);
    if (next >= steps.length) {
        // Все оставшиеся шаги скрыты — завершаем
        finishQuestionnaire();
        return;
    }
    currentStep = next;
    renderStep(currentStep);
}

function prevStep() {
    if (currentStep > 0) {
        const prev = findNextVisibleStep(currentStep, -1);
        if (prev >= 0) {
            currentStep = prev;
            renderStep(currentStep);
        }
    }
}

    function finishQuestionnaire() {
        const result = BuildingPlanner.generatePlan(answers);
        if (onCompleteCallback) {
            onCompleteCallback(answers, result);
        }
    }

    // ----------------------------------------------------------------
    // Публичное API
    // ----------------------------------------------------------------
    return {
        /**
         * Запускает опросник.
         * @param {Function} onComplete - колбэк (answers, planResult) => void
         */
        start(onComplete) {
            // Создаём DOM опросника
            const app = document.getElementById('app');
            if (!app) return;

            app.innerHTML = `
                <div id="questionnaire-panel">
                    <h2 id="questionnaire-title">Шаг 1 из ${steps.length}</h2>
                    <div id="questionnaire-steps"></div>
                    <div class="q-nav">
                        <button id="q-btn-prev" class="secondary">← Назад</button>
                        <button id="q-btn-next" class="primary">Далее →</button>
                    </div>
                </div>
            `;

            onCompleteCallback = onComplete;
            currentStep = 0;
            answers = {};

            document.getElementById('q-btn-next').addEventListener('click', nextStep);
            document.getElementById('q-btn-prev').addEventListener('click', prevStep);

            renderStep(0);
        },

        /**
         * Убирает опросник, возвращает управление основному интерфейсу.
         */
        destroy() {
            const panel = document.getElementById('questionnaire-panel');
            if (panel) panel.remove();
        },
    };
})();
