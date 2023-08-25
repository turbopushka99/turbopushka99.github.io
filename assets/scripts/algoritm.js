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
// - message - статус работы
// - memoryTime - время последней сделки (завершенной или нет неважно)
// - currentTime - время последней сделки (незавершенной)
// - systemTime - время системы
// - flag - поплавок (флажок если поймал сделку на 0.1 для резкого свапа)
let variables = {
    timerFunc: null,
    timerManual: 0,
    algorithmTime: 1000,

    fishing: null,
    stay: null,

    counter: 0,
    difference: 0,
    message: "",

    memoryTime: 0,
    currentTime: 0,
    systemTime: 0,

    flag: false
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
                if (stavka > 1) {
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
                if (stavka > 1) {
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

        if (variables.fishing && variables.stay) {
            toggler.val("on");
            $('#monitoring_status').html("=Турбо режим=");
            $('#monitoring_spinner').show();
            turboCheck();
            variables.timerFunc = setInterval(turbo, variables.algorithmTime);
        } else {
            alert("Сколько секунд сидеть под 0.1% ?");
            alert("А сколько секунд стоять под 2% ?");
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
 * Функция безопасности (ставит всегда 2 процента, вызывается при включении / отключении турбо режима)
 */
function turboCheck() {
    $.ajax({
        url: urls.rateru,
        type: "POST",
        headers: mainHeaders,
        contentType: "application/json",
        dataType: "JSON",
        data: JSON.stringify({ rate: '2' }),
        success: getPercentage
    });
}

/**
 * Функция, показывающая на экран все переменные, используемые в алгоритме
 */
function turboLog() {
    $('#timer').html(variables.counter);
    $('#timer2').html(variables.counter2);
    $('#message').html(variables.message);

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
 * Функция основного мониторинга
 */
function turbo() {
    // отображение переменных
    turboLog();

    // Берем параметр простоя из инпута (сколько стоять под 2) и кладем его в массив
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

                // вычисляем время системы 
                variables.systemTime = new Date().getTime();

                // вычисляем время последней сделки
                variables.currentTime = new Date(payments[0].created_at).getTime();

                // запоминаем через условие разницы
                if (variables.currentTime > variables.memoryTime) {
                    variables.memoryTime = variables.currentTime;
                }

                // находим разницу между ВРЕМЕНЕМ СИСТЕМЫ и ЗАПОМНЕННЫМ ВРЕМЕНЕМ ПОСЛЕДНЕЙ СДЕЛКИ
                variables.difference = parseFloat((variables.systemTime - variables.memoryTime) / (1000 * 60)).toFixed(2);

                // если эта самая разница (difference) < 0.5 (значит что пришла новая сделка)
                // что такое 0.5 ? это полминуты, а именно 30 секунд
                if (variables.difference < 0.5) {
                    // ставим таймер в 30 секунд
                    variables.counter = 30;

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

            if (payments[0]) {
                // если они вообще есть

                // таймер обнулять не нужно, потому что здесь мы работаем И по таймеру И по разнице (т.е. когда пришла новая сделка)
                // вычисляем время системы 
                variables.systemTime = new Date().getTime();

                // вычисляем время последней сделки
                variables.currentTime = new Date(payments[0].created_at).getTime();

                // запоминаем через условие разницы
                if (variables.currentTime > variables.memoryTime) {
                    variables.memoryTime = variables.currentTime;
                }

                // находим разницу между ВРЕМЕНЕМ СИСТЕМЫ и ЗАПОМНЕННЫМ ВРЕМЕНЕМ ПОСЛЕДНЕЙ СДЕЛКИ
                variables.difference = parseFloat((variables.systemTime - variables.memoryTime) / (1000 * 60)).toFixed(2);

                // если эта разница < 2 минут (значит что пришла новая сделка)
                if (variables.difference < 2.0) {

                    // сигналим
                    variables.message = "Поймал!";

                    // вызываем функцию-свап
                    turboSwap(false);
                }

            }

            // если простоял под 0.1 всю рыбалку без сделок
            if (variables.counter == variables.fishing) {
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

    // свапаем процент
    changePercentage();

    // обновляем статистику
    getStatistic();

    // выключаем предыдущую функцию
    clearInterval(variables.timerFunc);

    if (mode) {
        // с ожидания на рыбалку

        // запускаем рыбалку
        variables.timerFunc = setInterval(turboFishing, variables.algorithmTime);

    } else {
        // с рыбалки на мониторинг

        // запускаем основной мониторинг
        variables.timerFunc = setInterval(turbo, variables.algorithmTime);
    }
}

// -----------------------------------Авто (ТУРБО) режим [КОНЕЦ]-----------------------------------




// Основная функция
$(document).ready(function () {

    // Получение статистики сразу при обновлении стр 1 раз
    getStatistic();

    // Получение текущего процента сразу при обновлении стр 1 раз
    getPercentage();

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
    $('#change').on('click', changePercentage);

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
