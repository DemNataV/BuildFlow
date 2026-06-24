import json
from typing import Dict, List, Any

class ConstructionPlanner:
    """
    Планировщик с полной декомпозицией каждого этапа до микро-действий.
    """
    
    def __init__(self):
        # Региональные коэффициенты
        self.region_coeffs = {
            "москва": 1.4,
            "спб": 1.2,
            "краснодар": 1.0,
            "новосибирск": 1.1,
            "другой": 0.9
        }
        
        # ----------------------------------------------------------------
        # БАЗА ЗНАНИЙ: Декомпозиция каждого действия на микро-шаги
        # Каждый микро-шаг имеет: init_states, final_states, время, деньги
        # ----------------------------------------------------------------
        self.micro_actions = {
            
            # ========== 1. ПОДГОТОВКА ПЛОЩАДКИ ==========
            "Очистка участка": {
                "init_states": ["Участок_куплен"],
                "final_states": ["Участок_очищен_от_мусора", "Деревья_удалены"],
                "time_days": 3,
                "cost_rub": 50000
            },
            "Выравнивание участка": {
                "init_states": ["Участок_очищен_от_мусора"],
                "final_states": ["Участок_выровнен_бульдозером"],
                "time_days": 2,
                "cost_rub": 70000
            },
            "Разметка под фундамент": {
                "init_states": ["Участок_выровнен_бульдозером"],
                "final_states": ["Разметка_готова"],
                "time_days": 1,
                "cost_rub": 15000
            },
            "Установка бытовки": {
                "init_states": ["Участок_выровнен_бульдозером"],
                "final_states": ["Бытовка_установлена", "Склад_материалов_готов"],
                "time_days": 1,
                "cost_rub": 80000
            },
            
            # ========== 2. ФУНДАМЕНТ (полная декомпозиция) ==========
            "Земляные работы (котлован)": {
                "init_states": ["Разметка_готова"],
                "final_states": ["Котлован_вырыт"],
                "time_days": 3,
                "cost_rub": 90000
            },
            "Подушка под фундамент": {
                "init_states": ["Котлован_вырыт"],
                "final_states": ["Подушка_из_песка_и_щебня_готова"],
                "time_days": 2,
                "cost_rub": 45000
            },
            "Монтаж опалубки": {
                "init_states": ["Подушка_из_песка_и_щебня_готова"],
                "final_states": ["Опалубка_установлена"],
                "time_days": 2,
                "cost_rub": 55000
            },
            "Армирование фундамента": {
                "init_states": ["Опалубка_установлена"],
                "final_states": ["Арматурный_каркас_связан"],
                "time_days": 2,
                "cost_rub": 70000
            },
            "Заливка бетона": {
                "init_states": ["Арматурный_каркас_связан"],
                "final_states": ["Бетон_залит"],
                "time_days": 1,
                "cost_rub": 120000
            },
            "Уход за бетоном (полив/пленка)": {
                "init_states": ["Бетон_залит"],
                "final_states": ["Бетон_набрал_прочность"],
                "time_days": 7,  # Ожидание набора прочности
                "cost_rub": 10000
            },
            "Демонтаж опалубки": {
                "init_states": ["Бетон_набрал_прочность"],
                "final_states": ["Опалубка_демонтирована"],
                "time_days": 1,
                "cost_rub": 15000
            },
            "Гидроизоляция фундамента": {
                "init_states": ["Опалубка_демонтирована"],
                "final_states": ["Фундамент_гидроизолирован"],
                "time_days": 2,
                "cost_rub": 60000
            },
            "Обратная засыпка пазух": {
                "init_states": ["Фундамент_гидроизолирован"],
                "final_states": ["Пазухи_засыпаны_грунтом", "Фундамент_готов"],
                "time_days": 2,
                "cost_rub": 40000
            },
            
            # ========== 3. СКВАЖИНА ==========
            "Пригон буровой установки": {
                "init_states": ["Подъездные_пути_готовы"],
                "final_states": ["Буровая_установка_на_месте"],
                "time_days": 1,
                "cost_rub": 20000
            },
            "Бурение скважины": {
                "init_states": ["Буровая_установка_на_месте"],
                "final_states": ["Скважина_пробурена"],
                "time_days": 2,
                "cost_rub": 80000
            },
            "Установка обсадных труб": {
                "init_states": ["Скважина_пробурена"],
                "final_states": ["Обсадные_трубы_установлены"],
                "time_days": 1,
                "cost_rub": 30000
            },
            "Монтаж насоса и оголовка": {
                "init_states": ["Обсадные_трубы_установлены"],
                "final_states": ["Насос_установлен", "Вода_подведена_к_дому"],
                "time_days": 1,
                "cost_rub": 40000
            },
            
            # ========== 4. СЕПТИК ==========
            "Копка котлована под септик": {
                "init_states": ["Участок_выровнен_бульдозером"],
                "final_states": ["Котлован_под_септик_готов"],
                "time_days": 2,
                "cost_rub": 30000
            },
            "Установка септика": {
                "init_states": ["Котлован_под_септик_готов"],
                "final_states": ["Септик_установлен"],
                "time_days": 2,
                "cost_rub": 100000
            },
            "Подключение септика к дому": {
                "init_states": ["Септик_установлен", "Фундамент_готов"],
                "final_states": ["Канализация_подведена_к_дому"],
                "time_days": 1,
                "cost_rub": 30000
            },
            
            # ========== 5. СТЕНЫ ==========
            "Подготовка материалов для стен": {
                "init_states": ["Фундамент_готов", "Склад_материалов_готов"],
                "final_states": ["Материал_для_стен_завезен"],
                "time_days": 2,
                "cost_rub": 50000
            },
            "Кладка стен первого этажа": {
                "init_states": ["Материал_для_стен_завезен"],
                "final_states": ["Стены_первого_этажа_готовы"],
                "time_days": 10,
                "cost_rub": 250000
            },
            "Заливка армопояса": {
                "init_states": ["Стены_первого_этажа_готовы"],
                "final_states": ["Армопояс_залит"],
                "time_days": 2,
                "cost_rub": 60000
            },
            "Монтаж перекрытий": {
                "init_states": ["Армопояс_залит"],
                "final_states": ["Перекрытия_смонтированы"],
                "time_days": 4,
                "cost_rub": 120000
            },
            "Кладка стен второго этажа": {
                "init_states": ["Перекрытия_смонтированы"],
                "final_states": ["Стены_второго_этажа_готовы"],
                "time_days": 8,
                "cost_rub": 200000
            },
            
            # ========== 6. КРОВЛЯ ==========
            "Установка стропильной системы": {
                "init_states": ["Стены_второго_этажа_готовы"],
                "final_states": ["Стропила_установлены"],
                "time_days": 4,
                "cost_rub": 90000
            },
            "Монтаж обрешетки": {
                "init_states": ["Стропила_установлены"],
                "final_states": ["Обрешетка_готова"],
                "time_days": 2,
                "cost_rub": 40000
            },
            "Укладка гидроизоляции": {
                "init_states": ["Обрешетка_готова"],
                "final_states": ["Гидроизоляция_уложена"],
                "time_days": 1,
                "cost_rub": 30000
            },
            "Монтаж кровельного покрытия": {
                "init_states": ["Гидроизоляция_уложена"],
                "final_states": ["Кровельное_покрытие_смонтировано"],
                "time_days": 3,
                "cost_rub": 110000
            },
            "Утепление кровли (если мансарда)": {
                "init_states": ["Кровельное_покрытие_смонтировано"],
                "final_states": ["Кровля_утеплена"],
                "time_days": 2,
                "cost_rub": 60000
            },
            
            # ========== 7. ГАЗ ==========
            "Проектирование газопровода": {
                "init_states": ["Участок_куплен"],
                "final_states": ["Проект_газоснабжения_готов"],
                "time_days": 14,
                "cost_rub": 50000
            },
            "Согласование проекта в Горгазе": {
                "init_states": ["Проект_газоснабжения_готов"],
                "final_states": ["Согласование_получено"],
                "time_days": 20,
                "cost_rub": 30000
            },
            "Земляные работы для газопровода": {
                "init_states": ["Согласование_получено"],
                "final_states": ["Траншея_под_газ_готова"],
                "time_days": 3,
                "cost_rub": 80000
            },
            "Укладка газовой трубы": {
                "init_states": ["Траншея_под_газ_готова"],
                "final_states": ["Газопровод_проложен"],
                "time_days": 2,
                "cost_rub": 70000
            },
            "Врезка и пусконаладка": {
                "init_states": ["Газопровод_проложен"],
                "final_states": ["Газ_подведен_к_дому"],
                "time_days": 2,
                "cost_rub": 50000
            },
            
            # ========== 8. ВРЕЗКА В ЦЕНТРАЛЬНУЮ КАНАЛИЗАЦИЮ ==========
            "Согласование с горводоканалом": {
                "init_states": ["Участок_куплен"],
                "final_states": ["Разрешение_на_врезку_получено"],
                "time_days": 30,
                "cost_rub": 40000
            },
            "Прокладка трубы до колодца": {
                "init_states": ["Разрешение_на_врезку_получено"],
                "final_states": ["Труба_проложена_до_колодца"],
                "time_days": 3,
                "cost_rub": 50000
            },
            "Врезка в центральный колодец": {
                "init_states": ["Труба_проложена_до_колодца"],
                "final_states": ["Врезка_выполнена"],
                "time_days": 1,
                "cost_rub": 30000
            },
            
            # ========== 9. ОТДЕЛКА (Под ключ) ==========
            "Черновая стяжка пола": {
                "init_states": ["Кровля_смонтирована", "Окна_вставлены"],
                "final_states": ["Полы_стянуты"],
                "time_days": 5,
                "cost_rub": 90000
            },
            "Штукатурка стен": {
                "init_states": ["Полы_стянуты"],
                "final_states": ["Стены_оштукатурены"],
                "time_days": 10,
                "cost_rub": 150000
            },
            "Разводка электрики": {
                "init_states": ["Стены_оштукатурены"],
                "final_states": ["Электропроводка_готова"],
                "time_days": 6,
                "cost_rub": 120000
            },
            "Разводка сантехники и отопления": {
                "init_states": ["Стены_оштукатурены"],
                "final_states": ["Сантехника_и_отопление_разведены"],
                "time_days": 5,
                "cost_rub": 130000
            },
            "Чистовая отделка (плитка, обои)": {
                "init_states": ["Электропроводка_готова", "Сантехника_и_отопление_разведены"],
                "final_states": ["Чистовая_отделка_завершена"],
                "time_days": 20,
                "cost_rub": 300000
            },
        }
        
        # Карта верхнеуровневых действий -> список микро-действий
        self.phase_mapping = {
            "Подготовка площадки": [
                "Очистка участка",
                "Выравнивание участка",
                "Разметка под фундамент",
                "Установка бытовки"
            ],
            "Фундамент": [
                "Земляные работы (котлован)",
                "Подушка под фундамент",
                "Монтаж опалубки",
                "Армирование фундамента",
                "Заливка бетона",
                "Уход за бетоном (полив/пленка)",
                "Демонтаж опалубки",
                "Гидроизоляция фундамента",
                "Обратная засыпка пазух"
            ],
            "Скважина": [
                "Пригон буровой установки",
                "Бурение скважины",
                "Установка обсадных труб",
                "Монтаж насоса и оголовка"
            ],
            "Септик": [
                "Копка котлована под септик",
                "Установка септика",
                "Подключение септика к дому"
            ],
            "Врезка в канализацию": [
                "Согласование с горводоканалом",
                "Прокладка трубы до колодца",
                "Врезка в центральный колодец"
            ],
            "Газ": [
                "Проектирование газопровода",
                "Согласование проекта в Горгазе",
                "Земляные работы для газопровода",
                "Укладка газовой трубы",
                "Врезка и пусконаладка"
            ],
            "Стены": [
                "Подготовка материалов для стен",
                "Кладка стен первого этажа",
                "Заливка армопояса",
                "Монтаж перекрытий",
                "Кладка стен второго этажа"
            ],
            "Кровля": [
                "Установка стропильной системы",
                "Монтаж обрешетки",
                "Укладка гидроизоляции",
                "Монтаж кровельного покрытия",
                "Утепление кровли (если мансарда)"
            ],
            "Отделка": [
                "Черновая стяжка пола",
                "Штукатурка стен",
                "Разводка электрики",
                "Разводка сантехники и отопления",
                "Чистовая отделка (плитка, обои)"
            ]
        }

    # =================================================================
    # ОПРОСНИК (такой же, как в прошлой версии)
    # =================================================================
    def run_questionnaire(self) -> Dict[str, Any]:
        answers = {}
        
        print("=" * 60)
        print("🏗️  ОПРОСНИК ДЛЯ ПРОЕКТИРОВАНИЯ СТРОИТЕЛЬСТВА")
        print("=" * 60)

        answers["building_type"] = input("1. Что строите? (Дом/Баня/Гараж): ").strip().capitalize()
        answers["total_area"] = float(input("2. Общая площадь (м²): "))
        answers["floors"] = int(input("3. Количество этажей (1/2/3): "))
        answers["bedrooms"] = int(input("4. Количество спален: "))

        has_land = input("5. У вас есть участок? (да/нет): ").strip().lower()
        answers["has_land"] = has_land == "да"

        if answers["has_land"]:
            answers["region"] = input("6. Регион (Москва/СПб/Краснодар/Новосибирск/Другой): ").strip().lower()
            
            has_geology = input("7. Проводили геологию? (да/нет): ").strip().lower()
            answers["has_geology"] = has_geology == "да"

            if answers["has_geology"]:
                ground = input("8. Тип грунта (Скала/Песок/Супесь/Суглинок/Глина/Торф): ").strip().capitalize()
                answers["ground_type"] = ground
                if ground in ["Скала", "Песок", "Супесь"]:
                    answers["foundation_type"] = "Ленточный"
                elif ground in ["Суглинок", "Глина"]:
                    answers["foundation_type"] = "Свайный"
                elif ground == "Торф":
                    answers["foundation_type"] = "Плитный"
            else:
                answers["ground_type"] = "Неизвестен"
                answers["foundation_type"] = "Свайный (рекомендация)"

            water = input("9. Есть центральный водопровод? (да/нет): ").strip().lower()
            answers["has_central_water"] = water == "да"
            answers["need_well"] = not answers["has_central_water"]

            sewer = input("10. Есть центральная канализация? (да/нет): ").strip().lower()
            answers["has_central_sewer"] = sewer == "да"
            answers["need_septic"] = not answers["has_central_sewer"]

            gas = input("11. Есть магистральный газ? (да/нет): ").strip().lower()
            answers["need_gas"] = gas == "да"

            answers["wall_type"] = input("12. Тип стен? (Кирпич/Газобетон/Брус/Каркас): ").strip().capitalize()
            answers["roof_type"] = input("13. Тип кровли? (Скатная/Мансардная/Плоская): ").strip().capitalize()
            answers["need_roof_insulation"] = (answers["roof_type"] == "Мансардная")
            
            finishing = input("14. Отделка: (Черновая/Под_ключ): ").strip().replace(" ", "_").capitalize()
            answers["finishing_type"] = finishing

        else:
            answers["region"] = "другой"
            answers["budget_for_land"] = float(input("Введите бюджет на покупку земли (млн руб): "))

        return answers

    # =================================================================
    # ГЕНЕРАЦИЯ ПЛАНА С ПОЛНОЙ ДЕКОМПОЗИЦИЕЙ
    # =================================================================
    def generate_detailed_plan(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Генерирует план, где КАЖДЫЙ этап разложен на микро-действия.
        """
        plan = {}
        region_key = answers.get("region", "другой")
        region_coeff = self.region_coeffs.get(region_key, 1.0)
        
        # Флаг, что нужно делать отделку
        need_finishing = answers.get("finishing_type") == "Под_ключ"
        
        # Список фаз, которые будут включены в план
        phases_to_include = []
        
        # Всегда добавляем подготовку
        phases_to_include.append("Подготовка площадки")
        
        # Фундамент - всегда
        phases_to_include.append("Фундамент")
        
        # Коммуникации
        if answers.get("need_well", False):
            phases_to_include.append("Скважина")
        
        if answers.get("need_septic", False):
            phases_to_include.append("Септик")
        elif answers.get("has_central_sewer", False):
            phases_to_include.append("Врезка в канализацию")
        
        if answers.get("need_gas", False):
            phases_to_include.append("Газ")
        
        # Стены и кровля - всегда
        phases_to_include.append("Стены")
        phases_to_include.append("Кровля")
        
        # Отделка - только если Под ключ
        if need_finishing:
            phases_to_include.append("Отделка")
        
        # =============================================================
        # Теперь строим детальный план, проходя по фазам
        # =============================================================
        for phase_name in phases_to_include:
            micro_list = self.phase_mapping.get(phase_name, [])
            phase_steps = []
            
            # Проходим по каждому микро-действию в фазе
            for micro_name in micro_list:
                if micro_name not in self.micro_actions:
                    continue
                    
                micro = self.micro_actions[micro_name]
                
                # Корректируем время и стоимость с учетом региона
                adjusted_time = micro["time_days"]
                adjusted_cost = micro["cost_rub"] * region_coeff
                
                # Если это утепление кровли, но оно не нужно - пропускаем
                if "Утепление кровли" in micro_name and not answers.get("need_roof_insulation", False):
                    continue
                
                # Если это кладка второго этажа, но этаж 1 - пропускаем
                if "второго этажа" in micro_name and answers.get("floors", 1) < 2:
                    continue
                
                # Если это кладка первого этажа, но дом 1-этажный - оставляем
                
                step = {
                    "action": micro_name,
                    "init_states": micro["init_states"],
                    "final_states": micro["final_states"],
                    "time_days": adjusted_time,
                    "cost_rub": round(adjusted_cost, 2)
                }
                phase_steps.append(step)
            
            # Добавляем фазу в план
            plan[phase_name] = {
                "description": f"Этап: {phase_name}",
                "steps": phase_steps,
                # Суммарные время и деньги по фазе
                "total_time_days": sum(s["time_days"] for s in phase_steps),
                "total_cost_rub": round(sum(s["cost_rub"] for s in phase_steps), 2)
            }
        
        return plan

    # =================================================================
    # ПРЕОБРАЗОВАНИЕ В JSON ДЛЯ ГРАФА
    # =================================================================
    def build_graph_json(self, detailed_plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Превращает детальный план в JSON-граф для отрисовки.
        Каждое микро-действие становится узлом графа.
        """
        graph = {}
        
        for phase_name, phase_data in detailed_plan.items():
            for step in phase_data["steps"]:
                action_name = step["action"]
                graph[action_name] = {
                    "init_states": step["init_states"],
                    "final_states": step["final_states"],
                    "time_days": step["time_days"],
                    "cost_rub": step["cost_rub"],
                    "phase": phase_name  # Чтобы знать, к какому этапу относится
                }
        
        return graph

    # =================================================================
    # СОХРАНЕНИЕ РЕЗУЛЬТАТОВ
    # =================================================================
    def save_results(self, answers: Dict[str, Any], detailed_plan: Dict[str, Any], graph: Dict[str, Any]):
        """
        Сохраняет JSON с полной структурой.
        """
        # Подсчет общего времени и бюджета
        total_days = 0
        total_cost = 0
        for phase_name, phase_data in detailed_plan.items():
            total_days += phase_data["total_time_days"]
            total_cost += phase_data["total_cost_rub"]
        
        output = {
            "user_answers": answers,
            "summary": {
                "total_time_days": total_days,
                "total_cost_rub": round(total_cost, 2),
                "total_cost_million_rub": round(total_cost / 1000000, 2)
            },
            "detailed_plan": detailed_plan,  # План с группировкой по фазам
            "graph_nodes": graph  # Плоский граф для отрисовки
        }
        
        with open("construction_plan_detailed.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=4)
        
        print("\n✅ Детальный JSON-план сохранен в 'construction_plan_detailed.json'")
        return output

    # =================================================================
    # ЗАПУСК
    # =================================================================
    def run(self):
        answers = self.run_questionnaire()
        detailed_plan = self.generate_detailed_plan(answers)
        graph = self.build_graph_json(detailed_plan)
        result = self.save_results(answers, detailed_plan, graph)
        
        print("\n" + "=" * 60)
        print("📊 ИТОГОВАЯ СМЕТА:")
        print(f"⏱️  Общее время: {result['summary']['total_time_days']} дней")
        print(f"💰 Общий бюджет: {result['summary']['total_cost_million_rub']} млн руб.")
        print("=" * 60)
        
        return result


if __name__ == "__main__":
    planner = ConstructionPlanner()
    planner.run()