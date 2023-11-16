// ---------------------------- Глобальные параметры [НАЧАЛО] -----------------------------------

// ссылки в отдельном массиве (вдруг изменятся маршруты)
const urls = {
    account: "https://api.cryptocards.ws/account", // получение данных об аккаунте
    banks: "https://api.cryptocards.ws/banks",   // список банков
    banksAction: "https://api.cryptocards.ws/banks/action/", // действие банка
    banksActionCache: "cache/",
    banksActionStart: "/start",
    banksActionAuth: "https://api.cryptocards.ws/banks/auth/",
    banksActionPause: "pause/"
};

// Заголовки любого запроса (для работы с API сайта)
const account = accounts[1];

const mainHeaders = {
    "Content-Type": "application/json",
    "X-Token": account.token,
    "X-Ukey": account.ukey
};

// массив параметров для запросов
//  - main - получение банков
const queryParams = {
    main: {
        "active": true,
        "auth": true,
        "bank": null,
        "login": null,
        "page": 1,
        "pause": true,
        "phone": null,
        "sber": true,
        "tink": true
    },
};

// ---------------------------- Глобальные параметры [КОНЕЦ]  -----------------------------------
// ---------------------------- Главный массив переменных [НАЧАЛО] -----------------------------------
// - timerFunc - интервальная переменная для хранения функции, которая вызывается раз в algorithmTime.
// - algorithmTime - скорость алгоритма (в миллисекундах)
// - manualTimer - таймер ручного режима
// - turboTimer - таймер турбо режима
// - mode - режим работы бота (сообщение для строки статуса)
// - banks - массив банков, которые на приеме платежей и отвалились (id, X-Token, X-Ukey)

let mainVariables = {
    timerFunc: null,
    algorithmTime: 1000,
    manualTimer: 0,
    turboTimer: 0,
    mode: "Простаивает",
    banks: []
};
// ---------------------------- Главный массив переменных [КОНЕЦ] -----------------------------------

// ---------------------------- Вспомогательные функции [НАЧАЛО] -----------------------------------

/**
 * Функция отображает статус банка
 * @param st
 * @returns {string}
 */
function getStatus(st) {
    if (st === 1) {
        return '<span class="text-success">Приём активен</span>';
    } else {
        return '<span class="text-danger">Приём на паузе</span>';

    }
}

/**
 * Функция отображает проверку банка
 * @param au
 * @returns {string}
 */
function getAuth(au) {
    if (au === 1) {
        return '<span class="text-success">работает</span>';
    } else {
        return '<span class="text-danger">необходима</span>';
    }
}

/**
 * Функция отображает банки текущего аккаунта, а также его имя в формате карточки
 * @param currentAccount
 * @param banksArray
 */
function displayBanks(currentAccount, banksArray) {
    let tbody = "";
    let color = "";
    banksArray.forEach(function (element, i) {
        if (element.status === 1 && element.auth === 0) {
            color = "table-danger";
        } else {
            color = "";
        }
        tbody += `
            <tr class="${color}">
                <td>${i + 1}</td>
                <td>#${element.id}</td>
                <td>${element.label}</td>
                <td>${getStatus(element.status)}</td>
                <td>${getAuth(element.auth)}</td>
            </tr>
        `;
    });

    $('#accountsList').append(`
    <div class="col-5 card">
        <div class="card-header">
            <h5 class="card-title">${currentAccount.name}</h5>
        </div>
        <div class="card-body">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>№</th>
                        <th>ID</th>
                        <th>Банк</th>
                        <th>Статус</th>
                        <th>Проверка</th>
                    </tr>
                </thead>
                <tbody>
                    ${tbody}
                </tbody>
            </table>
        </div>
    </div>
    `);
}

/**
 * Функция отправляет запрос на получение всех банков конкретного пользователя и возвращает массив банков
 * @param currentAccount
 */
function getBanks(currentAccount) {
    let resultArray = [];
    $.ajax({
        url: urls.banks,
        type: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Token": currentAccount.token,
            "X-Ukey": currentAccount.ukey
        },
        data: JSON.stringify(queryParams.main),
        success: function (response) {
            response.banks.forEach(function (element) {
                if (element.status === 1 && element.auth === 0) {
                    mainVariables.banks.push({
                        bank: element.id,
                        token: currentAccount.token,
                        ukey: currentAccount.ukey
                    });
                }

                resultArray.push(element);
            });
        }
    }).then(function () {
        displayBanks(currentAccount, resultArray)
    });
}

function init() {
    $('#accountsList').html("");
    accounts.forEach(function (element) {
        getBanks(element);
    })
    log('Банки загружены');
}

function log(l) {
    let currentTime = new Date();
    $('#log').append(`<p>${currentTime.toLocaleTimeString()} : ${l};</p>`);
}

function restartBank(bank) {
    let currentHeaders = {
        "Content-Type": "application/json",
        "X-Token": bank.token,
        "X-Ukey": bank.ukey
    };

    $.ajax({
        url: urls.banksActionAuth + bank.bank + urls.banksActionStart,
        headers: currentHeaders,
        error: function (response) {
            log("Ошибка банка #" + bank.bank + ": " + response.responseJSON.error);
        },
        success: function (response) {
            log("Банк #" + bank.bank + " успешно авторизирован");
        }
    });


    // $.ajax({
    //     url: urls.banksAction + urls.banksActionCache + bank.bank,
    //     headers: currentHeaders
    // }).done(function (response) {
    //     log(response.message);
    //     $.ajax({
    //         url: urls.banksActionAuth + bank.bank + urls.banksActionStart,
    //         headers: currentHeaders,
    //         error: function (response) {
    //             log("Ошибка банка #" + bank.bank + ": " + response.responseJSON.error);
    //         },
    //         success: function (response) {
    //             log("Банк #" + bank.bank + " успешно авторизирован");
    //         }
    //     });
    // });
}

// ---------------------------- Вспомогательные функции [КОНЕЦ]  -----------------------------------

$(document).ready(function () {
    init();

    $('#restart').on('click', function () {
        $('#log').html("");
        init();
    });

    $('#clearLog').on('click', function () {
        $('#log').html("");
    });

    $('#manualFix').on('click', function (event) {
        event.preventDefault();
        if (mainVariables.banks.length > 0) {
            log('Фикс запущен!');
            mainVariables.banks.forEach(function (element) {
                restartBank(element);
            });
        } else {
            log("Отлетевших банков нет.");
            $('#restart').click();
        }
    });

    $('#autoFix').on('click', function (event) {
        event.preventDefault();
        log('Авто-фикс включен!');
        setInterval(function () {
            $('#restart').click();
            $('#manualFix').click();
        }, 1000 * 60 * 3);
    })

});



