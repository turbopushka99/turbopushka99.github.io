// Проверка глобальных констант аккаунта (из другого скрипта настроек)
if (typeof token === 'undefined' || typeof ukey === 'undefined') {
    alert("Ошибка! Отсутствует токен или ключ доступа!");
    location.reload();
}

// Косметика
const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));

// ---------------------------- Глобальные параметры [НАЧАЛО] -----------------------------------

// ссылки в отдельном массиве (вдруг изменятся маршруты)
const urls = {
    payments: "https://api.cryptocards.ws/payments", // платежи
    rates: "https://api.cryptocards.ws/rates", // получение общего процента
    rateRu: "https://api.cryptocards.ws/rate/ru", // изменение общего процента
    account: "https://api.cryptocards.ws/account", // получение данных об аккаунте
    accept: "https://api.cryptocards.ws/accept" // изменение приема платежей
};

// Заголовки любого запроса (для работы с API сайта)
const mainHeaders = {
    'Content-Type': "application/json",
    "X-Token": token,
    "X-Ukey": ukey
};

// массив параметров для запросов
//  - main - получение сделок
//  - static1 - статистика первые 50
//  - static2 - статистика вторые 50
const queryParams = {
    main: {
        "id": null,
        "active": true,
        "bank": null,
        "canceled": false,
        "card": null,
        "page": 1,
        "success": false
    },

    static1: {
        "id": null,
        "active": true,
        "bank": null,
        "canceled": false,
        "card": null,
        "page": 1,
        "success": true
    },

    static2: {
        "id": null,
        "active": true,
        "bank": null,
        "canceled": false,
        "card": null,
        "page": 2,
        "success": true
    }
};
// ---------------------------- Глобальные параметры [КОНЕЦ]  -----------------------------------

// ---------------------------- Главный массив переменных [НАЧАЛО] -----------------------------------
// - timerFunc - интервальная переменная для хранения функции, которая вызывается раз в algorithmTime
// - manualTimer - таймер ручного режима

let mainVariables = {
    timerFunc: null,
    algorithmTime: 1000,
    manualTimer: 0,
    mode: "Простаивает"
};
// ---------------------------- Главный массив переменных [КОНЕЦ] -----------------------------------

// ---------------------------- Вспомогательные функции [НАЧАЛО] -----------------------------------
/**
 * Пробегает по массиву сделок и считает количество удачных и неудачных, возвращает объект
 * @param deals
 */
function countDeals(deals) {
    // задаем результирующий объект
    let result = {
        successDeals: 0,
        failDeals: 0
    };

    // бежим по массиву
    deals.forEach(function (element) {
        // вычисляем ставку
        let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100;

        // сравниваем с 1
        if (stavka >= 1) {
            // если ставка больше или равна 1 (хорошая сделка)
            result.successDeals++;
        } else {
            result.failDeals++;
        }
    });
    return result;
}

/**
 * Функция устанавливает гранд-статус и показывает / скрывает колесико загрузки
 * @param status
 * @param load
 */
function setGrandStatus(status, load = true) {
    // Ставим гранд-статус
    $('#grandStatus').html(`[${mainVariables.mode}] ${status}`);

    // если надо
    if (load) {
        // Показываем колесико
        $('#spinner').removeClass('d-none');
    } else {
        // если не надо
        // Скрываем колесико
        $('#spinner').addClass('d-none');
    }
}

/**
 * Функция инициализации, достает данные об аккаунте (общий процент и статус платежей)
 */
function init() {
    // устанавливаем гранд-статус
    setGrandStatus('Загружается...');

    // достаем общий процент
    $.ajax({
        url: urls.rates,
        type: "GET",
        headers: mainHeaders,
        success: function (response) {
            // выводим на экран
            $('#manualPercentage').html(response[0].myRate);
            $('#turboPercentage').html(response[0].myRate);
        }
    }).done(function () {
        // ТОЛЬКО КОГДА ДОСТАЛИ

        // достаем прием платежей
        $.ajax({
            url: urls.account,
            type: "GET",
            headers: mainHeaders,
            success: function (response) {
                // выводим на экран
                $('#manualAcceptPayments').html(response.accept ? 'Активен' : 'Приостановлен');
                $('#turboAccept').html(response.accept ? 'Активен' : 'Приостановлен');
                $('#balance').html(response.local.toFixed(2));
            }
        }).done(function () {
            // ТОЛЬКО КОГДА ДОСТАЛИ

            // достаем статистику (Первые 50 сделок)
            $.ajax({
                url: urls.payments,
                type: "POST",
                headers: mainHeaders,
                data: JSON.stringify(queryParams.static1),
                success: function (response) {
                    // передаем сделки на функцию обработчик
                    let first50 = countDeals(response.payments);

                    // выводим на экран
                    $('#manualFirstSuccessDeals').html(first50.successDeals);
                    $('#manualFirstFailDeals').html(first50.failDeals);
                    $('#turboFirstSuccessDeals').html(first50.successDeals);
                    $('#turboFirstFailDeals').html(first50.failDeals);
                }
            }).done(function () {
                // ТОЛЬКО ПОСЛЕ ЭТОГО
                // достаем вторые 50
                // Вторые 50
                $.ajax({
                    url: urls.payments,
                    type: "POST",
                    headers: mainHeaders,
                    data: JSON.stringify(queryParams.static2),
                    success: function (response) {
                        // передаем сделки на функцию обработчик
                        let second50 = countDeals(response.payments);

                        // выводим на экран
                        $('#manualSecondSuccessDeals').html(second50.successDeals);
                        $('#manualSecondFailDeals').html(second50.failDeals);
                        $('#turboSecondSuccessDeals').html(second50.successDeals);
                        $('#turboSecondFailDeals').html(second50.failDeals);
                    }
                })
            }).done(setGrandStatus('Готов к работе!', false));
        });
    });
}

/**
 * Функция быстрой инициализации, работает так же, как и обычная, но быстрее отправляет GET-запросы
 */
function fastInit() {
    // устанавливаем гранд-статус
    setGrandStatus('Получение информации...');

    // ставим заглушки
    $('#manualPercentage').html('<i class="bi bi-arrow-down-up"></i>');
    $('#manualAcceptPayments').html('<i class="bi bi-arrow-down-up"></i>');
    $('#turboPercentage').html('<i class="bi bi-arrow-down-up"></i>');
    $('#turboAccept').html('<i class="bi bi-arrow-down-up"></i>');
    $('#balance').html('<i class="bi bi-arrow-down-up"></i>');

    // достаем общий процент
    $.ajax({
        url: urls.rates,
        type: "GET",
        headers: mainHeaders,
        success: function (response) {
            // выводим на экран
            $('#manualPercentage').html(response[0].myRate);
            $('#turboPercentage').html(response[0].myRate);
        }
    });
    // достаем прием платежей
    $.ajax({
        url: urls.account,
        type: "GET",
        headers: mainHeaders,
        success: function (response) {
            // выводим на экран
            $('#manualAcceptPayments').html(response.accept ? 'Активен' : 'Приостановлен');
            $('#turboAccept').html(response.accept ? 'Активен' : 'Приостановлен');
            $('#balance').html(response.local.toFixed(2));
        }
    });
    // достаем статистику (Первые 50 сделок)
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        data: JSON.stringify(queryParams.static1),
        success: function (response) {
            // передаем сделки на функцию обработчик
            let first50 = countDeals(response.payments);

            // выводим на экран
            $('#manualFirstSuccessDeals').html(first50.successDeals);
            $('#manualFirstFailDeals').html(first50.failDeals);
            $('#turboFirstSuccessDeals').html(first50.successDeals);
            $('#turboFirstFailDeals').html(first50.failDeals);
        }
    }).done(function () {
        // ТОЛЬКО ПОСЛЕ ЭТОГО
        // достаем вторые 50
        // Вторые 50
        $.ajax({
            url: urls.payments,
            type: "POST",
            headers: mainHeaders,
            data: JSON.stringify(queryParams.static2),
            success: function (response) {
                // передаем сделки на функцию обработчик
                let second50 = countDeals(response.payments);

                // выводим на экран
                $('#manualSecondSuccessDeals').html(second50.successDeals);
                $('#manualSecondFailDeals').html(second50.failDeals);
                $('#turboSecondSuccessDeals').html(second50.successDeals);
                $('#turboSecondFailDeals').html(second50.failDeals);
            }
        }).done(setGrandStatus('Информация обновлена!', false))
    });
}

/**
 * Функция отображает сделки в таблицах (в обеих!)
 * @param deals
 */
function displayTableDeals(deals) {
    // сначала очищаем таблицы
    $('#manualDeals').html('');
    $('#turboDeals').html('');

    // если сделки есть
    if (deals.length) {
        // выводим их количество
        $('#dealsAmmount').html(deals.length);

        // создаем переменную суммы
        let totalAmmount = 0;

        // пробегаемся по ним
        deals.forEach(function (element) {
            // отсеиваем завершенные
            if (element.substatus == 0) {
                // вычисляем ставку
                // вычисляем нормально дату создания сделки
                // сразу же формируем строку таблицы
                let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100,
                    date = new Date(element.created_at),
                    row = `<tr><td>${element.id}</td><td>${element.amount}</td><td>${stavka}</td><td>${date.toLocaleTimeString()}</td></tr>`;

                // вычисляем их динамическую сумму
                totalAmmount += element.amount;

                // кладем в таблицы
                $('#manualDeals').append(row);
                $('#turboDeals').append(row);
            }
        });

        // дописываем в таблицы сумму
        $('#manualDeals').append(`<tr><th>Итого:</th><th colspan="4">${totalAmmount}</th></tr>`);
        $('#turboDeals').append(`<tr><th>Итого:</th><th colspan="4">${totalAmmount}</th></tr>`);

    } else {
        // если сделок нет
        // кладем в таблицу строку о том, что их нет
        $('#manualDeals').append('<tr><td colspan="4">Сделок пока нет</td></tr>');
        $('#turboDeals').append('<tr><td colspan="4">Сделок пока нет</td></tr>');
        // выводим - на количество
        $('#dealsAmmount').html('-');
    }
}


// ---------------------------- Вспомогательные функции [КОНЕЦ] ------------------------------------

// ---------------------------- РУЧНОЙ РЕЖИМ [НАЧАЛО] -----------------------------------------------

function manualMonitoring() {
    // устанавливаем гранд-статус
    setGrandStatus('Мониторинг сделок...');

    // получаем сделки
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        data: JSON.stringify(queryParams.main),
        success: function (response) {
            // сразу же их отображаем
            displayTableDeals(response.payments);
        }
    });

    // увеличиваем таймер
    mainVariables.manualTimer++;
    // отображаем таймер на экране
    $('#manualTimer').html(mainVariables.manualTimer);
}

function toggleMonitoring(toggle, switched = false) {
    if (switched) {
        mainVariables.mode = "Ручной режим";
        toggle.val('on');
        $('#manualMonitoringStatus').html('Запущен');
        $('#manualTimer').html(mainVariables.manualTimer);
        mainVariables.timerFunc = setInterval(manualMonitoring, mainVariables.algorithmTime);
    } else {
        mainVariables.mode = "Простаивает";
        toggle.val('off');
        $('#manualMonitoringStatus').html('Остановлен');
        mainVariables.manualTimer = 0;
        setGrandStatus('Готов к работе!', false);
        clearInterval(mainVariables.timerFunc);
    }
}

/**
 * Функция, которая отправляет запрос на свап общего процента, после чего обновляет информацию
 */
function manualSwap() {
    // получаем значение инпута
    let rate = $('#manualFishingPercentage').val();

    // если указал
    if (rate) {
        // устанавливаем гранд-статус
        setGrandStatus('Обновление общего процента...');

        // посылаем запрос
        $.ajax({
            url: urls.rateRu,
            type: "POST",
            headers: mainHeaders,
            dataType: "JSON",
            data: JSON.stringify({'rate': '' + rate}),
            success: function (response) {
                $('#manualIndicator').html('Успел!');
                $('#manualIndicator').parent().removeClass('list-group-item-danger');
                $('#manualIndicator').parent().addClass('list-group-item-success');
                mainVariables.manualTimer = 0;
                fastInit();
            },
            error: function (e) {
                $('#manualIndicator').html('Поторопился!');
                $('#manualIndicator').parent().removeClass('list-group-item-success');
                $('#manualIndicator').parent().addClass('list-group-item-danger');
            }
        });
    } else {
        // если не указал
        // стреляем алерт
        alert("Не указан процент свапа!");
    }
}

/**
 * Функция, которая меняет прием платежей
 */
function manualAccept() {
    // устанавливаем гранд-статус
    setGrandStatus('Изменение приема платежей...');

    // отправляем запрос
    $.ajax({
        url: urls.accept,
        type: "GET",
        headers: mainHeaders,
    }).done(function () {
        // устанавливаем гранд-статус
        setGrandStatus('Прием платежей успешно изменен!');

        // обнуляем таймер
        mainVariables.manualTimer = 0;

        // обновляем информацию
        fastInit();
    });
}


// ---------------------------- РУЧНОЙ РЕЖИМ [КОНЕЦ] ------------------------------------------------

// ---------------------------- ТУРБО РЕЖИМ [НАЧАЛО] ------------------------------------------------
// ---------------------------- ТУРБО РЕЖИМ [КОНЕЦ] ------------------------------------------------

// ---------------------------- ГЛАВНАЯ ФУНКЦИЯ [НАЧАЛО] ------------------------------------------------

$(document).ready(function () {
    // Запускаем инициализирующую функцию
    init();

    // Кнопка "Обновить данные"
    $('#manualStatistic').on('click', fastInit);

    // Кнопка "Мониторинга"
    $('#manualMonitoringToggle').on('click', function () {
        $(this).toggleClass('btn-success');
        $(this).parent().parent().toggleClass('text-bg-info');
        toggleMonitoring($(this), $(this).val() === 'off');
    });

    // Кнопка "Свап"
    $('#manualSwap').on('click', manualSwap);

    // Кнопка "Прием платежей"
    $('#manualAcceptToggle').on('click', manualAccept);

    // Быстрые кнопочки
    $('.fast-buttons').on('click', function (event) {
        event.preventDefault();
        $('#manualFishingPercentage').val($(this).val());
        manualSwap();
    });
});

// ---------------------------- ГЛАВНАЯ ФУНКЦИЯ [КОНЕЦ] ------------------------------------------------