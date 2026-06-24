// =========================================================================
// ПОРТ ConstructionPlanner из Python в JavaScript
// База знаний и логика опроса/генерации плана строительства
// =========================================================================

const BuildingPlanner = (() => {
    'use strict';

    // ----------------------------------------------------------------
    // Региональные коэффициенты
    // ----------------------------------------------------------------
    const REGION_COEFFS = {
        москва: 1.4,
        спб: 1.2,
        краснодар: 1.0,
        новосибирск: 1.1,
        другой: 0.9,
    };

    // ----------------------------------------------------------------
    // БАЗА ЗНАНИЙ: микро-действия
    // ----------------------------------------------------------------
    const MICRO_ACTIONS = {
        // ========== 1. ПОДГОТОВКА ПЛОЩАДКИ ==========
        'Очистка участка': {
            init_states: ['Участок_куплен'],
            final_states: ['Участок_очищен_от_мусора', 'Деревья_удалены'],
            time_days: 3,
            cost_rub: 50000,
        },
        'Выравнивание участка': {
            init_states: ['Участок_очищен_от_мусора'],
            final_states: ['Участок_выровнен_бульдозером'],
            time_days: 2,
            cost_rub: 70000,
        },
        'Разметка под фундамент': {
            init_states: ['Участок_выровнен_бульдозером'],
            final_states: ['Разметка_готова'],
            time_days: 1,
            cost_rub: 15000,
        },
        'Установка бытовки': {
            init_states: ['Участок_выровнен_бульдозером'],
            final_states: ['Бытовка_установлена', 'Склад_материалов_готов'],
            time_days: 1,
            cost_rub: 80000,
        },

        // ========== 2. ФУНДАМЕНТ ==========
        'Земляные работы (котлован)': {
            init_states: ['Разметка_готова'],
            final_states: ['Котлован_вырыт'],
            time_days: 3,
            cost_rub: 90000,
        },
        'Подушка под фундамент': {
            init_states: ['Котлован_вырыт'],
            final_states: ['Подушка_из_песка_и_щебня_готова'],
            time_days: 2,
            cost_rub: 45000,
        },
        'Монтаж опалубки': {
            init_states: ['Подушка_из_песка_и_щебня_готова'],
            final_states: ['Опалубка_установлена'],
            time_days: 2,
            cost_rub: 55000,
        },
        'Армирование фундамента': {
            init_states: ['Опалубка_установлена'],
            final_states: ['Арматурный_каркас_связан'],
            time_days: 2,
            cost_rub: 70000,
        },
        'Заливка бетона': {
            init_states: ['Арматурный_каркас_связан'],
            final_states: ['Бетон_залит'],
            time_days: 1,
            cost_rub: 120000,
        },
        'Уход за бетоном (полив/пленка)': {
            init_states: ['Бетон_залит'],
            final_states: ['Бетон_набрал_прочность'],
            time_days: 7,
            cost_rub: 10000,
        },
        'Демонтаж опалубки': {
            init_states: ['Бетон_набрал_прочность'],
            final_states: ['Опалубка_демонтирована'],
            time_days: 1,
            cost_rub: 15000,
        },
        'Гидроизоляция фундамента': {
            init_states: ['Опалубка_демонтирована'],
            final_states: ['Фундамент_гидроизолирован'],
            time_days: 2,
            cost_rub: 60000,
        },
        'Обратная засыпка пазух': {
            init_states: ['Фундамент_гидроизолирован'],
            final_states: ['Пазухи_засыпаны_грунтом', 'Фундамент_готов'],
            time_days: 2,
            cost_rub: 40000,
        },

        // ========== 3. СКВАЖИНА ==========
        'Пригон буровой установки': {
            init_states: ['Подъездные_пути_готовы'],
            final_states: ['Буровая_установка_на_месте'],
            time_days: 1,
            cost_rub: 20000,
        },
        'Бурение скважины': {
            init_states: ['Буровая_установка_на_месте'],
            final_states: ['Скважина_пробурена'],
            time_days: 2,
            cost_rub: 80000,
        },
        'Установка обсадных труб': {
            init_states: ['Скважина_пробурена'],
            final_states: ['Обсадные_трубы_установлены'],
            time_days: 1,
            cost_rub: 30000,
        },
        'Монтаж насоса и оголовка': {
            init_states: ['Обсадные_трубы_установлены'],
            final_states: ['Насос_установлен', 'Вода_подведена_к_дому'],
            time_days: 1,
            cost_rub: 40000,
        },

        // ========== 4. СЕПТИК ==========
        'Копка котлована под септик': {
            init_states: ['Участок_выровнен_бульдозером'],
            final_states: ['Котлован_под_септик_готов'],
            time_days: 2,
            cost_rub: 30000,
        },
        'Установка септика': {
            init_states: ['Котлован_под_септик_готов'],
            final_states: ['Септик_установлен'],
            time_days: 2,
            cost_rub: 100000,
        },
        'Подключение септика к дому': {
            init_states: ['Септик_установлен', 'Фундамент_готов'],
            final_states: ['Канализация_подведена_к_дому'],
            time_days: 1,
            cost_rub: 30000,
        },

        // ========== 5. СТЕНЫ ==========
        'Подготовка материалов для стен': {
            init_states: ['Фундамент_готов', 'Склад_материалов_готов'],
            final_states: ['Материал_для_стен_завезен'],
            time_days: 2,
            cost_rub: 50000,
        },
        'Кладка стен первого этажа': {
            init_states: ['Материал_для_стен_завезен'],
            final_states: ['Стены_первого_этажа_готовы'],
            time_days: 10,
            cost_rub: 250000,
        },
        'Заливка армопояса': {
            init_states: ['Стены_первого_этажа_готовы'],
            final_states: ['Армопояс_залит'],
            time_days: 2,
            cost_rub: 60000,
        },
        'Монтаж перекрытий': {
            init_states: ['Армопояс_залит'],
            final_states: ['Перекрытия_смонтированы'],
            time_days: 4,
            cost_rub: 120000,
        },
        'Кладка стен второго этажа': {
            init_states: ['Перекрытия_смонтированы'],
            final_states: ['Стены_второго_этажа_готовы'],
            time_days: 8,
            cost_rub: 200000,
        },

        // ========== 6. КРОВЛЯ ==========
        'Установка стропильной системы': {
            init_states: ['Стены_второго_этажа_готовы'],
            final_states: ['Стропила_установлены'],
            time_days: 4,
            cost_rub: 90000,
        },
        'Монтаж обрешетки': {
            init_states: ['Стропила_установлены'],
            final_states: ['Обрешетка_готова'],
            time_days: 2,
            cost_rub: 40000,
        },
        'Укладка гидроизоляции': {
            init_states: ['Обрешетка_готова'],
            final_states: ['Гидроизоляция_уложена'],
            time_days: 1,
            cost_rub: 30000,
        },
        'Монтаж кровельного покрытия': {
            init_states: ['Гидроизоляция_уложена'],
            final_states: ['Кровельное_покрытие_смонтировано'],
            time_days: 3,
            cost_rub: 110000,
        },
        'Утепление кровли (если мансарда)': {
            init_states: ['Кровельное_покрытие_смонтировано'],
            final_states: ['Кровля_утеплена'],
            time_days: 2,
            cost_rub: 60000,
        },

        // ========== 7. ГАЗ ==========
        'Проектирование газопровода': {
            init_states: ['Участок_куплен'],
            final_states: ['Проект_газоснабжения_готов'],
            time_days: 14,
            cost_rub: 50000,
        },
        'Согласование проекта в Горгазе': {
            init_states: ['Проект_газоснабжения_готов'],
            final_states: ['Согласование_получено'],
            time_days: 20,
            cost_rub: 30000,
        },
        'Земляные работы для газопровода': {
            init_states: ['Согласование_получено'],
            final_states: ['Траншея_под_газ_готова'],
            time_days: 3,
            cost_rub: 80000,
        },
        'Укладка газовой трубы': {
            init_states: ['Траншея_под_газ_готова'],
            final_states: ['Газопровод_проложен'],
            time_days: 2,
            cost_rub: 70000,
        },
        'Врезка и пусконаладка': {
            init_states: ['Газопровод_проложен'],
            final_states: ['Газ_подведен_к_дому'],
            time_days: 2,
            cost_rub: 50000,
        },

        // ========== 8. ВРЕЗКА В КАНАЛИЗАЦИЮ ==========
        'Согласование с горводоканалом': {
            init_states: ['Участок_куплен'],
            final_states: ['Разрешение_на_врезку_получено'],
            time_days: 30,
            cost_rub: 40000,
        },
        'Прокладка трубы до колодца': {
            init_states: ['Разрешение_на_врезку_получено'],
            final_states: ['Труба_проложена_до_колодца'],
            time_days: 3,
            cost_rub: 50000,
        },
        'Врезка в центральный колодец': {
            init_states: ['Труба_проложена_до_колодца'],
            final_states: ['Врезка_выполнена'],
            time_days: 1,
            cost_rub: 30000,
        },

        // ========== 9. ОТДЕЛКА ==========
        'Черновая стяжка пола': {
            init_states: ['Кровля_смонтирована', 'Окна_вставлены'],
            final_states: ['Полы_стянуты'],
            time_days: 5,
            cost_rub: 90000,
        },
        'Штукатурка стен': {
            init_states: ['Полы_стянуты'],
            final_states: ['Стены_оштукатурены'],
            time_days: 10,
            cost_rub: 150000,
        },
        'Разводка электрики': {
            init_states: ['Стены_оштукатурены'],
            final_states: ['Электропроводка_готова'],
            time_days: 6,
            cost_rub: 120000,
        },
        'Разводка сантехники и отопления': {
            init_states: ['Стены_оштукатурены'],
            final_states: ['Сантехника_и_отопление_разведены'],
            time_days: 5,
            cost_rub: 130000,
        },
        'Чистовая отделка (плитка, обои)': {
            init_states: ['Электропроводка_готова', 'Сантехника_и_отопление_разведены'],
            final_states: ['Чистовая_отделка_завершена'],
            time_days: 20,
            cost_rub: 300000,
        },
    };

    // ----------------------------------------------------------------
    // Фазовый маппинг
    // ----------------------------------------------------------------
    const PHASE_MAPPING = {
        'Подготовка площадки': [
            'Очистка участка',
            'Выравнивание участка',
            'Разметка под фундамент',
            'Установка бытовки',
        ],
        'Фундамент': [
            'Земляные работы (котлован)',
            'Подушка под фундамент',
            'Монтаж опалубки',
            'Армирование фундамента',
            'Заливка бетона',
            'Уход за бетоном (полив/пленка)',
            'Демонтаж опалубки',
            'Гидроизоляция фундамента',
            'Обратная засыпка пазух',
        ],
        'Скважина': [
            'Пригон буровой установки',
            'Бурение скважины',
            'Установка обсадных труб',
            'Монтаж насоса и оголовка',
        ],
        'Септик': [
            'Копка котлована под септик',
            'Установка септика',
            'Подключение септика к дому',
        ],
        'Врезка в канализацию': [
            'Согласование с горводоканалом',
            'Прокладка трубы до колодца',
            'Врезка в центральный колодец',
        ],
        'Газ': [
            'Проектирование газопровода',
            'Согласование проекта в Горгазе',
            'Земляные работы для газопровода',
            'Укладка газовой трубы',
            'Врезка и пусконаладка',
        ],
        'Стены': [
            'Подготовка материалов для стен',
            'Кладка стен первого этажа',
            'Заливка армопояса',
            'Монтаж перекрытий',
            'Кладка стен второго этажа',
        ],
        'Кровля': [
            'Установка стропильной системы',
            'Монтаж обрешетки',
            'Укладка гидроизоляции',
            'Монтаж кровельного покрытия',
            'Утепление кровли (если мансарда)',
        ],
        'Отделка': [
            'Черновая стяжка пола',
            'Штукатурка стен',
            'Разводка электрики',
            'Разводка сантехники и отопления',
            'Чистовая отделка (плитка, обои)',
        ],
    };

    // ----------------------------------------------------------------
    // Публичное API
    // ----------------------------------------------------------------
    return {
        /**
         * Генерирует детальный план и граф на основе ответов пользователя.
         * @param {Object} answers - ответы на опросник
         * @returns {{ detailedPlan: Object, graph: Object, summary: Object }}
         */
        generatePlan(answers) {
            const regionKey = (answers.region || 'другой').toLowerCase();
            const regionCoeff = REGION_COEFFS[regionKey] || 1.0;
            const needFinishing = answers.finishing_type === 'Под_ключ';
            const phasesToInclude = [];

            // Всегда
            phasesToInclude.push('Подготовка площадки');
            phasesToInclude.push('Фундамент');

            // Коммуникации
            if (answers.need_well) phasesToInclude.push('Скважина');
            if (answers.need_septic) phasesToInclude.push('Септик');
            else if (answers.has_central_sewer) phasesToInclude.push('Врезка в канализацию');
            if (answers.need_gas) phasesToInclude.push('Газ');

            // Всегда
            phasesToInclude.push('Стены');
            phasesToInclude.push('Кровля');

            if (needFinishing) phasesToInclude.push('Отделка');

            // ----- Генерация плана -----
            const detailedPlan = {};
            let totalTimeDays = 0;
            let totalCostRub = 0;

            for (const phaseName of phasesToInclude) {
                const microList = PHASE_MAPPING[phaseName] || [];
                const phaseSteps = [];

                for (const microName of microList) {
                    const micro = MICRO_ACTIONS[microName];
                    if (!micro) continue;

                    // Скип утепления, если не мансарда
                    if (microName.includes('Утепление кровли') && !answers.need_roof_insulation) continue;
                    // Скип второго этажа
                    if (microName.includes('второго этажа') && (answers.floors || 1) < 2) continue;

                    const adjustedCost = micro.cost_rub * regionCoeff;

                    const step = {
                        action: microName,
                        init_states: micro.init_states,
                        final_states: micro.final_states,
                        time_days: micro.time_days,
                        cost_rub: Math.round(adjustedCost * 100) / 100,
                    };
                    phaseSteps.push(step);
                }

                const phaseTime = phaseSteps.reduce((s, st) => s + st.time_days, 0);
                const phaseCost = phaseSteps.reduce((s, st) => s + st.cost_rub, 0);

                detailedPlan[phaseName] = {
                    description: `Этап: ${phaseName}`,
                    steps: phaseSteps,
                    total_time_days: phaseTime,
                    total_cost_rub: Math.round(phaseCost * 100) / 100,
                };

                totalTimeDays += phaseTime;
                totalCostRub += phaseCost;
            }

            // ----- Построение графа -----
            const graph = {};
            for (const phaseName of Object.keys(detailedPlan)) {
                for (const step of detailedPlan[phaseName].steps) {
                    graph[step.action] = {
                        init_states: step.init_states,
                        final_states: step.final_states,
                        time_days: step.time_days,
                        cost_rub: step.cost_rub,
                        phase: phaseName,
                    };
                }
            }

            return {
                detailedPlan,
                graph,
                summary: {
                    total_time_days: totalTimeDays,
                    total_cost_rub: Math.round(totalCostRub * 100) / 100,
                    total_cost_million_rub: Math.round((totalCostRub / 1000000) * 100) / 100,
                },
            };
        },

        /**
         * Проверяет, подключен ли ранее файл с ответами.
         * Формат ответов см. в questionnaire-ui.js
         */
        getPhaseNames() {
            return Object.keys(PHASE_MAPPING);
        },
    };
})();
