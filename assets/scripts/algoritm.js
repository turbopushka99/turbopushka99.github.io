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
// - algorithmTime - скорость алгоритма (в миллисекундах)
// - manualTimer - таймер ручного режима
// - turboTimer - таймер турбо режима
// - mode - режим работы бота (сообщение для строки статуса)
// - turboAccelerateTime - время разгона
// - turboFishingPercentage - процент рыбалки
// - turboFishingTime - время рыбалки
// - turboWaitingPercentage - процент ожидания
// - turboWaitingTime - время ожидания сделки
// - turboPauseTime - время паузы
// - turboCurrentTime - время последней сделки
// - turboMemoryTime - запомненное время последней сделки
// - turboSystemTime - время системы
// - turboDifference - разница между последней сделкой и последней запомненной сделкой
// - turboFishingFlag - флажок на рыбалку (если поймал)
// - turboCircles - счетчик кругов

let mainVariables = {
    timerFunc: null,
    algorithmTime: 1000,
    manualTimer: 0,
    mode: "Простаивает",
    turboTimer: 0,
    turboAccelerateTime: 0,
    turboFishingPercentage: 0,
    turboFishingTime: 0,
    turboWaitingPercentage: 0,
    turboWaitingTime: 0,
    turboPauseTime: 0,
    turboCurrentTime: 0,
    turboMemoryTime: 0,
    turboDifference: 0,
    turboFishingFlag: false,
    turboCircles: 0
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
                $('#turboBalance').html(response.local.toFixed(2));
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

                    // запоминаем время последней сделки
                    turboMemoryTime(response.payments[0].created_at);

                    // выводим на экран
                    $('#manualFirstSuccessDeals').html(first50.successDeals);
                    $('#manualFirstFailDeals').html(first50.failDeals);
                    $('#turboFirstSuccessDeals').html(first50.successDeals);
                    $('#turboFirstFailDeals').html(first50.failDeals);
                    $('#turboLastDeal').html(mainVariables.turboMemoryTime.toLocaleTimeString());
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
    $('#turboBalance').html('<i class="bi bi-arrow-down-up"></i>');

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
            $('#turboBalance').html(response.local.toFixed(2));
        }
    });
    // достаем статистику (Первые 50 сделок)
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        data: JSON.stringify(queryParams.static1),
        success: function (response) {
            mainVariables.turboMemoryTime = new Date(response.payments[0].created_at).getTime();

            // передаем сделки на функцию обработчик
            let first50 = countDeals(response.payments);

            mainVariables.turboMemoryTime = new Date(response.payments[0].created_at);

            // выводим на экран
            $('#manualFirstSuccessDeals').html(first50.successDeals);
            $('#manualFirstFailDeals').html(first50.failDeals);
            $('#turboFirstSuccessDeals').html(first50.successDeals);
            $('#turboFirstFailDeals').html(first50.failDeals);
            $('#turboLastDeal').html(mainVariables.turboMemoryTime.toLocaleTimeString());
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
        $('#turboDealsAmmount').html(deals.length);

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
        $('#turboDealsAmmount').html('-');
    }
}


// ---------------------------- Вспомогательные функции [КОНЕЦ] ------------------------------------

// ---------------------------- РУЧНОЙ РЕЖИМ [НАЧАЛО] -----------------------------------------------

function manualMonitoring() {
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

        // устанавливаем гранд-статус
        setGrandStatus('Мониторинг сделок...');
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

// ---------------------------- ТУРБО РЕЖИМ [НАЧАЛО] -----------------------------------------------

/**
 * Функция индикатор режимов (выделяет блок в зависимости от режима работы)
 * @param status
 */
function turboIndicator(status = false) {
    // очищаем все индикаторы
    $('#accelerateIndicator').removeClass('list-group-item-warning');
    $('#pauseIndicator').removeClass('list-group-item-warning');
    $('#fishingIndicator').removeClass('list-group-item-warning');
    $('#waitingIndicator').removeClass('list-group-item-warning');

    if (status) {
        // ставим нужный
        $('#' + status + 'Indicator').addClass('list-group-item-warning');
    }
}

/**
 * Функция, которая запускает турбо-режим
 */
function turboToggle(toggle, switched = false) {
    if (switched) {
        mainVariables.mode = "Турбо режим";
        toggle.val('on');
        $('#turboStatus').html('Запущен');
        turboIndicator('accelerate');
        $('#turboTimer').html(mainVariables.turboTimer);
        mainVariables.timerFunc = setInterval(turboAccelerate, mainVariables.algorithmTime);
    } else {
        mainVariables.mode = "Простаивает";
        toggle.val('off');
        $('#turboStatus').html('Остановлен');
        mainVariables.turboTimer = 0;
        setGrandStatus('Готов к работе!', false);
        clearInterval(mainVariables.timerFunc);
        turboIndicator();
        turboInit();
    }
}

/**
 * Функция, которая ставит на паузу и возвращает с нее обратно
 */
function turboAccept() {
    // устанавливаем гранд-статус
    setGrandStatus('Изменение приема платежей...');

    // отправляем запрос
    $.ajax({
        url: urls.accept,
        type: "GET",
        headers: mainHeaders,
        success: function () {
            // устанавливаем гранд-статус
            setGrandStatus('Прием платежей успешно изменен!');
        }
    }).done(function () {
        // обновляем информацию
        fastInit();
    });

}

/**
 * Функция которая свапает процент
 * @param rate
 */
function turboSwap(rate) {
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
            // если получилось, то сигналим
            $('#turboIndicator').html('Успел!');
            $('#turboIndicator').parent().removeClass('list-group-item-danger');
            $('#turboIndicator').parent().addClass('list-group-item-success');

            // обновляем пораньше
            fastInit();
        },
        error: function (e) {
            // если не получилось то сигналим
            $('#turboIndicator').html('Поторопился!');
            $('#turboIndicator').parent().removeClass('list-group-item-success');
            $('#turboIndicator').parent().addClass('list-group-item-danger');

            // и уходим в защиту (таймер = 0, останавливаем работу, ставим паузу, меняем индикатор, включаем режим паузы)
            mainVariables.turboTimer = 0;
            clearInterval(mainVariables.timerFunc);
            turboAccept();
            turboIndicator('pause');
            mainVariables.timerFunc = setInterval(turboPause, mainVariables.algorithmTime);
        }
    });
}

/**
 * Функция запоминания времени последней сделки в главный массив
 * @param deal_time
 * @param mode
 */
function turboMemoryTime(deal_time, mode = true) {
    // вычисляем время пришедшей сделки
    mainVariables.turboCurrentTime = new Date(deal_time);

    if (mode) {
        // если в режиме ожидания
        // запоминаем время через условие разницы (строго больше, чтоб не запоминать когда это одна и та же сделка)
        if (mainVariables.turboCurrentTime > mainVariables.turboMemoryTime) {
            mainVariables.turboMemoryTime = mainVariables.turboCurrentTime;
        }
    }

    // находим разницу
    mainVariables.turboDifference = mainVariables.turboCurrentTime - mainVariables.turboMemoryTime;
}

/**
 * Функция разгона
 */
function turboAccelerate() {
    // считываем все параметры
    turboInit();

    // запрос на получение сделок
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        data: JSON.stringify(queryParams.main),
        success: function (response) {
            // получаем сделки
            let payments = response.payments;

            // сразу же их отображаем
            displayTableDeals(payments);

            // если сделки уже есть
            if (payments[0]) {
                // вызываем функцию запоминания времени (она создает разницу difference)
                turboMemoryTime(payments[0].created_at);

                // если эта самая разница строго больше 0 (т.е. это не одна и та же сделка!)
                if (mainVariables.turboDifference > 0) {
                    // обнуляем таймер
                    mainVariables.turboTimer = 0;

                    // устанавливаем гранд-статус
                    setGrandStatus('Новая сделка!', false);
                }
            } else {
                // если нет, то стоим кайфуем
                setGrandStatus('Разгон...');
            }
        }
    });

    // если разогнался
    if (mainVariables.turboTimer == mainVariables.turboAccelerateTime) {
        // обнуляем таймер
        mainVariables.turboTimer = 0;

        // ставим паузу
        turboAccept();

        // свапаем процент на рыбалку
        turboSwap(mainVariables.turboFishingPercentage);

        // выключаем режим разгона
        clearInterval(mainVariables.timerFunc);

        // устанавливаем гранд-статус
        setGrandStatus('Разогнался!');

        // меняем индикатор
        turboIndicator('pause');

        // включаем режим паузы
        mainVariables.timerFunc = setInterval(turboPause, mainVariables.algorithmTime);
    }

    // увеличиваем таймер
    mainVariables.turboTimer++;
}

/**
 * Функция режима паузы
 */
function turboPause() {
    // считываем все параметры
    turboInit();

    // если дождался паузы
    if (mainVariables.turboTimer == mainVariables.turboPauseTime) {
        // обнуляем таймер
        mainVariables.turboTimer = 0;

        // отжимаем паузу
        turboAccept();

        // выключаем режим паузы
        clearInterval(mainVariables.timerFunc);

        // устанавливаем гранд-статус
        setGrandStatus('Рыбалка началась!');

        // меняем индикатор
        turboIndicator('fishing');

        // включаем режим рыбалки
        mainVariables.timerFunc = setInterval(turboFishing, mainVariables.algorithmTime);
    }

    // увеличиваем таймер
    mainVariables.turboTimer++;
}

/**
 * Функция режима рыбалки
 */
function turboFishing() {
    // считываем все параметры
    turboInit();

    // запрос на получение сделок
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        data: JSON.stringify(queryParams.main),
        success: function (response) {
            // получаем сделки
            let payments = response.payments;

            // сразу же их отображаем
            displayTableDeals(payments);

            if (payments[0]) {
                // если сделки есть
                // вызываем функцию запоминания времени (она создает разницу difference)
                // (она вызывается с флагом false, потому что мы не запоминаем время последней сделки, а работаем исключительно с мемори тайм)
                turboMemoryTime(payments[0].created_at, false);

                // если эта разница строго > 0, т.е. пришла НОВАЯ СДЕЛКА (в остальных случаях разница будет равна 0 ПОТОМУ ЧТО НОВЫХ сделок нет!)
                if (mainVariables.turboDifference > 0) {
                    // устанавливаем гранд-статус
                    setGrandStatus('Поймал!');

                    // ставим флажок
                    mainVariables.turboFishingFlag = true;
                } else {
                    // а если старая то все сидим дальше
                    mainVariables.turboFishingFlag = false;

                    // устанавливаем гранд-статус
                    setGrandStatus('Новых сделок пока нет.');
                }
            }
        }
    });

    // если простоял всю рыбалку без сделок или поймал сделку
    if (mainVariables.turboTimer == mainVariables.turboFishingTime || mainVariables.turboFishingFlag) {
        // обнуляем таймер
        mainVariables.turboTimer = 0;

        // обнуляем флажок
        mainVariables.turboFishingFlag = false;

        // выключаем режим рыбалки
        clearInterval(mainVariables.timerFunc);

        // меняем индикатор
        turboIndicator('waiting');

        // вызываем функцию-свап
        turboSwap(mainVariables.turboWaitingPercentage);

        // получаем статистику
        fastInit();

        // запускаем режим ожидания сделок
        mainVariables.timerFunc = setInterval(turboWaiting, mainVariables.algorithmTime);
    }

    // увеличиваем таймер
    mainVariables.turboTimer++;
}

/**
 * Режим ожидания сделок
 */
function turboWaiting() {
    // считываем все параметры
    turboInit();

    // запрос на получение сделок
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        data: JSON.stringify(queryParams.main),
        success: function (response) {
            // получаем сделки
            let payments = response.payments;

            // сразу же их отображаем
            displayTableDeals(payments);

            // если сделки есть
            if (payments[0]) {
                // устанавливаем гранд-статус
                setGrandStatus('Сделки есть, но новых нет.');

                // вызываем функцию запоминания времени (она создает разницу difference)
                turboMemoryTime(payments[0].created_at, false);

                // Если эта самая разница (difference) строго > 0, т.е. пришла новая сделка
                if (mainVariables.turboDifference > 0) {
                    // обнуляем таймер
                    mainVariables.turboTimer = 0;

                    // запоминаем это время
                    turboMemoryTime(payments[0].created_at);

                    // устанавливаем гранд-статус
                    setGrandStatus('Новая сделка!');

                    // обновляем данные
                    fastInit();
                }
                // Если старые до сих пор висят, то пусть висят - ждем дальше
            }
        }
    });


    // если простоял
    if (mainVariables.turboTimer == mainVariables.turboWaitingTime) {
        // обнуляем таймер
        mainVariables.turboTimer = 0;

        // устанавливаем гранд-статус
        setGrandStatus('Круг!');

        // останавливаем режим ожидания
        clearInterval(mainVariables.timerFunc);

        // увеличиваем круги
        mainVariables.turboCircles++;

        // выводим на экран
        $('#turboCircles').html(mainVariables.turboCircles);

        // меняем индикатор
        turboIndicator('accelerate');

        // запускаем режим разгона
        mainVariables.timerFunc = setInterval(turboAccelerate, mainVariables.algorithmTime);
    }

    // увеличиваем таймер
    mainVariables.turboTimer++;
}

/**
 * Функция пробегает по инпутам и заполняет главный массив
 */
function turboInit() {
    mainVariables.turboAccelerateTime = $('#turboAccelerate').val();
    mainVariables.turboFishingPercentage = $('#turboFishingPercentage').val();
    mainVariables.turboFishingTime = $('#turboFishingTime').val();
    mainVariables.turboWaitingPercentage = $('#turboWaitingPercentage').val();
    mainVariables.turboWaitingTime = $('#turboWaitingTime').val();
    mainVariables.turboPauseTime = $('#turboPauseTime').val();

    // выводим таймер
    $('#turboTimer').html(mainVariables.turboTimer);

    // выводим время последней сделки
    $('#turboLastDeal').html(mainVariables.turboMemoryTime.toLocaleTimeString());
}

// ---------------------------- ТУРБО РЕЖИМ [КОНЕЦ] ------------------------------------------------

// ---------------------------- ГЛАВНАЯ ФУНКЦИЯ [НАЧАЛО] ------------------------------------------------

$(document).ready(function () {
    // Запускаем инициализирующую функцию
    init();

    // -------------------------------- РУЧНОЙ РЕЖИМ [НАЧАЛО] ----------------------------------------------------
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

    // -------------------------------- РУЧНОЙ РЕЖИМ [КОНЕЦ] ---------------------------------------------------


    // -------------------------------- ТУРБО РЕЖИМ [НАЧАЛО] --------------------------------------------------

    // Кнопка "Турбо режим"
    $('#turboToggle').on('click', function () {
        $(this).toggleClass('btn-success');
        $(this).parent().parent().toggleClass('text-bg-info');
        turboToggle($(this), $(this).val() === 'off');
    });

    // -------------------------------- ТУРБО РЕЖИМ [КОНЕЦ] ---------------------------------------------------

});

// ---------------------------- ГЛАВНАЯ ФУНКЦИЯ [КОНЕЦ] ------------------------------------------------