// ссылки в отдельном массиве (вдруг сменятся маршруты)
const urls = {
    payments: "https://api.cryptocards.ws/payments",
    rates: "https://api.cryptocards.ws/rates",
    rateru: "https://api.cryptocards.ws/rate/ru",
};

// заголовки с токеном и ключом (берутся из другого скрипта настроек, без него не будет ничего работать)

if (typeof token === 'undefined' || typeof ukey === 'undefined') {
    alert("Ошибка! Отсутствует токен или ключ доступа!");
    location.reload();
}

const mainHeaders = {
    'X-Token': token,
    'X-Ukey': ukey
};


// массив параметров для запросов
//  - main - основной для получения сделок
//  - static1 - статистика первые 50
//  - static2 - статистика вторые 50
const params = {
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

// главный массив переменных
// - timerFunc - интервальная переменная для хранения функции, которая вызывается раз в algorithmTime
// - timerManual - переменная счетчик для ручного мониторинга
// - algorithmTime - скорость работы алгоритма (1 запрос в algorithmTime микросекунд)
// - fishing - сколько секунд сидеть под 0.1 (рыбалка)
// - stay - сколько секунд стоять под 2 (разгон)
// - counter - таймер (один за всех)
// - difference - разница между последней сделкой и временем системы
// - newDeal - индикатор новой сделки (сколько должна быть разница между последней сделкой и временем системы в микросекундах!)
// - message - статус работы
// - memoryTime - время последней сделки (завершенной или нет неважно)
// - currentTime - время последней сделки (незавершенной)
// - systemTime - время системы
// - fishingPercentage - процент, под которым сидим
// - waitingPercentage - процент, под которым стоим
// - flag - поплавок (флажок если поймал сделку на 0.1 для резкого свапа)
// - circles - количество кругов (для автоматического изменения времени ожидания)
let variables = {
    timerFunc: null,
    timerManual: 0,
    algorithmTime: 1000,

    fishing: null,
    stay: null,

    counter: 0,
    difference: 0,
    newDeal: 10000,
    message: "",

    memoryTime: 0,
    currentTime: 0,
    systemTime: 0,

    fishingPercentage: 0,
    waitingPercentage: 0,

    flag: false,
    circles: 0
};

// -----------------------------------Ручной режим [НАЧАЛО]-----------------------------------------
/**
 * Функция получения списка сделок и отображение их в таблице
 */
function getInfo() {
    variables.timerManual++;
    $('#timer').html(variables.timerManual);
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params.main),
        success: function (response) {
            displayTable(response.payments);
        }
    });
}

/**
 * Функция включения / отключения мониторинга
 * @param {*} toggler 
 * @param {*} switched 
 */
function toggleMonitoring(toggler, switched = true) {
    if (switched) {
        toggler.val("on");
        toggler.html("Отключить");
        $('#monitoring_status').html("Включен");
        $('#monitoring_spinner').show();

        variables.timerFunc = setInterval(getInfo, variables.algorithmTime);
    } else {

        variables.timerManual = 0;
        $('#timer').html(variables.timerManual);

        toggler.val('off');
        toggler.html("Включить");
        $('#monitoring_status').html("Отключен");
        $('#monitoring_spinner').hide();

        clearInterval(variables.timerFunc);
    }
}

/**
 * Функция получения и отображения текущего процента
 */
function getPercentage() {
    $('#percentage').html("Получение процента...");
    $.ajax({
        url: urls.rates,
        type: "GET",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        success: function (response) {
            $('#percentage').html(`Текущий процент: ${response[0].myRate}`)
        }
    });

}

/**
 * Функция ручного изменения процента
 * @param {*} percentage 
 */
function manualChange(percentage) {
    $.ajax({
        url: urls.rateru,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify({ rate: '' + percentage }),
        success: getPercentage
    });
}

/**
 * Функция автоматического изменения процента
 */
function changePercentage() {
    $.ajax({
        url: urls.rates,
        type: "GET",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        success: function (response) {
            let val = response[0].myRate == 2 ? 0.1 : 2;

            $.ajax({
                url: urls.rateru,
                type: "POST",
                headers: mainHeaders,
                contentType: "application/json",
                dataType: "JSON",
                data: JSON.stringify({ rate: '' + val }),
                success: getPercentage
            });

        }
    });

}

/**
 * Функция получает статистику 100 сделок и отображает количество
 */
function getStatistic() {
    // Первые 50
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params.static1),
        success: function (response) {
            let payments = response.payments,
                successess = 0, faileses = 0;
            payments.forEach(function (element) {
                let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100;
                if (stavka >= 1.0) {
                    successess++;
                } else {
                    faileses++;
                }
            });
            $('#successess').html(successess);
            $('#faileses').html(faileses);
        }
    })

    // Вторые 50
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params.static2),
        success: function (response) {
            let payments = response.payments,
                successess = 0, faileses = 0;
            payments.forEach(function (element) {
                let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100;
                if (stavka >= 1.0) {
                    successess++;
                } else {
                    faileses++;
                }
            });
            $('#successess2').html(successess);
            $('#faileses2').html(faileses);
        }
    })
}

/**
 * Функция для отображения таблицы (чтоб не пулять по 2 запроса за раз)
 * @param {*} arr 
 */
function displayTable(arr) {
    let container = $('#test1');
    container.html("");

    if (arr.length) {
        arr.forEach(function (element) {
            if (element.substatus == 0) {
                let stavka = Math.round(1e4 * element.income / element.amount_in_cur) / 100,
                    date = new Date(element.created_at);
                container.append(`
                    <tr>
                        <td>${element.id}</td>
                        <td>${element.label}</td>
                        <td>${element.amount}</td>
                        <td>${stavka}</td>
                        <td>${date.toLocaleTimeString()}</td>
                    </tr>
                `);
            }
        });
    }
}

// -----------------------------------Ручной режим [КОНЕЦ]-----------------------------------------

// -----------------------------------Авто (ТУРБО) режим [НАЧАЛО]----------------------------------

/**
 * Функция запуска / остановки
 * @param {*} toggler 
 * @param {*} switched 
 */
function toggleTurbo(toggler, switched = true) {
    if (switched) {
        variables.fishing = $('#fishing').val();
        variables.stay = $('#stay').val();
        variables.fishingPercentage = $('#fishingPercentage').val();
        variables.waitingPercentage = $('#waitingPercentage').val();

        if (variables.fishing && variables.stay && variables.fishingPercentage && variables.waitingPercentage) {
            toggler.val("on");
            $('#monitoring_status').html("=Турбо режим=");
            $('#monitoring_spinner').show();
            turboCheck();
            variables.timerFunc = setInterval(turbo, variables.algorithmTime);
        } else {
            alert("Под каким % сидеть?\nСколько сидеть?\nПод каким % стоять?\nСколько стоять?");
        }

    } else {
        toggler.val("off");
        $('#monitoring_status').html("Отключен");
        $('#monitoring_spinner').hide();
        $('#message').html("");
        turboCheck();
        clearInterval(variables.timerFunc);
    }
}

/**
 * Функция безопасности (ставит всегда указанный в инпуте под каким стоять процент, вызывается при включении / отключении турбо режима)
 */
function turboCheck() {
    // обнуляем таймер
    variables.counter = 0;

    // обнуляем флажок
    variables.flag = false;

    // обнуляем разницу
    variables.difference = 0;

    // обнуляем времена
    variables.memoryTime = 0;
    variables.currentTime = 0;
    variables.systemTime = 0;

    // вызываем функцию изменения процента на тот, который укзаан в инпуте (под каким стоять)
    manualChange(variables.waitingPercentage);
}

/**
 * Функция, показывающая на экран все переменные, используемые в алгоритме
 */
function turboLog() {
    $('#timer').html(variables.counter);
    $('#timer2').html(variables.counter2);
    $('#message').html(variables.message);
    $('#circles').html(variables.circles);

    let memoryTime, memoryString;

    if (variables.memoryTime != 0) {
        memoryTime = new Date(variables.memoryTime);
        memoryString = memoryTime.toLocaleTimeString();
    } else {
        memoryString = '-';
    }

    $('#memory').html(memoryString);
}

/**
 * Функция для вывода отладочной информации
 */
function debug() {
    let systemStr = new Date(variables.systemTime),
        currentStr = new Date(variables.currentTime),
        memoryStr = new Date(variables.memoryTime);

    let deb = `
        message : ${variables.message}
        systemTime : ${variables.systemTime} [${systemStr.toLocaleTimeString()}]
        currentTime : ${variables.currentTime} [${currentStr.toLocaleTimeString()}]
        memoryTime : ${variables.memoryTime} [${memoryStr.toLocaleTimeString()}]
        difference : ${variables.difference}
        newDeal : ${variables.newDeal}`;

    // Object.keys(variables).forEach(function (index) {
    // deb += index + " : " + variables[index] + "\n";
    // });

    $('#debug').html(deb);
}
/**
 * Функция основного мониторинга
 */
function turbo() {

    // если прошло 2 круга без сделок
    if (variables.circles == 2) {
        // обнуляем круги
        variables.circles = 0;

        // ставим время рыбалки в 2 раза больше
        $('#fishing').val(variables.fishing + 5);
    }

    // отображение переменных
    turboLog();

    // Берем параметр простоя из инпута (сколько стоять) и кладем его в массив
    variables.stay = $('#stay').val();

    // Проверка сделок + таймер (1 запрос)
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params.main),
        success: function (response) {
            // получаем сделки
            let payments = response.payments;

            // сразу же их отображаем
            displayTable(payments);

            if (payments[0]) {
                // если сделки уже есть
                variables.message = "Сделки есть, но новых нет.";

                // вызываем функцию запоминания времени (она создает разницу difference)
                turboMemoryTime(payments[0]);

                // если эта самая разница (difference) <= newDeal мс, т.е. пришла новая сделка
                if (variables.difference <= variables.newDeal) {
                    // ставим таймер в newDeal секунд
                    variables.counter = variables.newDeal / 1000;

                    // если после 2 кругов пошла сделка
                    if (variables.stay == 60) {
                        // возвращаем обратно время ожидания
                        $('#stay').val(120);
                    }

                    // сидим кайфуем
                    variables.message = "Новая сделка!";
                } else {
                    // если старые до сих пор висят то пусть висят ждем дальше
                    variables.message = "Новых сделок пока нет.";
                }

            } else {
                // если сделок вообще нет, ничего не делаем сидим ждем
                variables.message = "Сделок пока нет.";
            }

            // если простоял под 2 (если сделки есть, но новых нет ИЛИ вообще нет сделок)
            if (variables.counter == variables.stay) {
                // вызываем функцию-свап
                turboSwap();
            }

            // увеличиваем таймер
            variables.counter++;
        }

    });
}

/**
 * Функция запоминания времени в глобальный массив
 */
function turboMemoryTime(deal, mode = true) {
    // вычисляем время последней сделки
    variables.currentTime = new Date(deal.created_at).getTime();

    if (mode) {
        // если мы работаем в режиме ожидания
        // находим разницу между ВРЕМЕНЕМ СИСТЕМЫ и ЗАПОМНЕННЫМ ВРЕМЕНЕМ ПОСЛЕДНЕЙ СДЕЛКИ
        // хранить будем в целом виде, ну его эти дроби

        // вычисляем время системы 
        variables.systemTime = new Date().getTime();

        // запоминаем через условие разницы
        if (variables.currentTime >= variables.memoryTime) {
            variables.memoryTime = variables.currentTime;
        }
        // при ожидании сделки находим разницу между ВРЕМЕНЕМ СИСТЕМЫ И ЗАПОМНЕННЫМ ВРЕМЕНЕМ ПОСЛЕДНЕЙ СДЕЛКИ
        variables.difference = variables.systemTime - variables.memoryTime;
    } else {
        // если мы рыбачим        

        variables.difference = variables.currentTime - variables.memoryTime;
    }

}

/**
 * А вот и она - та самая рыбалочная функция
 */
function turboFishing() {
    // давай скажем о том, что рыбалка началась :)
    variables.message = "Рыбалка началась!";

    // отображение переменных
    turboLog();

    // Берем параметр рыбалки из инпута (сколько стоять под 0.1) и кладем его в массив
    variables.fishing = $('#fishing').val();

    // Проверка сделок + таймер (1 запрос)
    $.ajax({
        url: urls.payments,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify(params.main),
        success: function (response) {
            // получаем сделки
            let payments = response.payments;

            // сразу же их отображаем
            displayTable(payments);

            // неважно есть сделки старые или их нет вообще
            // вызываем функцию запоминания времени (она создает разницу difference) (она вызывается с флагом false, потому что мы запоминаем время последней сделки)
            if (payments[0]) {
                turboMemoryTime(payments[0], false);
                // если эта разница > 0, т.е. пришла НОВАЯ СДЕЛКА (в остальных случаях разница будет равна 0 ПОТОМУ ЧТО новых сделок нет!)
                if (variables.difference > 0) {

                    // сигналим
                    variables.message = "Поймал!";

                    // обнуляем круги
                    variables.circles = 0;

                    // возвращаем назад время рыбалки
                    $('#fishing').val(variables.fishing - 5);

                    // ставим флажок
                    variables.flag = true;
                }
            }

            // если их нет, то ничего не делаем просто смотрим на флаг и на таймер

            // если простоял всю рыбалку без сделок
            if (variables.counter == variables.fishing) {
                // круг +1
                variables.circles++;
            }

            // если простоял всю рыбалку без сделок ИЛИ поймал сделку (флажок)
            if (variables.flag || variables.counter == variables.fishing) {

                // вызываем функцию-свап
                turboSwap(false);
            }

            // увеличиваем таймер
            variables.counter++;
        }
    })

}

/**
 * Функция, которая свапает процент и обнуляет нужные переменные
 */
function turboSwap(mode = true) {

    // обнуляем таймер
    variables.counter = 0;

    // обнуляем поплавок (флаг)
    variables.flag = false;

    // обновляем статистику
    getStatistic();

    // выключаем предыдущую функцию
    clearInterval(variables.timerFunc);

    // Берем введенные проценты
    variables.fishingPercentage = $('#fishingPercentage').val();
    variables.waitingPercentage = $('#waitingPercentage').val();

    if (mode) {
        // с ожидания на рыбалку

        // свапаем процент
        manualChange(variables.fishingPercentage);

        // запускаем рыбалку
        variables.timerFunc = setInterval(turboFishing, variables.algorithmTime);

    } else {
        // с рыбалки на мониторинг

        // свапаем процент
        manualChange(variables.waitingPercentage);

        // запускаем основной мониторинг
        variables.timerFunc = setInterval(turbo, variables.algorithmTime);
    }
}

/**
 * ФункцияЮ выставляющиая значения по умолчанию (чтоб каждый раз не писать эти цифры)
 */
function turboDefault() {
    $('#fishingPercentage').val(0.1);
    $('#fishing').val(35);
    $('#waitingPercentage').val(2);
    $('#stay').val(120);
}

// -----------------------------------Авто (ТУРБО) режим [КОНЕЦ]-----------------------------------




// Основная функция
$(document).ready(function () {

    // Получение статистики сразу при обновлении стр 1 раз
    getStatistic();

    // Получение текущего процента сразу при обновлении стр 1 раз
    getPercentage();

    // Выставление настроек по умолчанию
    turboDefault();

    // Кнопка "Включить" у мониторинга
    $('#monitoring').on('click', function (event) {
        event.preventDefault();
        switch ($(this).val()) {
            case 'off': {
                toggleMonitoring($(this));
                break;
            }
            case 'on': {
                toggleMonitoring($(this), false);
                break;
            }
        }
    });
    // Кнопка "Поменять процент"
    $('#change').on('click', function (event) {
        event.preventDefault();
        let percentage = $('#manualPercentage').val();
        if (percentage) {
            manualChange(percentage);
        } else {
            alert("Сколько ставим?");
        }
    });

    // Кнопка "Turbo"
    $('#turbo').on('click', function (event) {
        event.preventDefault();

        switch ($(this).val()) {
            case 'off': {
                toggleTurbo($(this));
                break;
            }
            case 'on': {
                toggleTurbo($(this), false);
                break;
            }
        }
    })
});
